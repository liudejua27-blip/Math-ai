import { NextResponse } from "next/server";

const startedAt = new Date().toISOString();

export function GET() {
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
      pythonVerifierEnabled:
        process.env.MATH_PYTHON_VERIFIER_ENABLED !== "false",
      pythonVerifierRequired:
        process.env.MATH_REQUIRE_PYTHON_VERIFIER === "true",
    },
  });
}

