# Step Verifier Upgrade Notes

## Goal

Step Alignment should not be a single regex-like decision. It should keep several possible first-wrong-step candidates, score them, calibrate confidence, and send uncertain samples into human labeling.

## GitHub References

- OpenR: process-supervision style reasoning, where intermediate steps can be scored and searched instead of judging only the final answer.
- Safe: step-aware formal verification, where each student step is treated as a checkable claim and can later be connected to a formal verifier such as Lean.

This project does not copy either codebase. The current implementation keeps the product architecture TypeScript-first and adds adapter points for future PRM or Lean-based verification.

## Implemented

- `step-verifier-engine.ts`
  - builds multiple first-wrong-step candidates
  - scores strict-gate, claim-trace, equivalence-gap, condition-gap, OCR-noise, and formal-adapter signals
  - calibrates candidate confidence
  - emits `feedbackSample` for low-confidence, OCR-noisy, or close-margin decisions

- Workflow integration
  - StepVerifier runs after claim-level Step Alignment
  - it does not blindly override the base first-wrong-step
  - if StepVerifier disagrees with the base diagnosis, the result is marked for human review
  - `MathDiagnosisResult.stepVerifierDecision` is preserved for Inspector, evaluation, and future dataset building

## Next

- Persist `feedbackSample` into a dedicated human-label table.
- Add a PRM adapter that scores candidate claims using a small process reward model.
- Add a Lean/Safe-style formal adapter only for algebraic transformations that can be translated safely.
- Build dashboards for candidate disagreement rate, calibration error, and label correction rate.
