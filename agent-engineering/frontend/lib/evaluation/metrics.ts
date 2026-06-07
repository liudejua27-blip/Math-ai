import type {
  EvaluationCase,
  EvaluationCaseResult,
  EvaluationMetrics,
} from "./evaluation-types";

export function evaluateCaseResult(
  item: EvaluationCase,
  result: EvaluationCaseResult["result"]
): EvaluationCaseResult {
  if (!result) {
    return {
      caseId: item.id,
      topic: item.topic,
      passed: false,
      failures: ["workflow returned no diagnosis result"],
    };
  }

  const failures: string[] = [];
  if (
    item.expected.firstWrongStep &&
    result.firstWrongStep !== item.expected.firstWrongStep
  ) {
    failures.push(
      `firstWrongStep expected ${item.expected.firstWrongStep}, got ${result.firstWrongStep}`
    );
  }

  const resultAtoms = new Set(result.misconceptionAtoms.map((atom) => atom.id));
  for (const atomId of item.expected.atomIds) {
    if (!resultAtoms.has(atomId)) {
      failures.push(`missing atom ${atomId}`);
    }
  }

  const failedLabels = result.strictChecks
    .filter((check) => check.status === "fail")
    .map((check) => check.label);
  for (const label of item.expected.failedCheckLabels) {
    if (!failedLabels.some((itemLabel) => itemLabel.includes(label))) {
      failures.push(`missing failed strict check ${label}`);
    }
  }

  if (!result.verifierTraces.length) {
    failures.push("missing verifier traces");
  }
  if (result.firstWrongStep && result.policyDecision.allowedContent.canShowFullSolution) {
    failures.push("policy allowed full solution while firstWrongStep exists");
  }

  return {
    caseId: item.id,
    topic: item.topic,
    passed: failures.length === 0,
    result,
    failures,
  };
}

export function computeEvaluationMetrics(
  cases: EvaluationCase[],
  results: EvaluationCaseResult[]
): EvaluationMetrics {
  const totalCases = cases.length;
  const byId = new Map(results.map((result) => [result.caseId, result]));

  const firstWrongStepAccuracy = average(
    cases.map((item) => {
      const result = byId.get(item.id)?.result;
      return result?.firstWrongStep === item.expected.firstWrongStep ? 1 : 0;
    })
  );
  const misconceptionAtomAccuracy = average(
    cases.map((item) => {
      const result = byId.get(item.id)?.result;
      if (!result) {
        return 0;
      }
      const atomIds = new Set(result.misconceptionAtoms.map((atom) => atom.id));
      const expectedCount = Math.max(1, item.expected.atomIds.length);
      return (
        item.expected.atomIds.filter((atomId) => atomIds.has(atomId)).length /
        expectedCount
      );
    })
  );
  const strictCheckAccuracy = average(
    cases.map((item) => {
      const result = byId.get(item.id)?.result;
      if (!result || item.expected.failedCheckLabels.length === 0) {
        return result ? 1 : 0;
      }
      const labels = result.strictChecks
        .filter((check) => check.status === "fail")
        .map((check) => check.label);
      return (
        item.expected.failedCheckLabels.filter((label) =>
          labels.some((resultLabel) => resultLabel.includes(label))
        ).length / item.expected.failedCheckLabels.length
      );
    })
  );
  const humanReviewRate = average(
    results.map((item) => (item.result?.needHumanReview ? 1 : 0))
  );
  const verifierTraceCoverage = average(
    results.map((item) => (item.result?.verifierTraces.length ? 1 : 0))
  );
  const policyComplianceRate = average(
    results.map((item) => {
      const result = item.result;
      if (!result) {
        return 0;
      }
      return result.firstWrongStep && result.policyDecision.allowedContent.canShowFullSolution
        ? 0
        : 1;
    })
  );

  return {
    totalCases,
    firstWrongStepAccuracy: round(firstWrongStepAccuracy),
    misconceptionAtomAccuracy: round(misconceptionAtomAccuracy),
    strictCheckAccuracy: round(strictCheckAccuracy),
    humanReviewRate: round(humanReviewRate),
    verifierTraceCoverage: round(verifierTraceCoverage),
    policyComplianceRate: round(policyComplianceRate),
  };
}

export function buildMarkdownTable(results: EvaluationCaseResult[]) {
  const rows = [
    "| Case | Topic | Passed | Failures |",
    "| --- | --- | --- | --- |",
    ...results.map((item) => {
      const failures = item.failures.length
        ? item.failures.join("; ").replaceAll("|", "\\|")
        : "-";
      return `| ${item.caseId} | ${item.topic} | ${item.passed ? "yes" : "no"} | ${failures} |`;
    }),
  ];
  return rows.join("\n");
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number) {
  return Number(value.toFixed(3));
}
