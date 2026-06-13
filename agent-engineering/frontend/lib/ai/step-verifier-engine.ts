import type {
  ClaimTrace,
  MathDiagnosisRequest,
  MathDiagnosisResult,
  StepVerifierDecision,
  StepVerificationSignal,
  StepWrongCandidate,
} from "./math-diagnosis-types";
import { calibrateWithProcessSupervision } from "./process-supervision-calibration";

type StepVerifierInput = {
  request: Pick<MathDiagnosisRequest, "problemText" | "studentSteps">;
  diagnosis: Pick<
    MathDiagnosisResult,
    "firstWrongStep" | "strictChecks" | "misconceptionAtoms"
  >;
  claimTraces: ClaimTrace[];
};

export function verifyStudentSteps(input: StepVerifierInput): StepVerifierDecision {
  const baselineCandidates = buildStepCandidates(input)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(calibrateCandidate);
  const processSupervision = calibrateWithProcessSupervision({
    candidates: baselineCandidates,
  });
  const candidates = processSupervision.candidates;
  const selected = candidates[0] ?? null;
  const reliability = inferReliability(selected, candidates);
  const notes = [
    ...buildDecisionNotes(input, selected, candidates),
    ...processSupervision.notes,
  ];

  return {
    source: "typescript_step_verifier",
    selectedStepId: selected?.stepId ?? input.diagnosis.firstWrongStep ?? null,
    selectedClaimId: selected?.claimId ?? null,
    calibratedConfidence: selected?.calibratedConfidence ?? 0,
    reliability,
    candidates,
    feedbackSample:
      reliability === "high" &&
      !candidates.some((candidate) => candidate.needsHumanLabel)
        ? undefined
        : buildFeedbackSample(input, selected, candidates),
    notes,
  };
}

function buildStepCandidates({
  request,
  diagnosis,
  claimTraces,
}: StepVerifierInput): StepWrongCandidate[] {
  const failedChecks = diagnosis.strictChecks.filter(
    (check) => check.status === "fail"
  );
  const warningChecks = diagnosis.strictChecks.filter(
    (check) => check.status === "warn"
  );
  const candidates = claimTraces.map((claim, index) => {
    const signals = inferSignals({ request, claim, failedChecks, warningChecks });
    const reasons = inferReasons({ claim, failedChecks, warningChecks, signals });
    const priorScore = diagnosis.firstWrongStep === claim.stepId ? 0.24 : 0;
    const statusScore =
      claim.status === "fail" ? 0.46 : claim.status === "warn" ? 0.22 : 0.04;
    const signalScore = signals.reduce(
      (sum, signal) => sum + signalWeight(signal),
      0
    );
    const checkScore = Math.min(0.2, claim.strictCheckIds.length * 0.08);
    const orderPenalty = index * 0.015;

    return {
      id: `SWC-${index + 1}`,
      stepId: claim.stepId,
      claimId: claim.id,
      sentence: claim.sentence,
      expression: claim.expression,
      claimType: claim.claimType,
      signals,
      score: clamp(statusScore + signalScore + checkScore + priorScore - orderPenalty),
      calibratedConfidence: 0,
      reasons,
      needsHumanLabel: false,
    };
  });

  const candidateMap = new Map<string, StepWrongCandidate>();
  for (const candidate of candidates) {
    const existing = candidateMap.get(candidate.stepId);
    if (!existing || candidate.score > existing.score) {
      candidateMap.set(candidate.stepId, candidate);
    }
  }

  if (
    diagnosis.firstWrongStep &&
    !candidateMap.has(diagnosis.firstWrongStep)
  ) {
    candidateMap.set(diagnosis.firstWrongStep, {
      id: "SWC-FALLBACK",
      stepId: diagnosis.firstWrongStep,
      claimId: null,
      sentence: diagnosis.firstWrongStep,
      expression: null,
      claimType: "proof_step",
      signals: ["strict_gate"],
      score: failedChecks.length ? 0.42 : 0.28,
      calibratedConfidence: 0,
      reasons: failedChecks.map((check) => check.reason).filter(Boolean),
      needsHumanLabel: true,
    });
  }

  return [...candidateMap.values()];
}

function calibrateCandidate(
  candidate: StepWrongCandidate,
  index: number,
  all: StepWrongCandidate[]
): StepWrongCandidate {
  const runnerUp = all[index + 1];
  const margin = runnerUp ? candidate.score - runnerUp.score : candidate.score;
  const calibrationBoost =
    candidate.signals.includes("condition_gap") ||
    candidate.signals.includes("equivalence_gap")
      ? 0.06
      : 0;
  const calibratedConfidence = clamp(
    0.18 + candidate.score * 0.68 + Math.max(0, margin) * 0.22 + calibrationBoost
  );

  return {
    ...candidate,
    calibratedConfidence,
    needsHumanLabel:
      calibratedConfidence < 0.72 ||
      candidate.signals.includes("ocr_noise") ||
      margin < 0.12,
  };
}

