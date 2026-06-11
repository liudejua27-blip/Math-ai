import assert from "node:assert/strict";
import { verifyStudentSteps } from "./step-verifier-engine";
import type { ClaimTrace, MathDiagnosisResult } from "./math-diagnosis-types";

const claimTraces: ClaimTrace[] = [
  {
    id: "S1-C1",
    stepId: "S1",
    sentence: "S1: 直接令 Δ<0。",
    expression: "Δ<0",
    claimType: "classification",
    status: "fail",
    atomIds: ["A18", "A49"],
    strictCheckIds: ["Q2"],
    reason: "该 claim 命中分类讨论：恒成立问题缺少条件转化。",
    confidence: 0.72,
  },
  {
    id: "S2-C1",
    stepId: "S2",
    sentence: "S2: 4a^2-4<0，所以 -1<a<1。",
    expression: "4a^2-4<0",
    claimType: "equivalence_transform",
    status: "warn",
    atomIds: ["A48"],
    strictCheckIds: [],
    reason: "该 claim 暂未命中失败门禁。",
    confidence: 0.55,
  },
];

const diagnosis: Pick<
  MathDiagnosisResult,
  "firstWrongStep" | "strictChecks" | "misconceptionAtoms"
> = {
  firstWrongStep: "S1",
  strictChecks: [
    {
      id: "Q2",
      label: "参数恒成立转化",
      status: "fail",
      reason: "恒成立题不能只看判别式，需要先确认二次项和定义范围。",
    },
  ],
  misconceptionAtoms: [
    {
      id: "A18",
      label: "分类讨论缺失",
      level: "strategy",
      description: "没有处理参数边界。",
    },
  ],
};

const decision = verifyStudentSteps({
  request: {
    problemText: "已知二次函数 y=x^2-2ax+1 恒大于 0，求 a 的范围。",
    studentSteps: "S1: 直接令 Δ<0。\nS2: 4a^2-4<0，所以 -1<a<1。",
  },
  diagnosis,
  claimTraces,
});

assert.equal(decision.selectedStepId, "S1");
assert.equal(decision.selectedClaimId, "S1-C1");
assert.ok(decision.candidates.length >= 2);
assert.ok(decision.candidates[0].signals.includes("condition_gap"));
assert.ok(decision.calibratedConfidence > 0.7);

const noisyDecision = verifyStudentSteps({
  request: {
    problemText: "设 f(x)=l n x-a/x，x＞0，求 f’(x)。",
    studentSteps: "① f’(x)＝1/x－a\n② 代入 x＝1",
  },
  diagnosis: {
    ...diagnosis,
    firstWrongStep: "S1",
  },
  claimTraces: [
    {
      id: "S1-C1",
      stepId: "S1",
      sentence: "① f’(x)＝1/x－a",
      expression: "f'(x)=1/x-a",
      claimType: "equivalence_transform",
      status: "fail",
      atomIds: ["A48"],
      strictCheckIds: ["Q1"],
      reason: "导数等价变形错误。",
      confidence: 0.62,
    },
  ],
});

assert.equal(noisyDecision.selectedStepId, "S1");
assert.ok(noisyDecision.candidates[0].signals.includes("ocr_noise"));
assert.ok(noisyDecision.feedbackSample);
assert.deepEqual(noisyDecision.feedbackSample?.labelStatus, "needs_label");

console.log("step-verifier-engine tests passed");
