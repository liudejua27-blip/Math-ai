import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { markCorrectionCompleted } from "@/lib/db/queries";

const correctionSchema = z.object({
  atomIds: z.array(z.string().trim().min(1)).default([]),
  diagnosisSessionId: z.string().uuid().nullable().optional(),
  remediationRecordId: z.string().uuid().nullable().optional(),
  source: z.enum(["workbench", "geometry_lab"]).default("workbench"),
});

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in to save correction progress." },
      { status: 401 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = correctionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid correction completion request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const result = await markCorrectionCompleted({
    userId: session.user.id,
    ...parsed.data,
  });
  return NextResponse.json({ ok: true, result });
}
