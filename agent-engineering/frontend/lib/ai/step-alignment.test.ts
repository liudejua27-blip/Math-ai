import assert from "node:assert/strict";

async function main() {
  process.env.MATH_PYTHON_VERIFIER_ENABLED ??= "false";
  const { runMathDiagnosisWorkflow } = await import("./math-diagnosis-workflow");

  const derivativeFormula = await runMathDiagnosisWorkflow({
    problemText: "设 f(x)=lnx-a/x，x>0，求 f'(x)。",
    studentSteps: "S1: f'(x)=1/x-a。\nS2: 代入 x=1 得 f'(1)=1-a。",
    teachingStyle: "socratic",
    visualMode: "html_card",
  });
  assert.ok(!("error" in derivativeFormula));
  if (!("error" in derivativeFormula)) {
    assert.equal(derivativeFormula.firstWrongStep, "S1");
    assert.match(derivativeFormula.firstWrongReason ?? "", /step-alignment/);
  }

  const quadratic = await runMathDiagnosisWorkflow({
    problemText: "已知二次函数 y=x^2-2ax+1 恒大于 0，求 a 的范围。",
    studentSteps: "S1: 直接令 Δ<0。\nS2: 4a^2-4<0，所以 -1<a<1。",
    teachingStyle: "socratic",
    visualMode: "html_card",
  });
  assert.ok(!("error" in quadratic));
  if (!("error" in quadratic)) {
    assert.equal(quadratic.firstWrongStep, "S1");
  }

  const geometry = await runMathDiagnosisWorkflow({
    problemText: "在正方体 ABCD-A1B1C1D1 中，求 A1C 与底面 ABCD 所成角。",
    studentSteps:
      "S1: 连接 A1C。\nS2: 直接把 A1C 和 AB 的夹角当成线面角，所以答案是 45 度。",
    teachingStyle: "socratic",
    visualMode: "html_card",
  });
  assert.ok(!("error" in geometry));
  if (!("error" in geometry)) {
    assert.equal(geometry.firstWrongStep, "S2");
  }

  console.log("step-alignment tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
