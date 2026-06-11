import { shouldBlockDiagnosisForDraftOCR } from "./draft-ocr-adapter";
import type { DraftOCRResult } from "./draft-ocr-types";

const lowConfidenceResult: DraftOCRResult = {
  id: "draft-1",
  source: "paddleocr",
  status: "needs_confirmation",
  pageBlocks: [],
  confidence: 0.71,
  lowConfidenceItems: [
    {
      id: "line-1",
      kind: "line",
      confidence: 0.71,
      reason: "low confidence",
    },
  ],
  extractedProblemText: "已知函数 f(x)=xlnx-ax。",
  extractedStudentSteps: "1. 令 f'(x)=lnx+1-a=0。",
  requiresStudentConfirmation: true,
  confirmationPrompt: "请确认",
  warnings: [],
};

if (!shouldBlockDiagnosisForDraftOCR(lowConfidenceResult)) {
  throw new Error("Low confidence OCR must block automatic diagnosis.");
}

if (
  shouldBlockDiagnosisForDraftOCR({
    ...lowConfidenceResult,
    status: "completed",
    confidence: 0.95,
    requiresStudentConfirmation: false,
    lowConfidenceItems: [],
  })
) {
  throw new Error("Confirmed high confidence OCR should not block diagnosis.");
}

console.log("draft-ocr-adapter tests passed");
