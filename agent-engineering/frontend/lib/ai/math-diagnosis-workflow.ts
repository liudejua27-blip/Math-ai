import { z } from "zod";
import type {
  HtmlMathCardSpec,
  MathDiagnosisRequest,
  MathDiagnosisResult,
  MathDiagnosisToolResult,
  MathThinkingGraphSpec,
} from "./math-diagnosis-types";
import { updateLearnerMemoryAfterDiagnosis } from "./learner-memory-engine";
import { buildRemediationPlan } from "./remediation-loop-engine";
import { runTypeScriptMathDiagnosis } from "./math-rules-engine";
import { decideSocraticPolicy } from "./socratic-policy-engine";
import { buildVerifierTraces } from "./verifier-trace-engine";

export const mathDiagnosisRequestSchema = z.object({
  problemText: z.string().trim().min(1).max(8000),
  studentSteps: z.string().max(8000).default(""),
  confirmedEvidence: z.array(z.string()).default([]),
  teachingStyle: z.literal("socratic").default("socratic"),
  visualMode: z.literal("html_card").default("html_card"),
  studentId: z.string().trim().optional(),
  attemptContext: z
    .object({
      consecutiveFailures: z.number().int().nonnegative().optional(),
      correctionCompleted: z.boolean().optional(),
    })
    .optional(),
});

type RawDiagnosis = Record<string, any>;
type GeneratedDiagnosisFields =
  | "socraticQuestions"
  | "policyDecision"
  | "verifierTraces"
  | "learnerMemoryDelta"
  | "remediationPlan"
  | "thinkingGraph"
  | "correctionCard";
type CoreDiagnosis = Omit<MathDiagnosisResult, GeneratedDiagnosisFields>;
type NormalizedInput = z.infer<typeof mathDiagnosisRequestSchema>;
type BackendError = Extract<
  MathDiagnosisToolResult,
  { error: "math_backend_unavailable" }
>;

const DEFAULT_BACKEND_URL =
  process.env.MATH_AGENT_BACKEND_URL ?? "http://127.0.0.1:8008";
const REQUIRE_PYTHON_VERIFIER =
  process.env.MATH_REQUIRE_PYTHON_VERIFIER === "true";
const PYTHON_VERIFIER_ENABLED =
  process.env.MATH_PYTHON_VERIFIER_ENABLED !== "false";

export async function runMathDiagnosisWorkflow(
  request: MathDiagnosisRequest
): Promise<MathDiagnosisToolResult> {
  const input = normalizeInput(request);

  if (!input.studentSteps.trim()) {
    return buildMissingStepsResult(input.problemText);
  }

  const pythonVerifierResult = await callPythonVerifier(input);
  if (isBackendError(pythonVerifierResult)) {
    return pythonVerifierResult;
  }

  const rawDiagnosis = runTypeScriptMathDiagnosis(input, pythonVerifierResult);
  const result = mapBackendResult(rawDiagnosis);
  const socraticQuestions = buildSocraticQuestions(result);
  const verifierTraces = buildVerifierTraces({
    strictChecks: result.strictChecks,
    pythonVerifier: pythonVerifierResult,
  });
  const policyDecision = decideSocraticPolicy({
    problemText: input.problemText,
    studentSteps: input.studentSteps,
    diagnosis: result,
    confirmedEvidence: input.confirmedEvidence,
    hasLowConfidenceEvidence: hasLowConfidenceEvidence(result),
    attemptContext: input.attemptContext,
  });
  const remediationPlan = buildRemediationPlan({
    misconceptionAtoms: result.misconceptionAtoms,
    variants: result.variants,
    recommendedGeometryLabs: result.recommendedGeometryLabs,
  });
  const learnerMemoryDelta = input.studentId
    ? updateLearnerMemoryAfterDiagnosis({
        studentId: input.studentId,
        problemId: result.jobId,
        topicId: rawDiagnosis.topic?.id,
        atoms: result.misconceptionAtoms,
        remediationPlan,
        correctionCompleted: Boolean(input.attemptContext?.correctionCompleted),
      })
    : undefined;
  const thinkingGraph = buildThinkingGraph(result, input.problemText);

  return {
    ...result,
    socraticQuestions,
    policyDecision,
    verifierTraces,
    learnerMemoryDelta,
    remediationPlan,
    thinkingGraph,
    correctionCard: buildCorrectionCard({
      diagnosis: result,
      problemText: input.problemText,
      backendResult: rawDiagnosis,
      socraticQuestions,
      thinkingGraph,
    }),
  };
}

function normalizeInput(request: MathDiagnosisRequest): NormalizedInput {
  const parsed = mathDiagnosisRequestSchema.parse(request);
  return {
    ...parsed,
    problemText: parsed.problemText.replace(/\s+/g, " ").trim(),
    studentSteps: parsed.studentSteps.trim(),
    confirmedEvidence: parsed.confirmedEvidence.filter(Boolean),
  };
}

