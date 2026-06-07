import assert from "node:assert/strict";
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

console.log("learner-memory-engine tests passed");
