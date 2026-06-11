import { writeFile } from "node:fs/promises";
import path from "node:path";
import { runMathDiagnosisWorkflow } from "../ai/math-diagnosis-workflow";
import {
  OCR_DIAGNOSIS_CASES,
  type OCRDiagnosisCase,
} from "./ocr-diagnosis-dataset";

export type OCRDiagnosisCaseResult = {
  caseId: string;
  topic: OCRDiagnosisCase["topic"];
  imageFixtureId: string;
  passed: boolean;
  firstWrongStep?: string | null;
  detectedAtomIds: string[];
  failures: string[];
};

export type OCRDiagnosisEvaluationReport = {
  generatedAt: string;
  samplePolicy: "real_samples_expected";
  metrics: {
    totalCases: number;
    firstWrongStepAccuracy: number;
    atomRecall: number;
  };
  cases: OCRDiagnosisCaseResult[];
  markdownTable: string;
};

export async function runOCRDiagnosisEvaluation(
  outputPath = path.join(__dirname, "ocr-diagnosis-result.json")
): Promise<OCRDiagnosisEvaluationReport> {
  process.env.MATH_PYTHON_VERIFIER_ENABLED ??= "false";

  const cases: OCRDiagnosisCaseResult[] = [];
  for (const item of OCR_DIAGNOSIS_CASES) {
    const diagnosis = await runMathDiagnosisWorkflow({
      problemText: item.confirmedProblemText,
      studentSteps: item.confirmedStudentSteps,
      confirmedEvidence: item.ocrLines,
      teachingStyle: "socratic",
      visualMode: "html_card",
    });
    cases.push(evaluateOCRDiagnosisCase(item, "error" in diagnosis ? null : diagnosis));
  }

  const report: OCRDiagnosisEvaluationReport = {
    generatedAt: new Date().toISOString(),
    samplePolicy: "real_samples_expected",
    metrics: computeOCRDiagnosisMetrics(cases),
    cases,
    markdownTable: buildOCRDiagnosisMarkdown(cases),
  };

  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

function evaluateOCRDiagnosisCase(
  item: OCRDiagnosisCase,
  diagnosis: Awaited<ReturnType<typeof runMathDiagnosisWorkflow>> | null
): OCRDiagnosisCaseResult {
  const failures: string[] = [];
  if (!diagnosis || "error" in diagnosis) {
    failures.push("diagnosis_failed");
    return {
      caseId: item.id,
      topic: item.topic,
      imageFixtureId: item.imageFixtureId,
      passed: false,
      detectedAtomIds: [],
      failures,
    };
  }

  if (diagnosis.firstWrongStep !== item.expected.firstWrongStep) {
    failures.push(
      `first_wrong_step expected ${item.expected.firstWrongStep}, got ${diagnosis.firstWrongStep ?? "null"}`
    );
  }

  const detectedAtomIds = diagnosis.misconceptionAtoms.map((atom) => atom.id);
  for (const atomId of item.expected.atomIds) {
    if (!detectedAtomIds.includes(atomId)) {
      failures.push(`missing_atom ${atomId}`);
    }
  }

  return {
    caseId: item.id,
    topic: item.topic,
    imageFixtureId: item.imageFixtureId,
    passed: failures.length === 0,
    firstWrongStep: diagnosis.firstWrongStep,
    detectedAtomIds,
    failures,
  };
}

function computeOCRDiagnosisMetrics(cases: OCRDiagnosisCaseResult[]) {
  const totalCases = cases.length || 1;
  const firstWrongStepHits = cases.filter(
    (item) => !item.failures.some((failure) => failure.startsWith("first_wrong_step"))
  ).length;
  const atomHits = cases.filter(
    (item) => !item.failures.some((failure) => failure.startsWith("missing_atom"))
  ).length;

  return {
    totalCases: cases.length,
    firstWrongStepAccuracy: firstWrongStepHits / totalCases,
    atomRecall: atomHits / totalCases,
  };
}

function buildOCRDiagnosisMarkdown(cases: OCRDiagnosisCaseResult[]) {
  return [
    "| Case | Topic | Passed | First Wrong Step | Failures |",
    "| --- | --- | --- | --- | --- |",
    ...cases.map(
      (item) =>
        `| ${item.caseId} | ${item.topic} | ${item.passed ? "yes" : "no"} | ${item.firstWrongStep ?? "-"} | ${item.failures.join("; ") || "-"} |`
    ),
  ].join("\n");
}

if (require.main === module) {
  runOCRDiagnosisEvaluation()
    .then((report) => {
      console.log(JSON.stringify(report.metrics, null, 2));
      console.log(report.markdownTable);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
