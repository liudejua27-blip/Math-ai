import assert from "node:assert/strict";
import {
  buildFunctionVisualExplanationSpec,
  validateFunctionVisualExplanationSpec,
} from "./function-visual-explanation-engine";

const baseDiagnosis = {
  firstWrongStep: "S2",
  misconceptionAtoms: [
    {
      id: "A07",
      label: "定义域意识不足",
      level: "core",
      description: "没有先检查函数定义域。",
    },
  ],
  evidenceNodes: [{ id: "E1", type: "problem", text: "lnx", confidence: 0.9 }],
  strictChecks: [
    {
      id: "domain",
      label: "定义域门禁",
      status: "fail" as const,
      reason: "没有写出 x>0。",
    },
  ],
  claimTraces: [],
};

const derivative = buildFunctionVisualExplanationSpec({
  problemText: "已知函数 f(x)=xlnx-ax 在 (0,+∞) 上有极值，求 a 的范围。",
  studentSteps: "S1: f'(x)=lnx+1-a=0，得到 x=e^(a-1)。S2: 直接代入。",
  diagnosis: baseDiagnosis,
});
assert.ok(derivative);
assert.equal(derivative.topic, "derivative_domain");
assert.ok(derivative.domainHighlights.length > 0);
assert.ok(derivative.monotonicityRows.length > 0);

const parameter = buildFunctionVisualExplanationSpec({
  problemText: "若 ax+1 >= ln x 对任意 x>0 恒成立，求参数 a 的取值范围。",
  studentSteps: "S1: 参数分离。S2: 忘记端点和最值。",
  diagnosis: {
    ...baseDiagnosis,
    misconceptionAtoms: [
      {
        id: "A18",
        label: "参数恒成立转化不完整",
        level: "core",
        description: "没有转化为最值或范围。",
      },
    ],
  },
});
assert.ok(parameter);
assert.equal(parameter.topic, "parameter_for_all");
assert.ok(parameter.parameterTransform);

const quadratic = buildFunctionVisualExplanationSpec({
  problemText: "求二次函数 y=x^2-2x+3 在区间 [0,3] 上的最值。",
  studentSteps: "S1: 只看顶点，没有比较端点。",
  diagnosis: baseDiagnosis,
});
assert.ok(quadratic);
assert.equal(quadratic.topic, "quadratic_interval");
assert.ok(quadratic.quadraticShape);

assert.equal(
  validateFunctionVisualExplanationSpec({
    ...derivative,
    // @ts-expect-error deliberate forbidden field for validator coverage
    script: "alert(1)",
  }),
  false
);

console.log("function visual explanation tests passed");
