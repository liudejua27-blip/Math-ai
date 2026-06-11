import assert from "node:assert/strict";
import { OCR_DIAGNOSIS_CASES } from "./ocr-diagnosis-dataset";
import { runOCRDiagnosisEvaluation } from "./ocr-diagnosis-runner";

async function main() {
  const report = await runOCRDiagnosisEvaluation();

  assert.equal(OCR_DIAGNOSIS_CASES.length, 3);
  assert.equal(report.metrics.totalCases, 3);
  assert.ok(report.markdownTable.includes("| Case | Topic | Passed |"));
  assert.ok(report.metrics.firstWrongStepAccuracy >= 0.67);
  assert.ok(report.metrics.atomRecall >= 0.67);

  for (const item of report.cases) {
    assert.ok(item.imageFixtureId.includes("draft-real-sample-placeholder"));
    assert.ok(Array.isArray(item.detectedAtomIds));
  }

  console.log(JSON.stringify(report.metrics, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
