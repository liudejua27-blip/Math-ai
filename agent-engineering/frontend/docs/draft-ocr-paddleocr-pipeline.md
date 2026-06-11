# Draft OCR Pipeline

## Goal

Students can upload a draft-paper image. Math-SEARAG extracts the problem, written steps, and formulas, but low-confidence OCR must be confirmed by the student before diagnosis.

## Result Contract

`DraftOCRResult` is defined in `lib/ai/draft-ocr-types.ts`.

```text
DraftOCRResult
  pageBlocks[]
    lineItems[]
      formulaItems[]
        latex
        confidence
        rawImageCrop?
  confidence
  lowConfidenceItems[]
  extractedProblemText
  extractedStudentSteps
  requiresStudentConfirmation
```

## Runtime Flow

1. Student uploads or pastes an image.
2. Frontend calls `/api/draft-ocr`.
3. Next.js forwards the request to Python `/api/draft-ocr`.
4. Python backend uses PaddleOCR when installed.
5. OCR result is shown as a confirmation card.
6. Low-confidence text/formulas do not trigger diagnosis automatically.
7. After the student confirms, the extracted problem and steps are inserted into the composer.
8. The normal Math-SEARAG diagnosis tool then handles Step Alignment, VerifierTrace, SocraticPolicy, LearnerMemory, and variants.

## Production Notes

- Install `paddleocr` and the compatible `paddlepaddle` package in the Python backend environment.
- Keep `MATH_REQUIRE_DRAFT_OCR=false` until the PaddleOCR service is stable.
- Use `MATH_DRAFT_OCR_MOCK=true` only for backend tests or demos.
- Store raw image crops only when privacy policy and storage retention are ready.
- Low confidence should always route through student confirmation or teacher review.
