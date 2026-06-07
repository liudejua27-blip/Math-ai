import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import {
  mathDiagnosisRequestSchema,
  runMathDiagnosisWorkflow,
} from "@/lib/ai/math-diagnosis-workflow";

export const maxDuration = 60;

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = mathDiagnosisRequestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "bad_request",
        message: "Invalid math diagnosis request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const session = await auth().catch(() => null);
  const result = await runMathDiagnosisWorkflow({
    ...parsed.data,
    studentId: parsed.data.studentId ?? session?.user?.id,
  });
  return NextResponse.json(result);
}
