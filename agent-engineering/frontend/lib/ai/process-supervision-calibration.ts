import type { StepVerificationSignal, StepWrongCandidate } from "./math-diagnosis-types";

export type ProcessSupervisionCalibrationInput = {
  candidates: StepWrongCandidate[];
  humanLabels?: Array<{
    stepId: string;
    claimId?: string | null;
    accepted: boolean;
  }>;
};

export type ProcessSupervisionCalibrationResult = {
  source: "openr_inspired_process_supervision";
  candidates: StepWrongCandidate[];
  margin: number;
  requiresHumanLabel: boolean;
  notes: string[];
};

export function calibrateWithProcessSupervision({
  candidates,
  humanLabels = [],
}: ProcessSupervisionCalibrationInput): ProcessSupervisionCalibrationResult {
  const labelsByStep = new Map(humanLabels.map((label) => [label.stepId, label]));
  const calibrated = candidates
    .map((candidate, index) => {
      const label = labelsByStep.get(candidate.stepId);
      const processSignals = inferProcessSignals(candidate);
      const labelBoost = label?.accepted ? 0.18 : label ? -0.12 : 0;
      const earlyStepPrior = Math.max(0, 0.08 - index * 0.02);
      const ambiguityPenalty = candidate.signals.includes("ocr_noise") ? 0.08 : 0;
      const score = clamp(
        candidate.score +
          processSignals.reduce((sum, signal) => sum + signalWeight(signal), 0) +
          labelBoost +
          earlyStepPrior -
          ambiguityPenalty
      );

      return {
        ...candidate,
        signals: uniqueSignals([...candidate.signals, ...processSignals]),
        score,
      };
    })
    .sort((first, second) => second.score - first.score)
    .map((candidate, index, all) => {
      const best = all[0];
      const second = all[1];
      const margin =
        index === 0
          ? second
            ? candidate.score - second.score
            : candidate.score
          : best
            ? candidate.score - best.score
            : candidate.score;
      const calibratedConfidence = clamp(
        0.2 + candidate.score * 0.64 + Math.max(0, margin) * 0.26
      );
      return {
        ...candidate,
        calibratedConfidence,
        needsHumanLabel:
          calibratedConfidence < 0.72 ||
          margin < 0.1 ||
          candidate.signals.includes("ocr_noise"),
      };
    });

  const margin = calibrated[0] && calibrated[1] ? calibrated[0].score - calibrated[1].score : calibrated[0]?.score ?? 0;
  const requiresHumanLabel = calibrated.some((candidate) => candidate.needsHumanLabel);

  return {
    source: "openr_inspired_process_supervision",
    candidates: calibrated,
    margin,
    requiresHumanLabel,
    notes: [
      "Adapted from process-supervision style ranking: keep multiple candidate first-wrong steps instead of trusting a single strict-gate failure.",
      "Confidence uses score margin, OCR ambiguity, condition/equivalence signals, and optional human labels.",
      "Low margin or OCR noise routes the sample into the human-label feedback loop.",
    ],
  };
}

function inferProcessSignals(candidate: StepWrongCandidate): StepVerificationSignal[] {
  const text = `${candidate.sentence}\n${candidate.expression ?? ""}\n${candidate.reasons.join("\n")}`;
  const signals = new Set<StepVerificationSignal>();

  if (/domain|定义域|范围|恒成立|任意|存在|分类|端点|边界/i.test(text)) {
    signals.add("condition_gap");
  }
  if (/equiv|等价|变形|平方|开方|同乘|倒数|不等式|=>|<=|>=|<|>/i.test(text)) {
    signals.add("equivalence_gap");
  }
  if (/ocr|低置信|鈶|�|full.?width|step index/i.test(text)) {
    signals.add("ocr_noise");
  }

  if (candidate.signals.includes("strict_gate")) {
    signals.add("strict_gate");
  }

  return [...signals];
}

function signalWeight(signal: StepVerificationSignal) {
  const weights: Record<StepVerificationSignal, number> = {
    strict_gate: 0.06,
    claim_trace: 0.04,
    equivalence_gap: 0.08,
    condition_gap: 0.1,
    ocr_noise: -0.03,
    formal_adapter: 0.04,
    human_label: 0.16,
  };
  return weights[signal];
}

function uniqueSignals(signals: StepVerificationSignal[]) {
  return [...new Set(signals)];
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}
