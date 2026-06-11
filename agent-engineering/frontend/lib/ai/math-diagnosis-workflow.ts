import { z } from "zod";
import type {
  HtmlMathCardSpec,
  MathDiagnosisRequest,
  MathDiagnosisResult,
  MathDiagnosisToolResult,
  MathThinkingGraphSpec,
} from "./math-diagnosis-types";
import { updateLearnerMemoryAfterDiagnosis } from "./learner-memory-engine";
import {
  buildLayeredVerifierReport,
  buildLayeredVerifierTraces,
} from "./layered-verifier-engine";
import { buildRemediationPlan } from "./remediation-loop-engine";
import { runTypeScriptMathDiagnosis } from "./math-rules-engine";
import { decideSocraticPolicy } from "./socratic-policy-engine";
import { verifyStudentSteps } from "./step-verifier-engine";
import { buildVerifierTraces } from "./verifier-trace-engine";
import {
  applyLearnerMemoryToPolicy,
  applyLearnerMemoryToRemediationPlan,
  buildClaimVerifierTraces,
  buildLearnerMemoryGuidance,
  buildStepAlignmentDetails,
  expandMisconceptionAtoms,
} from "./diagnosis-enhancement-engine";
import type { WorkbenchEvent } from "./workbench-events";
import { event as runtimeEvent } from "./workbench-events";
import {
  createPythonVerifierAdapter,
  isRuntimeVerifierBackendError,
  type RuntimeVerifierAdapter,
  type RuntimeVerifierBackendError,
} from "./runtime/verifier-adapter";

