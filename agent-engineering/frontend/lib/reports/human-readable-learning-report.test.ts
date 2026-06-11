import assert from "node:assert/strict";
import type { StudentWorkbenchSummary } from "@/lib/ai/student-workbench-types";
import {
  assertNoTechnicalTrace,
  buildHumanReadableLearningReports,
} from "./human-readable-learning-report";

const summary: StudentWorkbenchSummary = {
  profile: null,
  topAtoms: [
    {
      id: "memory-1",
      atomId: "A34",
      atomLabel: "二面角对象识别",
      recurrenceCount: 3,
      lastSeenAt: "2026-06-11T00:00:00.000Z",
      mastery: "weak",
      masteryLabel: "连续复发",
      transferRate: 0.2,
      selfRepairRate: 0.3,
      status: "active",
    },
    {
      id: "memory-2",
      atomId: "A07",
      atomLabel: "定义域意识",
      recurrenceCount: 2,
      lastSeenAt: "2026-06-11T00:00:00.000Z",
      mastery: "improving",
      masteryLabel: "正在修复",
      transferRate: 0.55,
      selfRepairRate: 0.6,
      status: "active",
    },
  ],
  recentDiagnoses: [
    {
      id: "diagnosis-1",
      sourceJobId: "job-1",
      createdAt: "2026-06-11T00:00:00.000Z",
      problemPreview: "三棱锥二面角练习",
      firstWrongStep: "S2",
      confidence: 0.8,
      needHumanReview: false,
      atomIds: ["A34"],
      atomLabels: ["二面角对象识别"],
    },
  ],
  weeklyReport: null,
  recommendedPlan: ["先复盘 A34，再做 1 道基础同类题。"],
};

const reports = buildHumanReadableLearningReports(summary);

assert.equal(reports.parent.audience, "parent");
assert.equal(reports.teacher.audience, "teacher");
assert.ok(reports.parent.summary.includes("本周"));
assert.ok(reports.teacher.summary.includes("教学干预点"));
assert.deepEqual(assertNoTechnicalTrace(reports), []);
assert.ok(!JSON.stringify(reports).includes("A34"));

console.log("human-readable-learning-report tests passed");
