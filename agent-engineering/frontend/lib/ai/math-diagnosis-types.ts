import type { GeometryLabRecommendation } from "../geometry/geometry-scene-types";
import type { SocraticPolicyDecision } from "./socratic-policy-engine";
import type { LearnerMemoryDelta } from "./learner-memory-types";
import type { RemediationPlan } from "./remediation-loop-types";
import type { VerifierTrace } from "./verifier-trace-types";

export type TeachingStyle = "socratic";

export type VisualMode = "html_card";

export type MathDiagnosisRequest = {
  problemText: string;
  studentSteps: string;
  studentId?: string;
  chatId?: string;
  confirmedEvidence?: string[];
  teachingStyle?: TeachingStyle;
  visualMode?: VisualMode;
  attemptContext?: {
    consecutiveFailures?: number;
    correctionCompleted?: boolean;
  };
};

export type HtmlMathCardSpec = {
  type: "html_card";
  title: string;
  blocks: Array<
    | { kind: "problem"; text: string }
    | {
        kind: "wrong_step";
        stepId: string;
        text: string;
        evidenceIds: string[];
      }
    | { kind: "socratic_question"; text: string }
    | {
        kind: "correction_step";
        text: string;
        latex?: string;
        evidenceIds: string[];
      }
    | { kind: "thinking_graph"; graph: MathThinkingGraphSpec }
    | { kind: "variant"; title: string; text: string }
  >;
};

export type ClaimTrace = {
  id: string;
  stepId: string;
  sentence: string;
  expression: string | null;
  claimType:
    | "equivalence_transform"
    | "condition_omission"
    | "domain"
    | "classification"
    | "monotonicity_extremum"
    | "derivative_geometric_meaning"
    | "sequence_recursion_induction"
    | "conic_condition_transform"
    | "trig_identity_transform"
    | "probability_reading"
    | "geometry_vector_method_mismatch"
    | "geometry_relation"
    | "proof_step";
  status: "pass" | "fail" | "warn" | "not_checked";
  atomIds: string[];
  strictCheckIds: string[];
  reason: string;
  confidence: number;
};

export type StepAlignmentDetail = {
  stepId: string;
  sentence: string;
  expression: string | null;
  status: "pass" | "fail" | "warn" | "not_checked";
  firstErrorClaimId: string | null;
  claims: ClaimTrace[];
};

export type StepVerificationSignal =
  | "strict_gate"
  | "claim_trace"
  | "equivalence_gap"
  | "condition_gap"
  | "ocr_noise"
  | "formal_adapter"
  | "human_label";

export type StepWrongCandidate = {
  id: string;
  stepId: string;
  claimId: string | null;
  sentence: string;
  expression: string | null;
  claimType: ClaimTrace["claimType"];
  signals: StepVerificationSignal[];
  score: number;
  calibratedConfidence: number;
  reasons: string[];
  needsHumanLabel: boolean;
};

export type StepVerifierDecision = {
  source: "typescript_step_verifier";
  selectedStepId: string | null;
  selectedClaimId: string | null;
  calibratedConfidence: number;
  reliability: "high" | "medium" | "low";
  candidates: StepWrongCandidate[];
  feedbackSample?: StepVerifierFeedbackSample;
  notes: string[];
};

export type StepVerifierFeedbackSample = {
  sampleId: string;
  problemText: string;
  studentSteps: string;
  predictedStepId: string | null;
  predictedClaimId: string | null;
  candidateStepIds: string[];
  labelStatus: "needs_label" | "confirmed" | "rejected";
  suggestedLabelFields: Array<
    | "correctFirstWrongStep"
    | "correctClaimId"
    | "misconceptionAtoms"
    | "missingCondition"
    | "equivalenceJustification"
  >;
};

export type VerifierTierLevel = "light" | "domain" | "formal";

export type LayeredVerifierCheck = {
  id: string;
  claim: string;
  status: "pass" | "fail" | "warn" | "not_checked";
  confidence: number;
  evidenceIds: string[];
  reason: string;
};

export type VerifierTierReport = {
  tier: VerifierTierLevel;
  verifier:
    | "sympy_numeric_geometry"
    | "high_school_domain_verifier"
    | "lean4_formal_adapter";
  status: "pass" | "fail" | "warn" | "not_checked";
  checks: LayeredVerifierCheck[];
  summary: string;
};

export type FormalReviewPlan = {
  shouldRun: boolean;
  adapter: "lean4";
  reason: string;
  candidateClaims: string[];
  auxiliaryLemmaHints: string[];
  knowledgeRetrievalHints: string[];
};

export type LayeredVerifierReport = {
  source: "layered_verifier_engine";
  overallStatus: "pass" | "fail" | "warn" | "not_checked";
  tiers: VerifierTierReport[];
  formalReviewPlan: FormalReviewPlan;
  knowledgeEvolution: {
    source: "leanagent_inspired";
    reusableLemmaHints: string[];
    curriculumTags: string[];
    retrievalHints: string[];
  };
  notes: string[];
};

export type LearnerMemoryGuidance = {
  nextProblemRecommendation: string;
  questionDifficulty: "micro" | "standard" | "transfer" | "challenge";
  explanationStyle:
    | "micro_scaffold"
    | "socratic_standard"
    | "visual_first"
    | "variant_first";
  variantLevel: 1 | 2 | 3 | 4;
  canShowFullSolution: boolean;
  shouldTriggerReviewPlan: boolean;
  targetAtoms: string[];
  reason: string;
};

export type MathThinkingGraphSpec = {
  type: "math_thinking_graph";
  title: string;
  nodes: Array<{
    id: string;
    label: string;
    kind:
      | "problem"
      | "step"
      | "evidence"
      | "check"
      | "atom"
      | "variant";
    status?: "pass" | "fail" | "warn" | "neutral";
    description?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    label?: string;
    kind?: "supports" | "fails" | "causes" | "trains";
  }>;
};

export type MathDiagnosisResult = {
  jobId: string;
  firstWrongStep: string | null;
  firstWrongReason: string | null;
  confidence: number;
  needHumanReview: boolean;
  misconceptionAtoms: Array<{
    id: string;
    label: string;
    level: string;
    description: string;
  }>;
  evidenceNodes: Array<{
    id: string;
    type: string;
    text: string;
    confidence: number;
  }>;
  strictChecks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail" | "warn";
    reason: string;
  }>;
  socraticQuestions: string[];
  policyDecision: SocraticPolicyDecision;
  verifierTraces: VerifierTrace[];
  layeredVerifierReport?: LayeredVerifierReport;
  stepAlignmentDetails?: StepAlignmentDetail[];
  claimTraces?: ClaimTrace[];
  stepVerifierDecision?: StepVerifierDecision;
  learnerMemoryDelta?: LearnerMemoryDelta;
  learnerMemoryGuidance?: LearnerMemoryGuidance;
  remediationPlan?: RemediationPlan;
  thinkingGraph: MathThinkingGraphSpec;
  correctionCard: HtmlMathCardSpec;
  recommendedGeometryLabs?: GeometryLabRecommendation[];
  variants: Array<{ title: string; tag: string; text: string }>;
};

export type MathDiagnosisToolResult =
  | MathDiagnosisResult
  | {
      error: "missing_student_steps" | "math_backend_unavailable";
      message: string;
      status?: number;
      policyDecision?: SocraticPolicyDecision;
      correctionCard?: HtmlMathCardSpec;
    };
