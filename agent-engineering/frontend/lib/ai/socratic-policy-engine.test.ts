import assert from "node:assert/strict";
import { decideSocraticPolicy } from "./socratic-policy-engine";

const baseDiagnosis = {
  firstWrongStep: "S2",
  needHumanReview: false,
  misconceptionAtoms: [
    {
      id: "A07",
      label: "定义域意识弱",
      level: "高风险",
      description: "没有先检查定义域。",
    },
  ],
  recommendedGeometryLabs: [],
};

const noSteps = decideSocraticPolicy({
  problemText: "已知 f(x)=lnx，求导。",
  studentSteps: "",
});
assert.equal(noSteps.mode, "request_steps");
assert.equal(noSteps.allowedContent.canShowFirstWrongStep, false);
assert.equal(noSteps.allowedContent.canShowFullSolution, false);

const firstWrong = decideSocraticPolicy({
  problemText: "已知 f(x)=xlnx-ax。",
  studentSteps: "S1: f'(x)=lnx+1-a\nS2: 直接说一定有极小值。",
  diagnosis: baseDiagnosis,
});
assert.equal(firstWrong.mode, "first_wrong_step");
assert.equal(firstWrong.allowedContent.canShowFirstWrongStep, true);
assert.equal(firstWrong.allowedContent.canShowFullSolution, false);

const review = decideSocraticPolicy({
  problemText: "含参导数题。",
  studentSteps: "S1: 直接代入。",
  diagnosis: { ...baseDiagnosis, needHumanReview: true },
});
assert.equal(review.mode, "human_review");

const scaffold = decideSocraticPolicy({
  problemText: "含参导数题。",
  studentSteps: "S1: 直接代入。",
  diagnosis: baseDiagnosis,
  attemptContext: { consecutiveFailures: 2 },
});
assert.equal(scaffold.mode, "micro_scaffold");

const variant = decideSocraticPolicy({
  problemText: "含参导数题。",
  studentSteps: "S1: 已订正。",
  diagnosis: baseDiagnosis,
  attemptContext: { correctionCompleted: true },
});
assert.equal(variant.mode, "generate_variant");

console.log("socratic-policy-engine tests passed");
