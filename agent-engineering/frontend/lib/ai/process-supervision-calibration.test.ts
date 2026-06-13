import assert from "node:assert/strict";
import { calibrateWithProcessSupervision } from "./process-supervision-calibration";
import type { StepWrongCandidate } from "./math-diagnosis-types";

const candidates: StepWrongCandidate[] = [
  {
    id: "SWC-1",
    stepId: "S1",
    claimId: "C1",
    sentence: "S1: square both sides without checking domain",
    expression: "x^2 = a",
    claimType: "equivalence_transform",
    signals: ["claim_trace"],
    score: 0.58,
    calibratedConfidence: 0,
    reasons: ["equivalence transform may add roots"],
    needsHumanLabel: false,
  },
  {
    id: "SWC-2",
    stepId: "S2",
    claimId: "C2",
    sentence: "S2: continue calculation",
    expression: "x = sqrt(a)",
    claimType: "proof_step",
    signals: ["strict_gate"],
    score: 0.56,
    calibratedConfidence: 0,
    reasons: ["strict gate failed later"],
    needsHumanLabel: false,
  },
];

const result = calibrateWithProcessSupervision({ candidates });
assert.equal(result.source, "openr_inspired_process_supervision");
assert.equal(result.candidates[0].stepId, "S1");
assert.ok(result.candidates[0].signals.includes("equivalence_gap"));
assert.ok(result.candidates[0].calibratedConfidence > result.candidates[1].calibratedConfidence);

const labeled = calibrateWithProcessSupervision({
  candidates,
  humanLabels: [{ stepId: "S2", claimId: "C2", accepted: true }],
});
assert.equal(labeled.candidates[0].stepId, "S2");
assert.ok(labeled.candidates[0].calibratedConfidence >= 0.7);

console.log("process-supervision-calibration tests passed");
