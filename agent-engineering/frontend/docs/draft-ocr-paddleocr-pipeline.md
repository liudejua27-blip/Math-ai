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
        engine
        rawImageCrop?
  confidence
  engineReports[]
  lowConfidenceItems[]
  extractedProblemText
  extractedStudentSteps
  requiresStudentConfirmation
```

## Engine Chain

The first production chain is:

```text
Pix2Text -> PaddleOCR -> LaTeX-OCR -> DraftOCRResult -> student confirmation -> Step Alignment
```

- Pix2Text: mixed text/formula OCR for draft-paper screenshots.
- PaddleOCR: Chinese OCR, line detection, and robust text extraction.
- LaTeX-OCR: formula-only fallback and LaTeX enrichment.
- Marker / Surya / olmOCR: reserved as full-page layout and Markdown extraction adapters after the first draft OCR loop is stable.

## Runtime Flow

1. Student uploads or pastes an image.
2. Frontend calls `/api/draft-ocr`.
3. Next.js forwards the request to Python `/api/draft-ocr`.
4. Python backend runs the configured OCR engine chain.
5. OCR result is shown as a confirmation card with engine reports.
6. Low-confidence text/formulas do not trigger diagnosis automatically.
7. After the student confirms, the extracted problem and steps are inserted into the composer.
8. The normal Math-SEARAG diagnosis tool then handles Step Alignment, VerifierTrace, SocraticPolicy, LearnerMemory, and variants.

## Production Notes

- Install `pix2text`, `paddleocr`, compatible `paddlepaddle`, `pix2tex`, and `Pillow` in the Python backend environment.
- Use `MATH_DRAFT_OCR_ENGINES=pix2text,paddleocr,latex_ocr` as the default chain.
- Keep `MATH_REQUIRE_DRAFT_OCR=false` until the PaddleOCR service is stable.
- Use `MATH_DRAFT_OCR_MOCK=true` only for backend tests or demos.
- Store raw image crops only when privacy policy and storage retention are ready.
- Low confidence should always route through student confirmation or teacher review.

## Agent Capability References

- LeanAgent / Prover-Agent: study verifier feedback loops and trace-guided correction.
- MathVerse / MATH-Vision: use as inspiration for multimodal math reasoning evals.
- Commercial differentiator: draft-paper step recognition plus first-wrong-step localization plus VerifierTrace.