async function callPythonVerifier(
  input: NormalizedInput
): Promise<RawDiagnosis | BackendError | null> {
  if (!PYTHON_VERIFIER_ENABLED) {
    return null;
  }

  const response = await fetch(`${DEFAULT_BACKEND_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem_text: input.problemText,
      student_steps: input.studentSteps,
      confirmed_evidence: input.confirmedEvidence,
    }),
  }).catch(() => null);

  if (!response) {
    if (!REQUIRE_PYTHON_VERIFIER) {
      return null;
    }
    return {
      error: "math_backend_unavailable" as const,
      message:
        "Python verifier is required but unavailable. Start the Python backend or set MATH_REQUIRE_PYTHON_VERIFIER=false.",
    };
  }

  if (!response.ok) {
    if (!REQUIRE_PYTHON_VERIFIER) {
      return null;
    }
    return {
      error: "math_backend_unavailable" as const,
      status: response.status,
      message:
        "Python verifier returned an error. Check the Python backend logs.",
    };
  }

  return (await response.json()) as RawDiagnosis;
}

function isBackendError(
  result: RawDiagnosis | BackendError | null
): result is BackendError {
  return result?.error === "math_backend_unavailable";
}

function mapBackendResult(backendResult: RawDiagnosis): CoreDiagnosis {
  const thoughtJudgement = backendResult.student_coach?.thought_judgement ?? {};
  const firstWrongStep =
    stringOrNull(thoughtJudgement.first_wrong_step) ??
    firstAlignmentWithStatus(backendResult, "error")?.id ??
    null;
  const firstWrongReason =
    stringOrNull(thoughtJudgement.first_wrong_reason) ??
    firstAlignmentWithStatus(backendResult, "error")?.note ??
    null;

  return {
    jobId: String(backendResult.job_id ?? "diagnosis-local"),
    firstWrongStep,
    firstWrongReason,
    confidence: Number(backendResult.confidence ?? 0),
    needHumanReview: Boolean(backendResult.need_human_review),
    misconceptionAtoms: (backendResult.atoms ?? []).map((atom: any) => ({
      id: String(atom.id ?? ""),
      label: String(atom.label ?? ""),
      level: String(atom.level ?? ""),
      description: String(atom.description ?? ""),
    })),
    evidenceNodes: (backendResult.evidence_nodes ?? []).map((node: any) => ({
      id: String(node.id ?? ""),
      type: String(node.type ?? ""),
      text: String(node.text ?? ""),
      confidence: Number(node.confidence ?? 0),
    })),
    strictChecks: (backendResult.strict_checks ?? []).map((check: any) => ({
      id: String(check.id ?? ""),
      label: String(check.label ?? ""),
      status:
        check.status === "pass" || check.status === "warn"
          ? check.status
          : "fail",
      reason: String(check.reason ?? ""),
    })),
    recommendedGeometryLabs: (backendResult.recommended_geometry_labs ?? []).map(
      (item: any) => ({
        levelId: String(item.levelId ?? item.level_id ?? ""),
        title: String(item.title ?? ""),
        reason: String(item.reason ?? ""),
        targetAtoms: (item.targetAtoms ?? item.target_atoms ?? []).map(String),
        sceneSpecId: String(item.sceneSpecId ?? item.scene_spec_id ?? ""),
      })
    ),
    variants: (backendResult.variants ?? []).map((variant: any) => ({
      title: String(variant.title ?? "同因变式"),
      tag: String(variant.tag ?? "错因训练"),
      text: String(variant.text ?? ""),
    })),
  };
}

function buildSocraticQuestions(result: CoreDiagnosis) {
  const failedChecks = result.strictChecks
    .filter((check) => check.status === "fail")
    .slice(0, 3);
  const atom = result.misconceptionAtoms[0];

  return [
    result.firstWrongStep
      ? `先停在 ${result.firstWrongStep}：这一步使用的条件是否都已经写进推理链？`
      : "你能把自己的每一步推理按顺序写出来吗？",
    result.firstWrongReason
      ? `如果不直接跳到结论，你觉得这一步还缺哪一个验证？${result.firstWrongReason}`
      : "这道题的关键限制条件、公式和结论范围分别是什么？",
    atom
      ? `这个错因更像是“${atom.label}”。下次遇到同类题，你第一步要先检查什么？`
      : "你能指出本题最容易漏掉的限制条件吗？",
    failedChecks.length > 0
      ? `请按顺序补齐这几个门禁：${failedChecks
          .map((check) => check.label)
          .join("、")}。`
      : "现在请用一句话说明：为什么这个结论在题目条件下成立？",
  ];
}

function buildThinkingGraph(
  diagnosis: CoreDiagnosis,
  problemText: string
): MathThinkingGraphSpec {
  const nodes: MathThinkingGraphSpec["nodes"] = [
    {
      id: "problem",
      label: "题目",
      kind: "problem",
      status: "neutral",
      description: truncate(problemText, 90),
    },
  ];
  const edges: MathThinkingGraphSpec["edges"] = [];

  const stepId = diagnosis.firstWrongStep ?? "student_steps";
  nodes.push({
    id: stepId,
    label: diagnosis.firstWrongStep
      ? `第一断点 ${diagnosis.firstWrongStep}`
      : "学生步骤",
    kind: "step",
    status: diagnosis.firstWrongStep ? "fail" : "warn",
    description: diagnosis.firstWrongReason ?? "需要继续确认学生推理过程。",
  });
  edges.push({
    from: "problem",
    to: stepId,
    label: "推理对齐",
    kind: diagnosis.firstWrongStep ? "fails" : "supports",
  });

  for (const check of diagnosis.strictChecks
    .filter((item) => item.status !== "pass")
    .slice(0, 4)) {
    const id = `check:${check.id}`;
    nodes.push({
      id,
      label: check.label || check.id,
      kind: "check",
      status: check.status,
      description: check.reason,
    });
    edges.push({
      from: stepId,
      to: id,
      label: check.status === "fail" ? "未通过" : "需确认",
      kind: check.status === "fail" ? "fails" : "supports",
    });
  }

  const failedCheckIds = diagnosis.strictChecks
    .filter((item) => item.status !== "pass")
    .slice(0, 4)
    .map((check) => `check:${check.id}`);
  const atomSourceId = failedCheckIds[0] ?? stepId;

  for (const atom of diagnosis.misconceptionAtoms.slice(0, 4)) {
    const id = `atom:${atom.id}`;
    nodes.push({
      id,
      label: atom.label || atom.id,
      kind: "atom",
      status: "fail",
      description: atom.description,
    });
    edges.push({
      from: atomSourceId,
      to: id,
      label: "错因",
      kind: "causes",
    });
  }

  const variantSourceId =
    diagnosis.misconceptionAtoms[0]?.id !== undefined
      ? `atom:${diagnosis.misconceptionAtoms[0].id}`
      : stepId;

  for (const [index, variant] of diagnosis.variants.slice(0, 3).entries()) {
    const id = `variant:${index + 1}`;
    nodes.push({
      id,
      label: variant.title || `变式 ${index + 1}`,
      kind: "variant",
      status: "neutral",
      description: variant.text,
    });
    edges.push({
      from: variantSourceId,
      to: id,
      label: "同因训练",
      kind: "trains",
    });
  }

  return {
    type: "math_thinking_graph",
    title: diagnosis.firstWrongStep
      ? `思维图谱：定位 ${diagnosis.firstWrongStep}`
      : "思维图谱：等待步骤补全",
    nodes,
    edges,
  };
}

function buildCorrectionCard({
  diagnosis,
  problemText,
  backendResult,
  socraticQuestions,
  thinkingGraph,
}: {
  diagnosis: CoreDiagnosis;
  problemText: string;
  backendResult: RawDiagnosis;
  socraticQuestions: string[];
  thinkingGraph: MathThinkingGraphSpec;
}): HtmlMathCardSpec {
  const alignment = firstAlignmentWithStatus(backendResult, "error");
  const correctionSteps =
    backendResult.student_coach?.correction_template ??
    backendResult.student_coach?.better_approach ??
    [];

  return {
    type: "html_card",
    title: diagnosis.firstWrongStep
      ? `第一断点：${diagnosis.firstWrongStep}`
      : "先补全学生步骤",
    blocks: [
      { kind: "problem", text: problemText },
      ...(diagnosis.firstWrongStep && diagnosis.firstWrongReason
        ? [
            {
              kind: "wrong_step" as const,
              stepId: diagnosis.firstWrongStep,
              text: diagnosis.firstWrongReason,
              evidenceIds: alignment?.evidence ?? [],
            },
          ]
        : []),
      { kind: "thinking_graph", graph: thinkingGraph },
      ...socraticQuestions.map((text) => ({
        kind: "socratic_question" as const,
        text,
      })),
      ...correctionSteps.slice(0, 6).map((text: string) => ({
        kind: "correction_step" as const,
        text: String(text),
        evidenceIds: diagnosis.evidenceNodes.slice(0, 3).map((node) => node.id),
      })),
      ...diagnosis.variants.slice(0, 3).map((variant) => ({
        kind: "variant" as const,
        title: variant.title,
        text: variant.text,
      })),
    ],
  };
}

function truncate(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function buildMissingStepsResult(problemText: string): MathDiagnosisToolResult {
  const policyDecision = decideSocraticPolicy({
    problemText,
    studentSteps: "",
  });
  return {
    error: "missing_student_steps",
    message:
      "我可以讲这道题，但在你提供解题步骤前，不能定位第一错步或编造错因。",
    policyDecision,
    correctionCard: {
      type: "html_card",
      title: "需要学生步骤后才能诊断",
      blocks: [
        { kind: "problem", text: problemText },
        {
          kind: "socratic_question",
          text: "请把你的解题过程按 1、2、3 步写出来，我会先找第一处断点，而不是直接给答案。",
        },
      ],
    },
  };
}

function hasLowConfidenceEvidence(result: CoreDiagnosis) {
  return result.evidenceNodes.some(
    (node) => node.type !== "错因原子" && node.confidence < 0.55
  );
}

function firstAlignmentWithStatus(backendResult: RawDiagnosis, status: string) {
  return (backendResult.alignment ?? []).find(
    (item: any) => item.status === status
  );
}

function stringOrNull(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
