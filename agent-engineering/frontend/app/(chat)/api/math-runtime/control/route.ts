import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getMathAgentRuntime,
  type MathAgentRuntimeControlAction,
} from "@/lib/ai/runtime/math-agent-runtime";

const controlSchema = z.object({
  runId: z.string().trim().min(1),
  action: z.enum([
    "interrupt",
    "resume",
    "approve_evidence",
    "reject_diagnosis",
    "request_human_review",
    "retry",
    "replay_trace",
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = controlSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid math runtime control request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  try {
    const runtime = getMathAgentRuntime();
    const record = runtime.controlRun(
      parsed.data.runId,
      parsed.data.action as MathAgentRuntimeControlAction,
      parsed.data.payload
    );
    return NextResponse.json({
      runId: record.runId,
      status: record.status,
      events: record.events,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "runtime_control_failed",
        message: error instanceof Error ? error.message : "Runtime control failed.",
      },
      { status: 404 }
    );
  }
}
