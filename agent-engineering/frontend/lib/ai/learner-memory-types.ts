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
