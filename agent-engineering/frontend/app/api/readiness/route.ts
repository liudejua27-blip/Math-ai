import { NextResponse } from "next/server";
import postgres from "postgres";
import { createClient } from "redis";

export const dynamic = "force-dynamic";

type ReadinessCheck = {
  ok: boolean;
  status: "ok" | "missing" | "degraded" | "error";
  message: string;
  detail?: unknown;
};

const requiredEnv = [
  "AUTH_SECRET",
  "POSTGRES_URL",
  "REDIS_URL",
  "DEEPSEEK_API_KEY",
  "MATH_AGENT_BACKEND_URL",
] as const;

const ossEnv = [
  "ALI_OSS_REGION",
  "ALI_OSS_BUCKET",
  "ALI_OSS_ACCESS_KEY_ID",
  "ALI_OSS_ACCESS_KEY_SECRET",
] as const;

export async function GET() {
  const checks: Record<string, ReadinessCheck> = {
    env: checkRequiredEnv(),
    oss: checkAliOssEnv(),
    postgres: await checkPostgres(),
    redis: await checkRedis(),
    deepseek: await checkDeepSeek(),
    pythonBackend: await checkPythonBackend(),
  };
  const ok = Object.values(checks).every((check) => check.ok);

  return NextResponse.json(
    {
      ok,
      service: "math-searag-learning-agent",
      timestamp: new Date().toISOString(),
      environment: process.env.ALI_DEPLOY_ENV ?? process.env.NODE_ENV ?? "unknown",
      productionTarget: "aliyun-cn-public-free",
      checks,
    },
    {
      status: ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function checkRequiredEnv(): ReadinessCheck {
  const missing = requiredEnv.filter((name) => !process.env[name]?.trim());
  return {
    ok: missing.length === 0,
    status: missing.length === 0 ? "ok" : "missing",
    message:
      missing.length === 0
        ? "Required production environment variables are configured."
        : `Missing required environment variables: ${missing.join(", ")}`,
    detail: { missing },
  };
}

function checkAliOssEnv(): ReadinessCheck {
  const missing = ossEnv.filter((name) => !process.env[name]?.trim());
  return {
    ok: missing.length === 0,
    status: missing.length === 0 ? "ok" : "missing",
    message:
      missing.length === 0
        ? "Aliyun OSS private storage is configured."
        : `Missing Aliyun OSS configuration: ${missing.join(", ")}`,
    detail: {
      missing,
      requiredFor: "private draft-paper images, raw crops, and user data deletion",
    },
  };
}

async function checkPostgres(): Promise<ReadinessCheck> {
  if (!process.env.POSTGRES_URL?.trim()) {
    return {
      ok: false,
      status: "missing",
      message: "POSTGRES_URL is not configured.",
    };
  }

  const sql = postgres(process.env.POSTGRES_URL, { max: 1 });
  try {
    await sql`select 1 as ok`;
    return { ok: true, status: "ok", message: "Postgres is reachable." };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      message: "Postgres readiness check failed.",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

async function checkRedis(): Promise<ReadinessCheck> {
  if (!process.env.REDIS_URL?.trim()) {
    return {
      ok: false,
      status: "missing",
      message: "REDIS_URL is not configured.",
    };
  }

  const client = createClient({ url: process.env.REDIS_URL });
  client.on("error", () => undefined);
  try {
    await client.connect();
    await client.ping();
    return { ok: true, status: "ok", message: "Redis is reachable." };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      message: "Redis readiness check failed.",
      detail: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.quit().catch(() => undefined);
  }
}

async function checkDeepSeek(): Promise<ReadinessCheck> {
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    return {
      ok: false,
      status: "missing",
      message: "DEEPSEEK_API_KEY is not configured.",
    };
  }

  const liveCheck = process.env.MATH_READINESS_DEEPSEEK_LIVE === "true";
  if (!liveCheck) {
    return {
      ok: true,
      status: "degraded",
      message:
        "DeepSeek API key is configured. Set MATH_READINESS_DEEPSEEK_LIVE=true to verify the /models endpoint during staging.",
    };
  }

  try {
    const response = await fetchWithTimeout(
      `${process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com"}/models`,
      {
        headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      }
    );
    return {
      ok: response.ok,
      status: response.ok ? "ok" : "error",
      message: response.ok
        ? "DeepSeek official API is reachable."
        : `DeepSeek API returned ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      message: "DeepSeek readiness check failed.",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function checkPythonBackend(): Promise<ReadinessCheck> {
  const baseUrl = process.env.MATH_AGENT_BACKEND_URL;
  if (!baseUrl?.trim()) {
    return {
      ok: false,
      status: "missing",
      message: "MATH_AGENT_BACKEND_URL is not configured.",
    };
  }

  try {
    const response = await fetchWithTimeout(`${baseUrl.replace(/\/$/, "")}/health`);
    if (!response.ok) {
      const legacy = await fetchWithTimeout(
        `${baseUrl.replace(/\/$/, "")}/api/health`
      );
      return {
        ok: legacy.ok,
        status: legacy.ok ? "ok" : "error",
        message: legacy.ok
          ? "Python backend is reachable through legacy /api/health."
          : `Python backend returned ${response.status}.`,
      };
    }

    return { ok: true, status: "ok", message: "Python backend is reachable." };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      message: "Python backend readiness check failed.",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timeout);
  }
}
