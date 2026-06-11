import { NextResponse } from "next/server";
import { generateWeeklyLearningReportsForAllUsers } from "@/lib/db/queries";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "unauthorized", message: "Invalid cron secret." },
      { status: 401 }
    );
  }

  const result = await generateWeeklyLearningReportsForAllUsers();
  return NextResponse.json({
    ok: true,
    ...result,
  });
}
