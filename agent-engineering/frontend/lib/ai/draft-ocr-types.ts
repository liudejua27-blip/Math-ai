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
  rawImageCrop?: string;
  box?: DraftOCRBox;
};

export type DraftOCRLineItem = {
  id: string;
  order: number;
  text: string;
  confidence: number;
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

export type DraftOCRResult = {
  id: string;
  source: "paddleocr" | "paddleocr_mock" | "unavailable";
  status: "completed" | "needs_confirmation" | "failed";
  pageBlocks: DraftOCRPageBlock[];
  confidence: number;
  lowConfidenceItems: Array<{
    id: string;
    kind: "block" | "line" | "formula";
    confidence: number;
    reason: string;
  }>;
  extractedProblemText: string;
  extractedStudentSteps: string;
  requiresStudentConfirmation: boolean;
  confirmationPrompt: string;
  warnings: string[];
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
};

export type DraftOCRToolResult = DraftOCRResult | DraftOCRError;
