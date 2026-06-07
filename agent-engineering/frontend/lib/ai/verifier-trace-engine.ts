import type { MathDiagnosisResult } from "./math-diagnosis-types";
import type { VerifierTrace } from "./verifier-trace-types";

type RawDiagnosis = Record<string, any>;

type TraceInput = {
  strictChecks: MathDiagnosisResult["strictChecks"];
  pythonVerifier?: RawDiagnosis | null;
};

export function buildVerifierTraces({
  strictChecks,
  pythonVerifier,
}: TraceInput): VerifierTrace[] {
  const traces = strictChecks.map((check, index) =>
    strictCheckToTrace(check, index)
  );

  if (!pythonVerifier?.verification) {
    return [
      ...traces,
      {
        id: "VT-PY-0",
        claim: "Python verifier result",
        claimType: "proof_step",
        verifier: "not_checked",
        status: "not_checked",
        evidenceIds: ["V1"],
        failureReason: "Python verifier is optional and was not available.",
        confidence: 0,
      },
    ];
  }

  const verification = pythonVerifier.verification;
  if (Array.isArray(verification.checks)) {
    return [
      ...traces,
      ...verification.checks.map((check: any, index: number) => ({
        id: `VT-PY-${index + 1}`,
        claim: String(check.name ?? check.claim ?? "Python verifier claim"),
        claimType: inferClaimType(String(check.name ?? check.claim ?? "")),
        verifier: inferPythonVerifier(String(check.name ?? "")),
        status: check.passed ? "pass" : "fail",
        evidenceIds: ["V1"],
        failureReason: check.passed
          ? undefined
          : String(check.reason ?? verification.message ?? "Python verifier failed."),
        confidence: check.passed ? 0.9 : 0.72,
      })),
    ];
  }

  return [
    ...traces,
    {
      id: "VT-PY-1",
      claim: String(verification.message ?? "Python verifier summary"),
      claimType: "proof_step",
      verifier: "sympy",
      status: verification.passed ? "pass" : "warn",
      evidenceIds: ["V1"],
      failureReason: verification.passed
        ? undefined
        : String(verification.message ?? "Python verifier did not fully pass."),
      confidence: verification.passed ? 0.86 : 0.55,
    },
  ];
}

function strictCheckToTrace(
  check: MathDiagnosisResult["strictChecks"][number],
  index: number
): VerifierTrace {
  const status = check.status === "pass" ? "pass" : check.status;
  return {
    id: `VT-TS-${index + 1}`,
    claim: check.label || check.id,
    claimType: inferClaimType(`${check.id} ${check.label} ${check.reason}`),
    verifier: "typescript_strict_gate",
    status,
    evidenceIds: [check.id || `Q${index + 1}`, "V1"],
    failureReason: status === "pass" ? undefined : check.reason,
    confidence: status === "pass" ? 0.88 : status === "fail" ? 0.68 : 0.52,
  };
}

function inferClaimType(text: string): VerifierTrace["claimType"] {
  const normalized = text.toLowerCase();
  if (/(derivative|导数|求导|f')/.test(normalized)) {
    return "derivative";
  }
  if (/(domain|定义域)/.test(normalized)) {
    return "domain";
  }
  if (/(monotonicity|单调)/.test(normalized)) {
    return "monotonicity";
  }
  if (/(endpoint|端点|边界)/.test(normalized)) {
    return "endpoint";
  }
  if (/(classification|分类|参数)/.test(normalized)) {
    return "classification";
  }
  if (/(geometry|几何|投影|垂足|二面角|截面)/.test(normalized)) {
    return "geometry_relation";
  }
  if (/(substitution|代入)/.test(normalized)) {
    return "substitution";
  }
  if (/(equivalence|等价|变形)/.test(normalized)) {
    return "equivalence";
  }
  return "proof_step";
}

function inferPythonVerifier(name: string): VerifierTrace["verifier"] {
  if (/sampling|numeric/i.test(name)) {
    return "numeric_sampling";
  }
  if (/geometry|几何/i.test(name)) {
    return "geometry_constraint";
  }
  return "sympy";
}
