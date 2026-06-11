import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import type { DraftOCRResult } from "@/lib/ai/draft-ocr-types";
import { updateDraftOCRConfirmedSample } from "@/lib/db/queries";

const draftOCRConfirmationSchema = z.object({
  sampleId: z.string().uuid(),
  confirmedResult: z.object({
    id: z.string(),
    source: z.string(),
    status: z.string(),
    pageBlocks: z.array(z.unknown()),
    confidence: z.number(),
    lowConfidenceItems: z.array(z.unknown()),
    extractedProblemText: z.string(),
    extractedStudentSteps: z.string(),
    requiresStudentConfirmation: z.boolean(),
    confirmationPrompt: z.string(),
    warnings: z.array(z.string()),
  }).passthrough(),
});

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in to save OCR confirmation." },
      { status: 401 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = draftOCRConfirmationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid draft OCR confirmation.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const result = await updateDraftOCRConfirmedSample({
    userId: session.user.id,
    sampleId: parsed.data.sampleId,
    confirmedResult: parsed.data.confirmedResult as DraftOCRResult,
  });

  return NextResponse.json({ ok: true, result });
}
