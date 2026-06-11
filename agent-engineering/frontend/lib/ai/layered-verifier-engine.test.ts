import assert from "node:assert/strict";
import {
  buildLayeredVerifierReport,
  buildLayeredVerifierTraces,
} from "./layered-verifier-engine";
import type { ClaimTrace, MathDiagnosisResult } from "./math-diagnosis-types";

const claimTraces: ClaimTrace[] = [
  {
    id: "S1-C1",
    stepId: "S1",
    sentence: "S1: 直接令 Δ<0。",
    expression: "Δ<0",
    claimType: "classification",
    status: "fail",
    atomIds: ["A18"],
    strictCheckIds: ["Q1"],
    reason: "参数恒成立缺少分类边界。",
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
    reason: "需要确认等价变形条件。",
    confidence: 0.56,
  },
];

const diagnosis: Pick<
  MathDiagnosisResult,
  "strictChecks" | "misconceptionAtoms" | "firstWrongStep"
> = {
  firstWrongStep: "S1",
  strictChecks: [
    {
      id: "Q1",
      label: "参数分类",
      status: "fail",
      reason: "恒成立问题缺少参数边界讨论。",
    },
  ],
  misconceptionAtoms: [
    {
      id: "A18",
      label: "参数分析弱",
      level: "高风险",
      description: "把含参问题当作定参问题。",
    },
  ],
};

const report = buildLayeredVerifierReport({
  request: {
    problemText: "已知二次函数 y=x^2-2ax+1 恒大于 0，求 a 的范围。",
    studentSteps: "S1: 直接令 Δ<0。\nS2: 4a^2-4<0，所以 -1<a<1。",
  },
  diagnosis,
  claimTraces,
  pythonVerifier: null,
});

assert.equal(report.source, "layered_verifier_engine");
assert.equal(report.tiers.length, 3);
assert.ok(report.tiers.some((tier) => tier.tier === "light"));
assert.ok(report.tiers.some((tier) => tier.tier === "domain"));
assert.ok(report.tiers.some((tier) => tier.tier === "formal"));
assert.ok(report.formalReviewPlan.shouldRun);
assert.ok(report.formalReviewPlan.auxiliaryLemmaHints.length > 0);
assert.ok(report.knowledgeEvolution.curriculumTags.includes("参数与恒成立"));

const traces = buildLayeredVerifierTraces(report);
assert.ok(
  traces.some((trace) => trace.verifier === "high_school_domain_verifier")
);
assert.ok(traces.some((trace) => trace.verifier === "lean_formal_adapter"));

console.log("layered-verifier-engine tests passed");
