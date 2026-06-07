export type VariantLevel = 1 | 2 | 3 | 4;

export type VariantTrainingItem = {
  atomId: string;
  atomLabel: string;
  level: VariantLevel;
  title: string;
  prompt: string;
  purpose: string;
};

export type RemediationPlan = {
  sourceAtoms: string[];
  nextStep: "repair_first_wrong_step" | "practice_variants" | "geometry_lab";
  items: VariantTrainingItem[];
  masteryImpact: "low" | "medium" | "high";
};

export type VariantTransferRecord = {
  studentId: string;
  sourceProblemId: string;
  sourceAtomId: string;
  variantId: string;
  variantLevel: VariantLevel;
  correct: boolean;
  firstWrongStep?: string;
  newAtoms?: string[];
  verifierPassed: boolean;
  completedAt: string;
};
