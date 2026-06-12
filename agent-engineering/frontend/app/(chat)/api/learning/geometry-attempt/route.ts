import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { saveGeometryAttempt } from "@/lib/db/queries";
import { getGeometryLevel } from "@/lib/geometry/geometry-levels";
import { evaluateGeometrySelection } from "@/lib/geometry/geometry-reasoning-engine";

const geometryAttemptSchema = z.object({
  levelId: z.string().trim().min(1).max(64),
  sceneSpecId: z.string().trim().max(128).nullable().optional(),
  targetAtoms: z.array(z.string().trim().min(1)).default([]),
  selectedRefs: z.array(z.string().trim().min(1)).default([]),
  correctCount: z.number().int().nonnegative(),
  passed: z.boolean(),
  reasonText: z.string().max(2000).optional(),
  correctionCompleted: z.boolean(),
  variantAttempted: z.boolean().default(false),
  variantSuccess: z.boolean().default(false),
  variantText: z.string().max(4000).optional(),
  diagnosisSessionId: z.string().uuid().nullable().optional(),
  remediationRecordId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in to save Geometry Lab progress." },
      { status: 401 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = geometryAttemptSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid geometry attempt request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const level = getGeometryLevel(parsed.data.levelId);
  const reasoningFeedback = level
    ? evaluateGeometrySelection({
        level,
        selectedRefs: parsed.data.selectedRefs,
      })
    : null;
  const correctCount =
    reasoningFeedback?.solvedTargetIds.length ?? parsed.data.correctCount;
  const passed = reasoningFeedback
    ? reasoningFeedback.missingTargetIds.length === 0 &&
      reasoningFeedback.wrongRefs.length === 0 &&
      parsed.data.passed
    : parsed.data.passed;
  const targetAtoms = [
    ...new Set([
      ...parsed.data.targetAtoms,
      ...(reasoningFeedback?.learnerMemorySignal.atomIds ?? []),
    ]),
  ];

  const result = await saveGeometryAttempt({
    userId: session.user.id,
    ...parsed.data,
    targetAtoms,
    correctCount,
    passed,
    metadata: {
      ...parsed.data.metadata,
      reasoningFeedback,
      stepAlignmentEvidence: reasoningFeedback?.stepAlignmentEvidence ?? [],
      learnerMemorySignal: reasoningFeedback?.learnerMemorySignal ?? null,
    },
  });
  return NextResponse.json({ ok: true, result });
}
