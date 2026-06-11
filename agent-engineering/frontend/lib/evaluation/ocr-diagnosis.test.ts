import assert from "node:assert/strict";
import { OCR_DIAGNOSIS_CASES } from "./ocr-diagnosis-dataset";
import { runOCRDiagnosisEvaluation } from "./ocr-diagnosis-runner";

async function main() {
  const report = await runOCRDiagnosisEvaluation();

  assert.equal(OCR_DIAGNOSIS_CASES.length, 3);
  assert.equal(report.metrics.totalCases, 3);
  assert.ok(report.markdownTable.includes("| Case | Topic | OCR Noise |"));
  assert.ok(report.metrics.firstWrongStepAccuracy >= 0.67);
  assert.ok(report.metrics.atomRecall >= 2 / 3);
  assert.ok(report.metrics.issueBreakdown.full_width_symbol.totalCases >= 1);
  assert.ok(
    report.metrics.issueBreakdown.geometry_reference_noise.totalCases >= 1
  );

  for (const item of report.cases) {
    assert.ok(item.imageFixtureId.includes("draft-real-sample-placeholder"));
    assert.ok(item.noiseTags.length > 0);
    assert.ok(Array.isArray(item.detectedAtomIds));
  }

  console.log(JSON.stringify(report.metrics, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
