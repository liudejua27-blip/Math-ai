import { NextResponse } from "next/server";

const startedAt = new Date().toISOString();
const requiredConfig = [
  "AUTH_SECRET",
  "AI_GATEWAY_API_KEY",
  "POSTGRES_URL",
  "REDIS_URL",
] as const;

function hasValue(name: (typeof requiredConfig)[number]) {
  return Boolean(process.env[name]?.trim());
}

export function GET() {
  const missingRequired = requiredConfig.filter((name) => !hasValue(name));
  const pythonVerifierRequired =
    process.env.MATH_REQUIRE_PYTHON_VERIFIER === "true";
  const pythonVerifierEnabled =
    process.env.MATH_PYTHON_VERIFIER_ENABLED !== "false";

  return NextResponse.json({
    ok: true,
    service: "math-searag-learning-agent",
    startedAt,
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    checks: {
      authSecretConfigured: Boolean(process.env.AUTH_SECRET),
      aiGatewayConfigured: Boolean(process.env.AI_GATEWAY_API_KEY),
      postgresConfigured: Boolean(process.env.POSTGRES_URL),
      redisConfigured: Boolean(process.env.REDIS_URL),
      mathBackendUrl:
        process.env.MATH_AGENT_BACKEND_URL ?? "http://127.0.0.1:8008",
      pythonVerifierEnabled,
      pythonVerifierRequired,
    },
    releaseReady: {
      minimumConfigReady: missingRequired.length === 0,
      missingRequired,
      warnings: [
        ...(!process.env.BLOB_READ_WRITE_TOKEN
          ? ["BLOB_READ_WRITE_TOKEN is recommended for persisted artifacts"]
          : []),
        ...(pythonVerifierRequired && !pythonVerifierEnabled
          ? ["MATH_REQUIRE_PYTHON_VERIFIER=true but verifier is disabled"]
          : []),
      ],
    },
  });
}
