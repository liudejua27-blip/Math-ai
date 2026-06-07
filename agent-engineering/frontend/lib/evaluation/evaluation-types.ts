import type { MathDiagnosisResult } from "../ai/math-diagnosis-types";

export type EvaluationCase = {
  id: string;
  topic: "derivative" | "quadratic" | "solid_geometry";
  problemText: string;
  studentSteps: string;
  expected: {
    firstWrongStep?: string;
    atomIds: string[];
    failedCheckLabels: string[];
    allowHumanReview?: boolean;
  };
};

export type EvaluationCaseResult = {
  caseId: string;
  topic: EvaluationCase["topic"];
  passed: boolean;
  result?: MathDiagnosisResult;
  failures: string[];
};

export type EvaluationMetrics = {
  totalCases: number;
  firstWrongStepAccuracy: number;
  misconceptionAtomAccuracy: number;
  strictCheckAccuracy: number;
  humanReviewRate: number;
  verifierTraceCoverage: number;
  policyComplianceRate: number;
};

export type EvaluationReport = {
  generatedAt: string;
  metrics: EvaluationMetrics;
  cases: EvaluationCaseResult[];
  markdownTable: string;
};
