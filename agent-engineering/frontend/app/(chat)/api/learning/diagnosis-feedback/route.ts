import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { saveStudentDiagnosisFeedback } from "@/lib/db/queries";

const feedbackSchema = z.object({
  chatId: z.string().uuid().nullable().optional(),
  diagnosisSessionId: z.string().uuid().nullable().optional(),
  draftOCRSampleId: z.string().uuid().nullable().optional(),
  source: z
    .enum(["tool_card", "ocr_confirmation", "inspector", "history"])
    .default("tool_card"),
  firstWrongStepPredicted: z.string().trim().max(128).nullable().optional(),
  firstWrongStepConfirmed: z.string().trim().max(128).nullable().optional(),
  firstWrongAccepted: z.boolean().nullable().optional(),
  diagnosisHelpful: z.boolean().nullable().optional(),
  ocrHadError: z.boolean().nullable().optional(),
  correctedLineCount: z.number().int().min(0).default(0),
  feedbackNote: z.string().trim().max(1000).nullable().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message: "Sign in to save diagnosis feedback.",
      },
      { status: 401 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid diagnosis feedback request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const result = await saveStudentDiagnosisFeedback({
    userId: session.user.id,
    ...parsed.data,
  });

  return NextResponse.json({ ok: true, result });
}
