export type VerifierTrace = {
  id: string;
  claim: string;
  claimType:
    | "derivative"
    | "equivalence"
    | "substitution"
    | "domain"
    | "monotonicity"
    | "endpoint"
    | "classification"
    | "geometry_relation"
    | "proof_step";
  verifier:
    | "typescript_strict_gate"
    | "high_school_domain_verifier"
    | "lean_formal_adapter"
    | "sympy"
    | "numeric_sampling"
    | "geometry_constraint"
    | "human_review"
    | "not_checked";
  status: "pass" | "fail" | "warn" | "not_checked";
  evidenceIds: string[];
  failureReason?: string;
  confidence: number;
};
