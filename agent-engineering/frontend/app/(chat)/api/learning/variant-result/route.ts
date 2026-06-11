import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { recordRemediationResult } from "@/lib/db/queries";

const variantResultSchema = z.object({
  atomIds: z.array(z.string().trim().min(1)).default([]),
  variantLevel: z.number().int().min(1).max(4),
  variantText: z.string().trim().min(1).max(4000),
  transferSuccess: z.boolean(),
  remediationRecordId: z.string().uuid().nullable().optional(),
  diagnosisSessionId: z.string().uuid().nullable().optional(),
  result: z.string().trim().max(64).optional(),
});

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in to save variant progress." },
      { status: 401 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = variantResultSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid variant result request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const result = await recordRemediationResult({
    userId: session.user.id,
    ...parsed.data,
  });
  return NextResponse.json({ ok: true, result });
}
