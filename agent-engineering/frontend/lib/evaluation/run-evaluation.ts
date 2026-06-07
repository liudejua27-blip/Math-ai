import { writeFile } from "node:fs/promises";
import path from "node:path";
import { runMathDiagnosisWorkflow } from "../ai/math-diagnosis-workflow";
import { DEMO_EVALUATION_CASES } from "./demo-dataset";
import {
  buildMarkdownTable,
  computeEvaluationMetrics,
  evaluateCaseResult,
} from "./metrics";
import type { EvaluationReport } from "./evaluation-types";

export async function runEvaluationHarness(
  outputPath = path.join(__dirname, "evaluation-result.json")
): Promise<EvaluationReport> {
  process.env.MATH_PYTHON_VERIFIER_ENABLED ??= "false";

  const caseResults = [];
  for (const item of DEMO_EVALUATION_CASES) {
    const diagnosis = await runMathDiagnosisWorkflow({
      problemText: item.problemText,
      studentSteps: item.studentSteps,
      teachingStyle: "socratic",
      visualMode: "html_card",
    });
    caseResults.push(
      evaluateCaseResult(item, "error" in diagnosis ? undefined : diagnosis)
    );
  }

  const report: EvaluationReport = {
    generatedAt: new Date().toISOString(),
    metrics: computeEvaluationMetrics(DEMO_EVALUATION_CASES, caseResults),
    cases: caseResults,
    markdownTable: buildMarkdownTable(caseResults),
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

if (require.main === module) {
  runEvaluationHarness()
    .then((report) => {
      console.log(JSON.stringify(report.metrics, null, 2));
      console.log(report.markdownTable);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
