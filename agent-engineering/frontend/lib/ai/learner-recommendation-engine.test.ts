import assert from "node:assert/strict";
import {
  buildLearnerRecommendation,
  predictRecurrence,
} from "./learner-recommendation-engine";
import type { AtomMemory, LearnerMemoryDelta } from "./learner-memory-types";

const highRiskAtom: AtomMemory = {
  atomId: "A07",
  label: "定义域意识弱",
  exposureCount: 5,
  errorCount: 4,
  recurrenceRate30d: 0.8,
  recurrenceRateLast10: 0.7,
  transferRate: 0.2,
  selfRepairRate: 0.2,
  lastWrongProblemIds: ["p1", "p2"],
  lastSuccessfulVariantIds: [],
  mastery: "weak",
};

const highRisk = predictRecurrence(highRiskAtom);
assert.equal(highRisk.risk, "high");
assert.ok(highRisk.factors.includes("30 天复发率偏高"));

const highRiskDelta: LearnerMemoryDelta = {
  studentId: "stu_1",
  atomUpdates: [highRiskAtom],
  topicUpdate: {
    topicId: "derivative",
    problemCount: 5,
    correctCount: 1,
    commonAtoms: ["A07"],
    currentLevel: "basic",
  },
  strategyUpdate: {
    tendsToSkipDomainCheck: true,
    tendsToAvoidClassification: false,
    tendsToUseAnswerFirstReasoning: false,
    tendsToIgnoreEndpointComparison: false,
    tendsToMisreadGeometricConstraints: false,
    tendsToUseFormulaWithoutCondition: true,
    notes: [],
  },
  summary: {
    updatedAtoms: ["A07"],
    weakAtoms: ["A07"],
    improvingAtoms: [],
    recommendedPlan: [],
  },
};

const highRiskRecommendation = buildLearnerRecommendation({
  learnerMemoryDelta: highRiskDelta,
  targetAtoms: [{ id: "A07", label: "定义域意识弱" }],
  now: new Date("2026-06-12T00:00:00.000Z"),
});
assert.equal(highRiskRecommendation?.nextProblem.type, "surface_variant");
assert.equal(highRiskRecommendation?.adaptiveTeaching.questionDifficulty, "micro");
assert.equal(
  highRiskRecommendation?.adaptiveTeaching.canShowFullSolution,
  false
);
assert.equal(highRiskRecommendation?.reviewPlan.cadence, "tomorrow");
assert.equal(highRiskRecommendation?.heartbeat.enabled, true);

const geometryDelta: LearnerMemoryDelta = {
  ...highRiskDelta,
  atomUpdates: [
    {
      ...highRiskAtom,
      atomId: "A34",
      label: "线面角对象误判",
      transferRate: 0.35,
      selfRepairRate: 0.4,
    },
  ],
  summary: {
    updatedAtoms: ["A34"],
    weakAtoms: ["A34"],
    improvingAtoms: [],
    recommendedPlan: [],
  },
};
const geometryRecommendation = buildLearnerRecommendation({
  learnerMemoryDelta: geometryDelta,
  targetAtoms: [{ id: "A34", label: "线面角对象误判" }],
});
assert.equal(geometryRecommendation?.nextProblem.type, "geometry_lab");
assert.equal(
  geometryRecommendation?.adaptiveTeaching.explanationStyle,
  "visual_first"
);

const stableDelta: LearnerMemoryDelta = {
  ...highRiskDelta,
  atomUpdates: [
    {
      ...highRiskAtom,
      recurrenceRate30d: 0.05,
      recurrenceRateLast10: 0.1,
      transferRate: 0.8,
      selfRepairRate: 0.7,
      mastery: "stable",
    },
  ],
  summary: {
    updatedAtoms: ["A07"],
    weakAtoms: [],
    improvingAtoms: ["A07"],
    recommendedPlan: [],
  },
};
const stableRecommendation = buildLearnerRecommendation({
  learnerMemoryDelta: stableDelta,
  targetAtoms: [{ id: "A07", label: "定义域意识弱" }],
});
assert.equal(stableRecommendation?.recurrencePrediction.risk, "low");
assert.equal(stableRecommendation?.adaptiveTeaching.questionDifficulty, "challenge");
assert.equal(stableRecommendation?.adaptiveTeaching.canShowFullSolution, true);
assert.equal(stableRecommendation?.reviewPlan.shouldEnter, false);

console.log("learner-recommendation-engine tests passed");
