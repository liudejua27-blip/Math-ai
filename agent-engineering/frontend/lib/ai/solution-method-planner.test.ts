import assert from "node:assert/strict";
import { buildSolutionMethodPlan } from "./solution-method-planner";
import type { MathDiagnosisResult } from "./math-diagnosis-types";
import type { VerifierTrace } from "./verifier-trace-types";

const baseStrictChecks: MathDiagnosisResult["strictChecks"] = [
  {
    id: "Q1",
    label: "定义域约束",
    status: "fail",
    reason: "题干存在定义域，但学生没有先写入推理链。",
  },
];

const baseAtoms: MathDiagnosisResult["misconceptionAtoms"] = [
  {
    id: "A07",
    label: "定义域意识弱",
    level: "高风险",
    description: "求解前没有确认变量定义域。",
  },
];

const baseTraces: VerifierTrace[] = [
  {
    id: "VT1",
    claim: "S1: f'(x)=lnx+1-a",
    claimType: "derivative",
    verifier: "typescript_strict_gate",
    status: "fail",
    evidenceIds: ["Q1"],
    failureReason: "缺少定义域门禁。",
    confidence: 0.72,
  },
];

const derivativePlan = buildSolutionMethodPlan({
  problemText:
    "已知函数 f(x)=xlnx-ax 在 (0,+∞) 上有极值，求参数 a 的取值范围。",
  studentSteps:
    "S1: f'(x)=lnx+1-a=0，得到 x=e^(a-1)。\nS2: 所以函数一定有极小值。",
  topic: { id: "derivative_function", label: "导数与函数综合" },
  strictChecks: baseStrictChecks,
  misconceptionAtoms: baseAtoms,
  verifierTraces: baseTraces,
});

assert.equal(derivativePlan.solutionMethods.length, 3);
assert.ok(
  derivativePlan.solutionMethods.some((method) => method.title === "常规导数表法")
);
assert.ok(
  derivativePlan.solutionMethods.some((method) => method.title === "参数转最值法")
);
assert.ok(derivativePlan.solutionComparison.recommendedMethodId);
assert.ok(derivativePlan.solutionComparison.fastestMethodId);
assert.ok(
  derivativePlan.solutionMethods.every(
    (method) => method.verificationFocus.length >= 1
  )
);
assert.ok(
  derivativePlan.solutionMethods
    .filter((method) => method.isFastest)
    .every((method) => method.riskWarnings.length >= 1)
);

const geometryPlan = buildSolutionMethodPlan({
  problemText: "在正方体 ABCD-A1B1C1D1 中，求 A1C 与底面 ABCD 所成角。",
  studentSteps: "S1: 直接把 A1C 和 AB 的夹角当成线面角。",
  topic: { id: "solid_geometry", label: "立体几何" },
  strictChecks: [
    {
      id: "Q2",
      label: "投影/垂足",
      status: "warn",
      reason: "缺少投影对象。",
    },
  ],
  misconceptionAtoms: [
    {
      id: "A34",
      label: "二面角转化薄弱",
      level: "高风险",
      description: "没有把空间角转化到平面角。",
    },
  ],
  verifierTraces: baseTraces,
});

assert.equal(geometryPlan.solutionMethods.length, 3);
assert.ok(
  geometryPlan.solutionMethods.some(
    (method) => method.title === "传统几何辅助线法"
  )
);
assert.ok(
  geometryPlan.solutionMethods.some((method) => method.title === "空间向量法")
);
assert.ok(
  geometryPlan.solutionMethods.some(
    (method) => method.title === "Geometry Lab 可视化法"
  )
);

const genericPlan = buildSolutionMethodPlan({
  problemText: "已知条件若干，求证结论成立。",
  studentSteps: "S1: 由题可得，所以结论成立。",
  topic: { id: "general_high_school_math", label: "高中数学综合" },
  strictChecks: baseStrictChecks,
  misconceptionAtoms: baseAtoms,
  verifierTraces: [],
  needHumanReview: true,
});

assert.equal(genericPlan.solutionMethods.length, 2);
assert.ok(genericPlan.solutionComparison.reason.length > 0);
assert.ok(
  genericPlan.solutionMethods.some((method) =>
    method.riskWarnings.some((warning) => warning.includes("复核"))
  )
);

console.log("solution-method-planner tests passed");