export const mathDiagnosisRequestSchema = z.object({
  problemText: z.string().trim().min(1).max(8000),
  studentSteps: z.string().max(8000).default(""),
  confirmedEvidence: z.array(z.string()).default([]),
  teachingStyle: z.literal("socratic").default("socratic"),
  visualMode: z.literal("html_card").default("html_card"),
  studentId: z.string().trim().optional(),
  chatId: z.string().trim().optional(),
  draftOCRSampleId: z.string().trim().optional(),
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
type BackendError = RuntimeVerifierBackendError;
export type MathDiagnosisWorkflowHooks = {
  onEvent?: (event: WorkbenchEvent) => void | Promise<void>;
  signal?: AbortSignal;
};

export type MathDiagnosisWorkflowOptions = {
  hooks?: MathDiagnosisWorkflowHooks;
  verifierAdapter?: RuntimeVerifierAdapter;
};

export async function runMathDiagnosisWorkflow(
  request: MathDiagnosisRequest,
  options: MathDiagnosisWorkflowOptions = {}
): Promise<MathDiagnosisToolResult> {
  const emit = createWorkflowEmitter(options.hooks);
  await emit("diagnosis_started", "诊断开始", "running", "Math-SEARAG runtime 已接收请求。", {
    phase: "runtime",
  });
  const input = normalizeInput(request);
  await emit("input_normalized", "输入已规范化", "completed", "题目、学生步骤和确认的证据已完成清洗。", {
    phase: "workflow",
  });

  if (!input.studentSteps.trim()) {
    await emit("policy_decided", "教学策略已决定", "warn", "学生还没有提供自己的解题步骤，不能进行首错诊断。", {
      phase: "workflow",
    });
    return buildMissingStepsResult(input.problemText);
  }

  throwIfAborted(options.hooks?.signal);
  const verifier = options.verifierAdapter ?? createPythonVerifierAdapter();
  await emit(
    "python_verifier_started",
    "Python verifier 开始",
    "running",
    `${verifier.name} 正在检查可验证的数学 claim。`,
    { phase: "tool", toolName: verifier.name }
  );
  const verifierStartedAt = performance.now();
  const pythonVerifierResult = await callPythonVerifier(
    verifier,
    input,
    options.hooks?.signal
  );
  if (isBackendError(pythonVerifierResult)) {
    await emit(
      "python_verifier_failed",
      "Python verifier 失败",
      "failed",
      pythonVerifierResult.message,
      {
        phase: "tool",
        toolName: verifier.name,
        durationMs: Math.round(performance.now() - verifierStartedAt),
      }
    );
    return pythonVerifierResult;
  }
  await emit(
    "python_verifier_completed",
    "Python verifier 完成",
    pythonVerifierResult ? "completed" : "warn",
    pythonVerifierResult
      ? "Python verifier 返回了结构化校验结果。"
      : "Python verifier 未返回结果，本轮继续使用 TypeScript strict gate。",
    {
      phase: "tool",
      toolName: verifier.name,
      durationMs: Math.round(performance.now() - verifierStartedAt),
    }
  );

  throwIfAborted(options.hooks?.signal);
  await emit("typescript_rules_started", "TypeScript 规则诊断开始", "running", "正在执行首错定位、错因原子和门禁规则。", {
    phase: "verification",
    toolName: "typescript_rules_engine",
  });
  const rawDiagnosis = runTypeScriptMathDiagnosis(input, pythonVerifierResult);
  await emit("typescript_rules_completed", "TypeScript 规则诊断完成", "completed", "基础诊断结果已生成。", {
    phase: "verification",
    toolName: "typescript_rules_engine",
  });
  let result = mapBackendResult(rawDiagnosis);
  const stepAlignment = buildStepAlignmentDetails({
    request: input,
    diagnosis: result,
    rawDiagnosis,
  });
  const stepVerifierDecision = verifyStudentSteps({
    request: input,
    diagnosis: result,
    claimTraces: stepAlignment.claims,
  });
  await emit(
    "student_steps_aligned",
    "步骤已对齐",
    stepAlignment.claims.some((claim) => claim.status === "fail")
      ? "warn"
      : "completed",
    `${stepAlignment.details.length} 个学生步骤、${stepAlignment.claims.length} 个 claim 已对齐。`,
    { phase: "verification", replayable: true }
  );
  result = {
    ...result,
    firstWrongStep: chooseFirstWrongStep(result.firstWrongStep, stepVerifierDecision),
    firstWrongReason: chooseFirstWrongReason(
      result.firstWrongStep,
      result.firstWrongReason,
      stepVerifierDecision
    ),
    confidence: calibrateDiagnosisConfidence(
      result.confidence,
      stepVerifierDecision.calibratedConfidence
    ),
    needHumanReview:
      result.needHumanReview ||
      stepVerifierDecision.reliability !== "high" ||
      stepVerifierDecision.selectedStepId !== result.firstWrongStep ||
      Boolean(stepVerifierDecision.feedbackSample),
    misconceptionAtoms: expandMisconceptionAtoms({
      request: input,
      diagnosis: result,
      claimTraces: stepAlignment.claims,
    }),
    stepAlignmentDetails: stepAlignment.details,
    claimTraces: stepAlignment.claims,
    stepVerifierDecision,
  };
  await emit(
    "step_verifier_completed",
    "Step verifier 已完成",
    stepVerifierDecision.reliability === "high" ? "completed" : "warn",
    `${stepVerifierDecision.candidates.length} 个候选首错已排序，校准置信度 ${Math.round(
      stepVerifierDecision.calibratedConfidence * 100
    )}%。`,
    { phase: "verification", replayable: true }
  );
  const socraticQuestions = buildSocraticQuestions(result);
  const layeredVerifierReport = buildLayeredVerifierReport({
    request: input,
    diagnosis: result,
    claimTraces: stepAlignment.claims,
    pythonVerifier: pythonVerifierResult,
  });
  const verifierTraces = [
    ...buildVerifierTraces({
      strictChecks: result.strictChecks,
      pythonVerifier: pythonVerifierResult,
    }),
    ...buildClaimVerifierTraces(stepAlignment.claims),
    ...buildLayeredVerifierTraces(layeredVerifierReport),
  ];
  await emit(
    "layered_verifier_completed",
    "三层 verifier 已完成",
    layeredVerifierReport.overallStatus === "fail"
      ? "failed"
      : layeredVerifierReport.overallStatus === "warn"
        ? "warn"
        : "completed",
    `轻量/中量/重量 verifier 已生成报告，formal 候选 ${layeredVerifierReport.formalReviewPlan.candidateClaims.length} 个。`,
    { phase: "verification", replayable: true }
  );
  await emit(
    "verifier_trace_added",
    "验证链已生成",
    verifierTraces.some((trace) => trace.status === "fail") ? "warn" : "completed",
    `${verifierTraces.length} 条 verifier trace 已绑定到证据链。`,
    { phase: "verification", replayable: true }
  );
  const basePolicyDecision = decideSocraticPolicy({
    problemText: input.problemText,
    studentSteps: input.studentSteps,
    diagnosis: result,
    confirmedEvidence: input.confirmedEvidence,
    hasLowConfidenceEvidence: hasLowConfidenceEvidence(result),
    attemptContext: input.attemptContext,
  });
  const baseRemediationPlan = buildRemediationPlan({
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
        remediationPlan: baseRemediationPlan,
        correctionCompleted: Boolean(input.attemptContext?.correctionCompleted),
      })
    : undefined;
  if (learnerMemoryDelta) {
    await emit(
      "learner_memory_delta_ready",
      "学习画像更新已生成",
      "completed",
      `${learnerMemoryDelta.atomUpdates.length} 个错因画像 delta 已生成。`,
      { phase: "memory" }
    );
  }
  const learnerMemoryGuidance = buildLearnerMemoryGuidance({
    learnerMemoryDelta,
    atoms: result.misconceptionAtoms,
  });
  const remediationPlan = applyLearnerMemoryToRemediationPlan({
    plan: baseRemediationPlan,
    guidance: learnerMemoryGuidance,
  });
  const policyDecision = applyLearnerMemoryToPolicy({
    policy: basePolicyDecision,
    guidance: learnerMemoryGuidance,
  });
  await emit("policy_decided", "教学策略已决定", "completed", policyDecision.reason, {
    phase: "workflow",
  });
  const thinkingGraph = buildThinkingGraph(result, input.problemText);
  const completedResult = {
    ...result,
    socraticQuestions,
    policyDecision,
    verifierTraces,
    layeredVerifierReport,
    learnerMemoryDelta,
    learnerMemoryGuidance,
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
  await emit("correction_card_ready", "订正卡已生成", "completed", `${completedResult.correctionCard.blocks.length} 个讲解 block 已生成。`, {
    phase: "workflow",
  });

  if (completedResult.remediationPlan) {
    await emit(
      "remediation_plan_ready",
      "训练计划已生成",
      "completed",
      `${completedResult.remediationPlan.items.length} 个同因训练项已生成。`,
      { phase: "workflow" }
    );
  }

  if (input.studentId) {
    await emit("persistence_started", "诊断持久化开始", "running", "正在保存 DiagnosisSession、WorkbenchEvent 和 LearnerMemory。", {
      phase: "persistence",
    });
    await persistMathDiagnosisSession({
      userId: input.studentId,
      chatId: input.chatId,
      draftOCRSampleId: input.draftOCRSampleId,
      problemText: input.problemText,
      studentSteps: input.studentSteps,
      result: completedResult,
    });
    await emit("persistence_completed", "诊断持久化完成", "completed", "诊断历史、事件和画像更新已写入数据库。", {
      phase: "persistence",
    });
  }

  await emit(
    "diagnosis_completed",
    "诊断完成",
    completedResult.needHumanReview ? "warn" : "completed",
    completedResult.needHumanReview ? "需要人工复核" : "可进入追问、订正和变式训练",
    { phase: "runtime" }
  );

  return completedResult;
}

function createWorkflowEmitter(hooks?: MathDiagnosisWorkflowHooks) {
  return async (
    type: WorkbenchEvent["type"],
    title: string,
    status: WorkbenchEvent["status"],
    detail: string,
    options: Parameters<typeof runtimeEvent>[4] = {}
  ) => {
    await hooks?.onEvent?.(
      runtimeEvent(type, title, status, detail, {
        startedAt:
          status === "running" ? new Date().toISOString() : options.startedAt,
        completedAt:
          status !== "running" ? new Date().toISOString() : options.completedAt,
        ...options,
      })
    );
  };
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Math diagnosis runtime interrupted.", "AbortError");
  }
}

async function persistMathDiagnosisSession({
  userId,
  chatId,
  draftOCRSampleId,
  problemText,
  studentSteps,
  result,
}: {
  userId: string;
  chatId?: string;
  draftOCRSampleId?: string;
  problemText: string;
  studentSteps: string;
  result: MathDiagnosisResult;
}) {
  const { saveMathDiagnosisSession, updateDraftOCRDiagnosisOutcome } =
    await import("../db/queries");
  try {
    const saved = await saveMathDiagnosisSession({
      userId,
      chatId,
      problemText,
      studentSteps,
      result,
    });
    if (draftOCRSampleId) {
      await updateDraftOCRDiagnosisOutcome({
        userId,
        sampleId: draftOCRSampleId,
        diagnosisSessionId: saved?.sessionId,
        predictedFirstWrongStep: result.firstWrongStep,
      });
    }
  } catch (error) {
    console.warn("Failed to persist math diagnosis session", error);
  }
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
  verifier: RuntimeVerifierAdapter,
  input: NormalizedInput,
  signal?: AbortSignal
): Promise<RawDiagnosis | BackendError | null> {
  return verifier.check(
    {
      problemText: input.problemText,
      studentSteps: input.studentSteps,
      confirmedEvidence: input.confirmedEvidence,
    },
    { signal }
  );
}

function isBackendError(
  result: RawDiagnosis | BackendError | null
): result is BackendError {
  return isRuntimeVerifierBackendError(result);
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

function calibrateDiagnosisConfidence(
  baseConfidence: number,
  stepVerifierConfidence: number
) {
  if (stepVerifierConfidence <= 0) {
    return baseConfidence;
  }
  return Math.max(
    0,
    Math.min(1, baseConfidence * 0.45 + stepVerifierConfidence * 0.55)
  );
}

function chooseFirstWrongStep(
  baseStep: string | null,
  stepVerifierDecision: MathDiagnosisResult["stepVerifierDecision"]
) {
  if (baseStep) {
    return baseStep;
  }
  return stepVerifierDecision?.selectedStepId ?? null;
}

function chooseFirstWrongReason(
  baseStep: string | null,
  baseReason: string | null,
  stepVerifierDecision: MathDiagnosisResult["stepVerifierDecision"]
) {
  if (baseStep && stepVerifierDecision?.selectedStepId !== baseStep) {
    return [
      baseReason,
      `StepVerifier 候选为 ${stepVerifierDecision?.selectedStepId ?? "null"}，与基础诊断不一致，需人工复核。`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return (
    stepVerifierDecision?.candidates[0]?.reasons.join(" ") ??
    baseReason
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
