import assert from "node:assert/strict";
import {
  buildLearnerMemoryGuidance,
  applyLearnerMemoryToRemediationPlan,
} from "./diagnosis-enhancement-engine";
import {
  computeRecurrenceRate,
  computeTransferRate,
  inferStrategyMemory,
  updateAtomMemory,
  updateMastery,
} from "./learner-memory-engine";
import type { AtomMemory } from "./learner-memory-types";
import type { VariantTransferRecord } from "./remediation-loop-types";

assert.equal(computeRecurrenceRate(3, 5), 0.6);

const records: VariantTransferRecord[] = [
  {
    studentId: "stu_1",
    sourceProblemId: "p1",
    sourceAtomId: "A07",
    variantId: "v1",
    variantLevel: 1,
    correct: true,
    verifierPassed: true,
    completedAt: "2026-06-06T00:00:00.000Z",
  },
  {
    studentId: "stu_1",
    sourceProblemId: "p1",
    sourceAtomId: "A07",
    variantId: "v2",
    variantLevel: 3,
    correct: false,
    verifierPassed: false,
    completedAt: "2026-06-06T00:00:00.000Z",
  },
];
assert.equal(computeTransferRate(records), 0.5);

const previous: AtomMemory = {
  atomId: "A07",
  label: "定义域意识弱",
  exposureCount: 1,
  errorCount: 1,
  recurrenceRate30d: 1,
  recurrenceRateLast10: 1,
  transferRate: 0,
  selfRepairRate: 0,
  lastWrongProblemIds: ["p0"],
  lastSuccessfulVariantIds: [],
  mastery: "weak",
};
const next = updateAtomMemory({
  previous,
  atomId: "A07",
  label: "定义域意识弱",
  problemId: "p1",
  transferRecords: records,
});
assert.equal(next.exposureCount, 2);
assert.ok(next.recurrenceRate30d > previous.recurrenceRate30d - 0.01);
assert.equal(next.transferRate, 0.5);

assert.equal(updateMastery({ recurrenceRate30d: 0.8, transferRate: 0.1 }), "weak");
assert.equal(updateMastery({ recurrenceRate30d: 0.2, transferRate: 0.8 }), "improving");

const strategy = inferStrategyMemory(["A07", "A08"]);
assert.equal(strategy.tendsToSkipDomainCheck, true);
assert.equal(strategy.tendsToAvoidClassification, true);

const guidance = buildLearnerMemoryGuidance({
  learnerMemoryDelta: {
    studentId: "stu_1",
    atomUpdates: [{ ...next, mastery: "weak", transferRate: 0.2 }],
    topicUpdate: {
      topicId: "derivative",
      problemCount: 1,
      correctCount: 0,
      commonAtoms: ["A07"],
      currentLevel: "basic",
    },
    strategyUpdate: strategy,
    summary: {
      updatedAtoms: ["A07"],
      weakAtoms: ["A07"],
      improvingAtoms: [],
      recommendedPlan: [],
    },
  },
  atoms: [
    {
      id: "A07",
      label: "定义域意识弱",
      level: "foundation",
      description: "先检查定义域。",
    },
  ],
});
assert.equal(guidance?.canShowFullSolution, false);
assert.equal(guidance?.variantLevel, 1);
assert.equal(guidance?.recommendation?.nextProblem.type, "surface_variant");
assert.equal(guidance?.recommendation?.reviewPlan.shouldEnter, true);
assert.equal(guidance?.recommendation?.heartbeat.enabled, true);
assert.equal(
  guidance?.recommendation?.adaptiveTeaching.canShowFullSolution,
  false
);

const memoryDrivenPlan = applyLearnerMemoryToRemediationPlan({
  plan: {
    sourceAtoms: ["A07"],
    nextStep: "practice_variants",
    masteryImpact: "medium",
    items: [
      {
        atomId: "A07",
        atomLabel: "定义域意识弱",
        level: 3,
        title: "迁移变式",
        prompt: "迁移到复合函数定义域。",
        purpose: "验证迁移。",
      },
    ],
  },
  guidance,
});
assert.equal(memoryDrivenPlan.items[0].level, 1);

console.log("learner-memory-engine tests passed");
