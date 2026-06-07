import type { GeometryAttempt, GeometryLevel } from "./geometry-scene-types";

export type GeometryAssessmentResult = {
  passed: boolean;
  targetCorrectCount: number;
  requiredTargetCount: number;
  evidenceCorrect: boolean;
  reasoningCorrect: boolean;
  misconceptionAtoms: string[];
  score: number;
};

export function assessGeometryAttempt(
  level: GeometryLevel,
  attempt: GeometryAttempt
): GeometryAssessmentResult {
  const selectedRefs = new Set(
    attempt.actions.flatMap((action) => action.refIds ?? [])
  );
  const correctTargets = level.scene.targets.filter((target) =>
    target.correctRefs.some((refId) => selectedRefs.has(refId))
  );
  const missingTargets = level.scene.targets.filter(
    (target) => !correctTargets.includes(target)
  );
  const required = level.scene.assessment.passRule;
  const evidenceCorrect = required.requireEvidence
    ? attempt.selectedEvidenceIds.length > 0
    : true;
  const reasoningCorrect = required.requireReason
    ? attempt.reasoningCorrect
    : true;
  const targetCorrectCount = correctTargets.length;
  const passed =
    targetCorrectCount >= required.minCorrectTargets &&
    evidenceCorrect &&
    reasoningCorrect;
  const misconceptionAtoms = [
    ...new Set([
      ...attempt.misconceptionAtoms,
      ...missingTargets.flatMap((target) => target.misconceptionIfWrong),
    ]),
  ];
  const score = Math.round(
    (targetCorrectCount / Math.max(1, level.scene.targets.length)) * 70 +
      (evidenceCorrect ? 15 : 0) +
      (reasoningCorrect ? 15 : 0)
  );

  return {
    passed,
    targetCorrectCount,
    requiredTargetCount: required.minCorrectTargets,
    evidenceCorrect,
    reasoningCorrect,
    misconceptionAtoms,
    score,
  };
}
