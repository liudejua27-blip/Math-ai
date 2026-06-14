import type { DraftOCRResult } from "./draft-ocr-types";
import type {
  MathDiagnosisResult,
  RecommendedNextAction,
} from "./math-diagnosis-types";

export type DraftOCRConfirmationState = {
  sampleId?: string;
  confirmedProblemText: string;
  confirmedStudentSteps: string;
  confirmedFormulaLatex: string[];
  studentEdits: NonNullable<DraftOCRResult["studentEdits"]>;
  readyForDiagnosis: boolean;
};

export type StudentDiagnosisFeedback = {
  chatId?: string | null;
  diagnosisSessionId?: string | null;
  draftOCRSampleId?: string | null;
  source: "tool_card" | "ocr_confirmation" | "inspector" | "history";
  firstWrongStepPredicted?: string | null;
  firstWrongStepConfirmed?: string | null;
  firstWrongAccepted?: boolean | null;
  diagnosisHelpful?: boolean | null;
  ocrHadError?: boolean | null;
  correctedLineCount?: number;
  feedbackNote?: string | null;
  payload?: Record<string, unknown>;
};

export type VisualExplanationOpenState = {
  open: boolean;
  kind: "function" | "geometry" | "html_card" | null;
  diagnosis?: MathDiagnosisResult;
};

export type TodayNextAction = {
  action: RecommendedNextAction;
  title: string;
  description: string;
  primaryLabel: string;
};
