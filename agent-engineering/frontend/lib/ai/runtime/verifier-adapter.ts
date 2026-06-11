import type { MathDiagnosisRequest } from "../math-diagnosis-types";

export type RuntimeVerifierInput = Required<
  Pick<MathDiagnosisRequest, "problemText" | "studentSteps" | "confirmedEvidence">
>;

export type RuntimeVerifierBackendError = {
  error: "math_backend_unavailable";
  status?: number;
  message: string;
};

export type RuntimeVerifierResult =
  | Record<string, any>
  | RuntimeVerifierBackendError
  | null;

export type RuntimeVerifierAdapterContext = {
  signal?: AbortSignal;
};

export type RuntimeVerifierAdapter = {
  name: string;
  check(
    input: RuntimeVerifierInput,
    context?: RuntimeVerifierAdapterContext
  ): Promise<RuntimeVerifierResult>;
};

export function createPythonVerifierAdapter({
  backendUrl = process.env.MATH_AGENT_BACKEND_URL ?? "http://127.0.0.1:8008",
  enabled = process.env.MATH_PYTHON_VERIFIER_ENABLED !== "false",
  required = process.env.MATH_REQUIRE_PYTHON_VERIFIER === "true",
}: {
  backendUrl?: string;
  enabled?: boolean;
  required?: boolean;
} = {}): RuntimeVerifierAdapter {
  return {
    name: "python_verifier",
    async check(input, context) {
      if (!enabled) {
        return null;
      }

      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: context?.signal,
        body: JSON.stringify({
          problem_text: input.problemText,
          student_steps: input.studentSteps,
          confirmed_evidence: input.confirmedEvidence,
        }),
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        return null;
      });

      if (!response) {
        if (!required) {
          return null;
        }
        return {
          error: "math_backend_unavailable" as const,
          message:
            "Python verifier is required but unavailable. Start the Python backend or set MATH_REQUIRE_PYTHON_VERIFIER=false.",
        };
      }

      if (!response.ok) {
        if (!required) {
          return null;
        }
        return {
          error: "math_backend_unavailable" as const,
          status: response.status,
          message:
            "Python verifier returned an error. Check the Python backend logs.",
        };
      }

      return (await response.json()) as Record<string, any>;
    },
  };
}

export function isRuntimeVerifierBackendError(
  result: RuntimeVerifierResult
): result is RuntimeVerifierBackendError {
  return result?.error === "math_backend_unavailable";
}
