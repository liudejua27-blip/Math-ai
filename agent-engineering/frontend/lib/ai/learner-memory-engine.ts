import type {
  AtomMastery,
  AtomMemory,
  LearnerMemoryDelta,
  StrategyMemory,
  TopicMemory,
} from "./learner-memory-types";
import type { MathDiagnosisResult } from "./math-diagnosis-types";
import type { RemediationPlan, VariantTransferRecord } from "./remediation-loop-types";

type LearnerMemoryInput = {
  studentId: string;
  problemId: string;
  topicId?: string;
  atoms: MathDiagnosisResult["misconceptionAtoms"];
  remediationPlan?: RemediationPlan;
  correctionCompleted?: boolean;
  previousAtomMemory?: Record<string, AtomMemory>;
  transferRecords?: VariantTransferRecord[];
};

export function updateLearnerMemoryAfterDiagnosis(
  input: LearnerMemoryInput
): LearnerMemoryDelta {
  const atomUpdates = input.atoms.map((atom) =>
    updateAtomMemory({
      previous: input.previousAtomMemory?.[atom.id],
      atomId: atom.id,
      label: atom.label || atom.id,
      problemId: input.problemId,
      selfRepaired: input.correctionCompleted,
      transferRecords: input.transferRecords?.filter(
        (record) => record.sourceAtomId === atom.id
      ),
    })
  );
  const topicUpdate = updateTopicMemory({
    topicId: normalizeTopicId(input.topicId),
    atoms: input.atoms.map((atom) => atom.id),
    correct: input.atoms.length === 0,
  });
  const strategyUpdate = inferStrategyMemory(input.atoms.map((atom) => atom.id));

  return {
    studentId: input.studentId,
    atomUpdates,
    topicUpdate,
    strategyUpdate,
    summary: {
      updatedAtoms: atomUpdates.map((atom) => atom.atomId),
      weakAtoms: atomUpdates
        .filter((atom) => atom.mastery === "weak")
        .map((atom) => atom.atomId),
      improvingAtoms: atomUpdates
        .filter((atom) => atom.mastery === "improving")
        .map((atom) => atom.atomId),
      recommendedPlan:
        input.remediationPlan?.items.map((item) => item.title) ??
        atomUpdates.map((atom) => `复盘 ${atom.label}`),
    },
  };
}

export function updateAtomMemory({
  previous,
  atomId,
  label,
  problemId,
  selfRepaired,
  transferRecords = [],
}: {
  previous?: AtomMemory;
  atomId: string;
  label: string;
  problemId: string;
  selfRepaired?: boolean;
  transferRecords?: VariantTransferRecord[];
}): AtomMemory {
  const exposureCount = (previous?.exposureCount ?? 0) + 1;
  const errorCount = (previous?.errorCount ?? 0) + 1;
  const transferRate = computeTransferRate(transferRecords, previous?.transferRate);
  const selfRepairRate = computeRollingRate(
    previous?.selfRepairRate ?? 0,
    exposureCount,
    Boolean(selfRepaired)
  );
  const recurrenceRate30d = computeRecurrenceRate(errorCount, exposureCount);
  const recurrenceRateLast10 = computeRecurrenceRate(
    Math.min(errorCount, 10),
    Math.min(exposureCount, 10)
  );
  const next: AtomMemory = {
    atomId,
    label,
    exposureCount,
    errorCount,
    recurrenceRate30d,
    recurrenceRateLast10,
    transferRate,
    selfRepairRate,
    lastWrongProblemIds: [
      problemId,
      ...(previous?.lastWrongProblemIds ?? []),
    ].slice(0, 10),
    lastSuccessfulVariantIds: [
      ...transferRecords
        .filter((record) => record.correct && record.verifierPassed)
        .map((record) => record.variantId),
      ...(previous?.lastSuccessfulVariantIds ?? []),
    ].slice(0, 10),
    mastery: "unstable",
    updatedAt: new Date().toISOString(),
  };
  return { ...next, mastery: updateMastery(next) };
}

export function updateTopicMemory({
  topicId,
  atoms,
  correct,
}: {
  topicId: TopicMemory["topicId"];
  atoms: string[];
  correct: boolean;
}): TopicMemory {
  return {
    topicId,
    problemCount: 1,
    correctCount: correct ? 1 : 0,
    commonAtoms: [...new Set(atoms)].slice(0, 5),
    currentLevel: atoms.length >= 3 ? "basic" : atoms.length > 0 ? "standard" : "advanced",
  };
}

export function inferStrategyMemory(atomIds: string[]): StrategyMemory {
  const atomSet = new Set(atomIds);
  return {
    tendsToSkipDomainCheck: atomSet.has("A07") || atomSet.has("A01"),
    tendsToAvoidClassification: atomSet.has("A08") || atomSet.has("A18"),
    tendsToUseAnswerFirstReasoning: atomSet.has("A12"),
    tendsToIgnoreEndpointComparison: atomSet.has("A14"),
    tendsToMisreadGeometricConstraints:
      atomSet.has("A31") ||
      atomSet.has("A32") ||
      atomSet.has("A33") ||
      atomSet.has("A34"),
    tendsToUseFormulaWithoutCondition: atomSet.has("A02") || atomSet.has("A21"),
    notes: atomIds.map((atomId) => `本次命中 ${atomId}，需要进入同因复盘。`),
  };
}

export function computeRecurrenceRate(errorCount: number, exposureCount: number) {
  if (exposureCount <= 0) {
    return 0;
  }
  return roundRate(errorCount / exposureCount);
}

export function computeTransferRate(
  records: VariantTransferRecord[],
  fallback = 0
) {
  if (records.length === 0) {
    return fallback;
  }
  return roundRate(
    records.filter((record) => record.correct && record.verifierPassed).length /
      records.length
  );
}

export function updateMastery(
  atom: Pick<AtomMemory, "recurrenceRate30d" | "transferRate">
): AtomMastery {
  if (atom.recurrenceRate30d > 0.5 && atom.transferRate < 0.4) {
    return "weak";
  }
  if (atom.recurrenceRate30d > 0.25 && atom.transferRate < 0.7) {
    return "unstable";
  }
  if (atom.recurrenceRate30d <= 0.25 && atom.transferRate >= 0.6) {
    return "improving";
  }
  return "stable";
}

function computeRollingRate(previousRate: number, exposureCount: number, success: boolean) {
  const previousTotal = previousRate * Math.max(0, exposureCount - 1);
  return roundRate((previousTotal + (success ? 1 : 0)) / exposureCount);
}

function normalizeTopicId(topicId?: string): TopicMemory["topicId"] {
  if (topicId?.includes("derivative")) {
    return "derivative";
  }
  if (topicId?.includes("solid_geometry")) {
    return "solid_geometry";
  }
  if (topicId?.includes("quadratic") || topicId?.includes("inequality")) {
    return "inequality";
  }
  return "general";
}

function roundRate(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}