function inferSignals({
  request,
  claim,
  failedChecks,
  warningChecks,
}: {
  request: Pick<MathDiagnosisRequest, "problemText" | "studentSteps">;
  claim: ClaimTrace;
  failedChecks: MathDiagnosisResult["strictChecks"];
  warningChecks: MathDiagnosisResult["strictChecks"];
}): StepVerificationSignal[] {
  const signals = new Set<StepVerificationSignal>();
  if (claim.status === "fail" || claim.strictCheckIds.length > 0) {
    signals.add("claim_trace");
    signals.add("strict_gate");
  }

  const text = `${request.problemText}\n${claim.sentence}\n${failedChecks
    .map((check) => `${check.label} ${check.reason}`)
    .join("\n")}`;
  if (/等价|变形|平方|开方|同乘|取倒数|不等式|=>|⇔|=|<|>/.test(text)) {
    signals.add("equivalence_gap");
  }
  if (/定义域|条件|范围|恒成立|任意|存在|分类|端点|边界|量词/.test(text)) {
    signals.add("condition_gap");
  }
  if (/[①②③④⑤⑥]|[’‘]|[＜＞＝－]|l\s*n\s*x|ocr|低置信/i.test(text)) {
    signals.add("ocr_noise");
  }
  if (warningChecks.length > 0 && claim.status !== "pass") {
    signals.add("formal_adapter");
  }

  return [...signals];
}

function inferReasons({
  claim,
  failedChecks,
  warningChecks,
  signals,
}: {
  claim: ClaimTrace;
  failedChecks: MathDiagnosisResult["strictChecks"];
  warningChecks: MathDiagnosisResult["strictChecks"];
  signals: StepVerificationSignal[];
}) {
  const reasons = [claim.reason].filter(Boolean);
  for (const check of [...failedChecks, ...warningChecks]) {
    if (claim.strictCheckIds.includes(check.id)) {
      reasons.push(`${check.label}: ${check.reason}`);
    }
  }
  if (signals.includes("condition_gap")) {
    reasons.push("候选步骤疑似缺少定义域、分类讨论、端点或题目条件。");
  }
  if (signals.includes("equivalence_gap")) {
    reasons.push("候选步骤涉及等价变形，需确认变形前后是否保持同解。");
  }
  return [...new Set(reasons)].slice(0, 5);
}

function inferReliability(
  selected: StepWrongCandidate | null,
  candidates: StepWrongCandidate[]
): StepVerifierDecision["reliability"] {
  if (!selected) {
    return "low";
  }
  const runnerUp = candidates[1];
  const margin = runnerUp ? selected.score - runnerUp.score : selected.score;
  if (selected.calibratedConfidence >= 0.78 && margin >= 0.14) {
    return "high";
  }
  if (selected.calibratedConfidence >= 0.58) {
    return "medium";
  }
  return "low";
}

function buildDecisionNotes(
  input: StepVerifierInput,
  selected: StepWrongCandidate | null,
  candidates: StepWrongCandidate[]
) {
  const notes = [
    "参考 OpenR 的过程监督思想：保留多个候选首错并按过程信号排序。",
    "参考 Safe 的 step-aware verification 思想：把学生步骤拆成 claim 后再判断。",
  ];

  if (selected && selected.stepId !== input.diagnosis.firstWrongStep) {
    notes.push(
      `StepVerifier 选择 ${selected.stepId}，与基础规则 ${input.diagnosis.firstWrongStep ?? "null"} 不一致，需要复核。`
    );
  }
  if (candidates.some((candidate) => candidate.needsHumanLabel)) {
    notes.push("存在低置信或候选接近的步骤，建议进入人工标注回流。");
  }
  return notes;
}

function buildFeedbackSample(
  input: StepVerifierInput,
  selected: StepWrongCandidate | null,
  candidates: StepWrongCandidate[]
): StepVerifierDecision["feedbackSample"] {
  return {
    sampleId: `step-feedback-${Date.now().toString(36)}`,
    problemText: input.request.problemText,
    studentSteps: input.request.studentSteps,
    predictedStepId: selected?.stepId ?? null,
    predictedClaimId: selected?.claimId ?? null,
    candidateStepIds: candidates.map((candidate) => candidate.stepId),
    labelStatus: "needs_label",
    suggestedLabelFields: [
      "correctFirstWrongStep",
      "correctClaimId",
      "misconceptionAtoms",
      "missingCondition",
      "equivalenceJustification",
    ],
  };
}

function signalWeight(signal: StepVerificationSignal) {
  const weights: Record<StepVerificationSignal, number> = {
    strict_gate: 0.12,
    claim_trace: 0.1,
    equivalence_gap: 0.1,
    condition_gap: 0.12,
    ocr_noise: -0.04,
    formal_adapter: 0.06,
    human_label: 0.18,
  };
  return weights[signal];
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
