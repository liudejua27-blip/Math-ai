import type {
  DraftOCRError,
  DraftOCRRequest,
  DraftOCRResult,
  DraftOCRToolResult,
} from "./draft-ocr-types";

export type DraftOCRAdapter = {
  name: string;
  recognize(input: DraftOCRRequest): Promise<DraftOCRToolResult>;
};

export function createPaddleOCRDraftAdapter({
  backendUrl = process.env.MATH_AGENT_BACKEND_URL ?? "http://127.0.0.1:8008",
  required = process.env.MATH_REQUIRE_DRAFT_OCR === "true",
}: {
  backendUrl?: string;
  required?: boolean;
} = {}): DraftOCRAdapter {
  return {
    name: "paddleocr_draft_adapter",
    async recognize(input) {
      const response = await fetch(`${backendUrl}/api/draft-ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBackendPayload(input)),
      }).catch(() => null);

      if (!response) {
        return fallbackUnavailable(required);
      }

      if (!response.ok) {
        if (!required) {
          return fallbackUnavailable(false, response.status);
        }
        return {
          error: "draft_ocr_unavailable",
          status: response.status,
          message:
            "PaddleOCR draft backend returned an error. Check the Python OCR service.",
        };
      }

      return normalizeDraftOCRResult(await response.json());
    },
  };
}

export function shouldBlockDiagnosisForDraftOCR(
  result: DraftOCRToolResult | null | undefined
) {
  return Boolean(
    result &&
      !("error" in result) &&
      result.requiresStudentConfirmation &&
      result.status === "needs_confirmation"
  );
}

function toBackendPayload(input: DraftOCRRequest) {
  return {
    image_url: input.imageUrl,
    image_base64: input.imageBase64,
    file_name: input.fileName,
    mime_type: input.mimeType,
  };
}

function normalizeDraftOCRResult(payload: unknown): DraftOCRResult | DraftOCRError {
  if (!payload || typeof payload !== "object") {
    return fallbackUnavailable(true);
  }

  if ("error" in payload) {
    const error = payload as DraftOCRError;
    return {
      error: error.error ?? "draft_ocr_unavailable",
      status: error.status,
      message: error.message ?? "Draft OCR failed.",
      engineReports: Array.isArray(error.engineReports)
        ? error.engineReports
        : [],
    };
  }

  const result = payload as DraftOCRResult;
  const confidence = clampConfidence(result.confidence);
  const lowConfidenceItems = Array.isArray(result.lowConfidenceItems)
    ? result.lowConfidenceItems
    : [];
  const requiresStudentConfirmation =
    result.requiresStudentConfirmation ??
    (confidence < 0.82 || lowConfidenceItems.length > 0);

  return {
    id: String(result.id ?? `draft-ocr-${Date.now()}`),
    sampleId: result.sampleId,
    source: result.source ?? "paddleocr",
    status: requiresStudentConfirmation ? "needs_confirmation" : "completed",
    pageBlocks: Array.isArray(result.pageBlocks) ? result.pageBlocks : [],
    confidence,
    engineReports: Array.isArray(result.engineReports)
      ? result.engineReports
      : [],
    lowConfidenceItems,
    extractedProblemText: String(result.extractedProblemText ?? ""),
    extractedStudentSteps: String(result.extractedStudentSteps ?? ""),
    confirmedProblemText: result.confirmedProblemText,
    confirmedStudentSteps: result.confirmedStudentSteps,
    confirmedFormulaLatex: Array.isArray(result.confirmedFormulaLatex)
      ? result.confirmedFormulaLatex
      : [],
    studentEdits: Array.isArray(result.studentEdits) ? result.studentEdits : [],
    ocrAnnotations: Array.isArray(result.ocrAnnotations)
      ? result.ocrAnnotations
      : [],
    confirmedFirstWrongStep: result.confirmedFirstWrongStep,
    readyForDiagnosis: result.readyForDiagnosis ?? !requiresStudentConfirmation,
    requiresStudentConfirmation,
    confirmationPrompt:
      result.confirmationPrompt ??
      "请先核对 OCR 识别出的题干、步骤和公式，再开始诊断。",
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
    dataFlywheel: result.dataFlywheel,
  };
}

function fallbackUnavailable(
  required: boolean,
  status?: number
): DraftOCRError | DraftOCRResult {
  if (required) {
    return {
      error: "draft_ocr_unavailable",
      status,
      message:
        "PaddleOCR draft backend is unavailable. Start the Python OCR backend before diagnosing draft images.",
    };
  }

  return {
    id: `draft-ocr-unavailable-${Date.now()}`,
    source: "unavailable",
    status: "needs_confirmation",
    pageBlocks: [],
    confidence: 0,
    lowConfidenceItems: [
      {
        id: "ocr-backend",
        kind: "block",
        confidence: 0,
        reason: "PaddleOCR backend unavailable.",
      },
    ],
    extractedProblemText: "",
    extractedStudentSteps: "",
    confirmedProblemText: "",
    confirmedStudentSteps: "",
    confirmedFormulaLatex: [],
    studentEdits: [],
    ocrAnnotations: [],
    confirmedFirstWrongStep: "",
    readyForDiagnosis: false,
    requiresStudentConfirmation: true,
    confirmationPrompt:
      "草稿纸 OCR 后端当前不可用。请手动输入题干和学生步骤后再诊断。",
    warnings: ["PaddleOCR backend unavailable."],
  };
}

function clampConfidence(value: unknown) {
  const numberValue = typeof value === "number" ? value : 0;
  return Math.max(0, Math.min(1, numberValue));
}
