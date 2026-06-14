import assert from "node:assert/strict";

async function main() {
  process.env.MATH_PYTHON_VERIFIER_ENABLED ??= "false";
  const { runMathDiagnosisWorkflow } = await import("./math-diagnosis-workflow");

  const result = await runMathDiagnosisWorkflow({
    problemText: "已知函数 f(x)=xlnx-ax 在 (0,+∞) 上有极值，求参数 a 的取值范围。",
    studentSteps:
      "S1: f'(x)=lnx+1-a=0，得到 x=e^(a-1)。\nS2: 所以函数一定有极小值，直接代入求最小值。",
    teachingStyle: "socratic",
    visualMode: "html_card",
  });

  assert.ok(!("error" in result), "TypeScript workflow should not need Python");

  if ("error" in result) {
    return;
  }

  assert.equal(result.thinkingGraph.type, "math_thinking_graph");
  assert.ok(result.thinkingGraph.nodes.length > 0);
  assert.ok(result.thinkingGraph.edges.length > 0);
  assert.ok(result.misconceptionAtoms.length > 0);
  assert.ok(result.strictChecks.some((check) => check.status === "fail"));
  assert.ok(
    result.correctionCard.blocks.some((block) => block.kind === "thinking_graph")
  );
  assert.ok(result.solutionMethods.length >= 2);
  assert.ok(result.solutionMethods.length <= 3);
  assert.ok(result.solutionComparison.recommendedMethodId);
  assert.ok(result.solutionComparison.fastestMethodId);
  assert.ok(result.visualExplanation);
  assert.ok(result.functionVisualExplanation);
  assert.ok(
    result.correctionCard.blocks.some(
      (block) => block.kind === "visual_explanation"
    )
  );
  assert.ok(
    result.correctionCard.blocks.some(
      (block) => block.kind === "function_visual_explanation"
    )
  );
  assert.ok(result.recommendedNextAction);
  assert.ok(result.studentReadableTrace?.length);
  assert.ok(result.experienceQuality);
  assert.ok(result.experienceQuality.overallScore > 0);
  assert.ok(
    result.experienceQuality.checks.some(
      (check) => check.id === "solution_methods"
    )
  );
  assert.ok(
    result.correctionCard.blocks.some(
      (block) => block.kind === "solution_comparison"
    )
  );
  assert.ok(
    result.correctionCard.blocks.some((block) => block.kind === "solution_method")
  );

  const geometryResult = await runMathDiagnosisWorkflow({
    problemText:
      "在正方体 ABCD-A1B1C1D1 中，求 A1C 与底面 ABCD 所成角。",
    studentSteps:
      "S1: 连接 A1C。 S2: 直接把 A1C 和 AB 的夹角当成线面角，所以答案是 45 度。",
    teachingStyle: "socratic",
    visualMode: "html_card",
  });

  assert.ok(!("error" in geometryResult));
  if (!("error" in geometryResult)) {
    assert.ok(
      geometryResult.recommendedGeometryLabs &&
        geometryResult.recommendedGeometryLabs.length > 0,
      "Solid geometry diagnosis should recommend Geometry Lab levels"
    );
    assert.ok(
      geometryResult.solutionMethods.some(
        (method) => method.strategyType === "vector_geometry"
      )
    );
    assert.equal(geometryResult.recommendedNextAction, "geometry_lab");
    assert.ok(geometryResult.visualExplanation?.linkedGeometryLabLevelId);
  }

  const missingSteps = await runMathDiagnosisWorkflow({
    problemText: "已知函数 f(x)=x^2，求 f'(1)。",
    studentSteps: "",
    teachingStyle: "socratic",
    visualMode: "html_card",
  });
  assert.ok("error" in missingSteps);
  assert.ok(!("solutionMethods" in missingSteps));

  console.log(
    JSON.stringify(
      {
        source:
          process.env.MATH_PYTHON_VERIFIER_ENABLED === "false"
            ? "typescript"
            : "typescript_with_optional_python_verifier",
        firstWrongStep: result.firstWrongStep,
        atoms: result.misconceptionAtoms.length,
        graphNodes: result.thinkingGraph.nodes.length,
        cardBlocks: result.correctionCard.blocks.length,
        solutionMethods: result.solutionMethods.length,
        geometryLabs:
          "error" in geometryResult
            ? 0
            : geometryResult.recommendedGeometryLabs?.length ?? 0,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
