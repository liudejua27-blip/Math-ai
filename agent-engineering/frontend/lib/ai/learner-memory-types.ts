export type AtomMastery = "weak" | "unstable" | "improving" | "stable";

export type AtomMemory = {
  atomId: string;
  label: string;
  exposureCount: number;
  errorCount: number;
  recurrenceRate30d: number;
  recurrenceRateLast10: number;
  transferRate: number;
  selfRepairRate: number;
  lastWrongProblemIds: string[];
  lastSuccessfulVariantIds: string[];
  mastery: AtomMastery;
  updatedAt?: string;
};

export type TopicMemory = {
  topicId:
    | "derivative"
    | "function_property"
    | "solid_geometry"
    | "analytic_geometry"
    | "sequence"
    | "inequality"
    | "probability"
    | "general";
  problemCount: number;
  correctCount: number;
  commonAtoms: string[];
  currentLevel: "basic" | "standard" | "advanced" | "exam";
};

export type StrategyMemory = {
  tendsToSkipDomainCheck: boolean;
  tendsToAvoidClassification: boolean;
  tendsToUseAnswerFirstReasoning: boolean;
  tendsToIgnoreEndpointComparison: boolean;
  tendsToMisreadGeometricConstraints: boolean;
  tendsToUseFormulaWithoutCondition: boolean;
  notes: string[];
};

export type LearnerMemoryDelta = {
  studentId: string;
  atomUpdates: AtomMemory[];
  topicUpdate: TopicMemory;
  strategyUpdate: StrategyMemory;
  summary: {
    updatedAtoms: string[];
    weakAtoms: string[];
    improvingAtoms: string[];
    recommendedPlan: string[];
  };
};

export type LearnerQuestionDifficulty =
  | "micro"
  | "standard"
  | "transfer"
  | "challenge";

export type LearnerExplanationStyle =
  | "micro_scaffold"
  | "socratic_standard"
  | "visual_first"
  | "variant_first";

export type LearnerRecurrenceRisk = "low" | "medium" | "high";

export type LearnerRecommendation = {
  nextProblem: {
    type:
      | "surface_variant"
      | "structure_variant"
      | "transfer_variant"
      | "geometry_lab"
      | "review_mix";
    title: string;
    prompt: string;
    targetAtoms: string[];
    difficulty: LearnerQuestionDifficulty;
    reason: string;
  };
  adaptiveTeaching: {
    questionDifficulty: LearnerQuestionDifficulty;
    explanationStyle: LearnerExplanationStyle;
    canShowFullSolution: boolean;
    fullSolutionReason: string;
  };
  reviewPlan: {
    shouldEnter: boolean;
    cadence: "none" | "tomorrow" | "three_day" | "weekly";
    nextCheckInAt?: string;
    predictedRecurrenceRisk: LearnerRecurrenceRisk;
    reason: string;
  };
  heartbeat: {
    enabled: boolean;
    message: string;
    nextCheckInAt?: string;
  };
  recurrencePrediction: {
    atomId: string | null;
    risk: LearnerRecurrenceRisk;
    score: number;
    factors: string[];
  };
};
