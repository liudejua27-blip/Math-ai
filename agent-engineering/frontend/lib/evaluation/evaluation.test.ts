import assert from "node:assert/strict";
import { DEMO_EVALUATION_CASES } from "./demo-dataset";
import { runEvaluationHarness } from "./run-evaluation";

async function main() {
  const report = await runEvaluationHarness();

  assert.equal(DEMO_EVALUATION_CASES.length, 10);
  assert.equal(report.metrics.totalCases, 10);
  assert.equal(report.cases.length, 10);
  assert.ok(report.markdownTable.includes("| Case | Topic | Passed | Failures |"));
  assert.ok(report.metrics.verifierTraceCoverage > 0);
  assert.ok(report.metrics.policyComplianceRate > 0);

  for (const item of report.cases) {
    assert.equal(typeof item.caseId, "string");
    assert.ok(Array.isArray(item.failures));
  }

  console.log(JSON.stringify(report.metrics, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
