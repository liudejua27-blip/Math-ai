import assert from "node:assert/strict";
import {
  applyLearnerMemoryToPolicy,
  buildLearnerMemoryGuidance,
  buildStepAlignmentDetails,
  expandMisconceptionAtoms,
} from "./diagnosis-enhancement-engine";
import type { MathDiagnosisResult } from "./math-diagnosis-types";
import type { LearnerMemoryDelta } from "./learner-memory-types";
import type { SocraticPolicyDecision } from "./socratic-policy-engine";

const minimalDiagnosis: Pick<
  MathDiagnosisResult,
  "strictChecks" | "firstWrongStep" | "misconceptionAtoms"
> = {
  firstWrongStep: "S1",
  strictChecks: [
    {
      id: "Q1",
      label: "定义域约束",
      status: "fail",
      reason: "没有先写定义域。",
    },
    {
      id: "Q2",
      label: "分类讨论",
      status: "fail",
      reason: "含参数问题缺少分类边界。",
    },
  ],
  misconceptionAtoms: [
    {
      id: "A07",
      label: "定义域意识弱",
      level: "foundation",
      description: "没有先检查表达式合法性。",
    },
  ],
};

const alignment = buildStepAlignmentDetails({
  request: {
    studentSteps:
      "S1: 直接令 f'(x)=0，所以 a>0。\nS2: 答案就是 a>0。",
  },
  diagnosis: minimalDiagnosis,
  rawDiagnosis: {
    strict_checks: [
      { id: "Q1", key: "domain_usage", label: "定义域约束" },
      { id: "Q2", key: "parameter_discussion", label: "分类讨论" },
    ],
  },
});

assert.equal(alignment.details[0].stepId, "S1");
assert.ok(alignment.claims.some((claim) => claim.status === "fail"));
assert.ok(
  alignment.claims.some(
    (claim) =>
      claim.expression?.includes("f'(x)=0") ||
      claim.claimType === "classification"
  )
);

const atoms = expandMisconceptionAtoms({
  request: {
    problemText: "已知含参数函数在区间上恒成立，求 a 的范围。",
    studentSteps: "S1: 直接令 f'(x)=0，所以 a>0。",
  },
  diagnosis: minimalDiagnosis,
  claimTraces: alignment.claims,
});
assert.ok(atoms.some((atom) => atom.id === "A42"));
assert.ok(atoms.some((atom) => atom.id === "A49"));

const learnerMemoryDelta: LearnerMemoryDelta = {
  studentId: "stu_1",
  atomUpdates: [
    {
      atomId: "A42",
      label: "参数恒成立转化缺失",
      exposureCount: 4,
      errorCount: 3,
      recurrenceRate30d: 0.75,
      recurrenceRateLast10: 0.75,
      transferRate: 0.2,
      selfRepairRate: 0.1,
      lastWrongProblemIds: ["p1"],
      lastSuccessfulVariantIds: [],
      mastery: "weak",
    },
  ],
  topicUpdate: {
    topicId: "function_property",
    problemCount: 1,
    correctCount: 0,
    commonAtoms: ["A42"],
    currentLevel: "basic",
  },
  strategyUpdate: {
    tendsToSkipDomainCheck: false,
    tendsToAvoidClassification: true,
    tendsToUseAnswerFirstReasoning: true,
    tendsToIgnoreEndpointComparison: false,
    tendsToMisreadGeometricConstraints: false,
    tendsToUseFormulaWithoutCondition: false,
    notes: [],
  },
  summary: {
    updatedAtoms: ["A42"],
    weakAtoms: ["A42"],
    improvingAtoms: [],
    recommendedPlan: [],
  },
};

const guidance = buildLearnerMemoryGuidance({
  learnerMemoryDelta,
  atoms,
});
assert.equal(guidance?.questionDifficulty, "micro");
assert.equal(guidance?.variantLevel, 1);
assert.equal(guidance?.canShowFullSolution, false);
assert.equal(guidance?.shouldTriggerReviewPlan, true);

const policy: SocraticPolicyDecision = {
  mode: "first_wrong_step",
  allowedContent: {
    canShowFinalAnswer: false,
    canShowFullSolution: true,
    canShowFirstWrongStep: true,
    canShowHint: true,
    canAskQuestion: true,
  },
  nextPrompts: ["原始追问"],
  reason: "基础策略",
};
const guidedPolicy = applyLearnerMemoryToPolicy({ policy, guidance });
assert.equal(guidedPolicy.allowedContent.canShowFullSolution, false);
assert.equal(guidedPolicy.recommendedAction, "trigger_review_plan");
assert.match(guidedPolicy.nextPrompts[0], /小问题/);

console.log("diagnosis-enhancement-engine tests passed");
