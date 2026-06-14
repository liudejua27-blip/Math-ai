export type DraftOCRBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DraftOCRFormulaItem = {
  id: string;
  latex: string;
  text: string;
  confidence: number;
  engine?: string;
  rawImageCrop?: string;
  box?: DraftOCRBox;
};

export type DraftOCRLineItem = {
  id: string;
  order: number;
  text: string;
  confidence: number;
  engine?: string;
  rawImageCrop?: string;
  box?: DraftOCRBox;
  formulaItems: DraftOCRFormulaItem[];
};

export type DraftOCRPageBlock = {
  id: string;
  type: "problem" | "student_step" | "formula" | "scratch" | "unknown";
  order: number;
  text: string;
  confidence: number;
  rawImageCrop?: string;
  box?: DraftOCRBox;
  lineItems: DraftOCRLineItem[];
};

export type DraftOCREngineReport = {
  id:
    | "pix2text"
    | "paddleocr"
    | "latex_ocr"
    | "marker"
    | "surya"
    | "olmocr"
    | "mock";
  label: string;
  status: "active" | "completed" | "unavailable" | "planned" | "failed";
  detail: string;
};

export type DraftOCRResult = {
  id: string;
  sampleId?: string;
  source:
    | "hybrid"
    | "pix2text"
    | "paddleocr"
    | "latex_ocr"
    | "paddleocr_mock"
    | "unavailable";
  status: "completed" | "needs_confirmation" | "failed";
  pageBlocks: DraftOCRPageBlock[];
  confidence: number;
  engineReports?: DraftOCREngineReport[];
  lowConfidenceItems: Array<{
    id: string;
    kind: "block" | "line" | "formula";
    confidence: number;
    reason: string;
  }>;
  extractedProblemText: string;
  extractedStudentSteps: string;
  confirmedProblemText?: string;
  confirmedStudentSteps?: string;
  confirmedFormulaLatex?: string[];
  studentEdits?: Array<{
    itemId: string;
    kind: "problem" | "student_step" | "formula" | "line" | "block";
    before: string;
    after: string;
  }>;
  ocrAnnotations?: Array<{
    itemId: string;
    ocrWasWrong: boolean;
    actualStepLabel?: string;
    isFirstWrongStep?: boolean;
    note?: string;
  }>;
  confirmedFirstWrongStep?: string;
  readyForDiagnosis?: boolean;
  requiresStudentConfirmation: boolean;
  confirmationPrompt: string;
  warnings: string[];
  dataFlywheel?: {
    sampleId?: string;
    sourceImageUrl?: string;
    rawCropCount?: number;
    lowConfidenceCount?: number;
    issueTags?: string[];
  };
};

export type DraftOCRRequest = {
  imageUrl?: string;
  imageBase64?: string;
  fileName?: string;
  mimeType?: string;
};

export type DraftOCRError = {
  error: "draft_ocr_unavailable" | "bad_request";
  message: string;
  status?: number;
  engineReports?: DraftOCREngineReport[];
};

export type DraftOCRToolResult = DraftOCRResult | DraftOCRError;
