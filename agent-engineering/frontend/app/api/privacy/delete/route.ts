import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { deleteUserPrivacyData } from "@/lib/db/queries";

const deleteRequestSchema = z.object({
  confirm: z.literal("DELETE_MY_DATA"),
});

export async function POST(request: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先登录后再删除数据。" },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "confirmation_required",
        message: "删除账号和学习数据前，请提交 confirm=DELETE_MY_DATA。",
      },
      { status: 400 }
    );
  }

  const deleted = await deleteUserPrivacyData({ userId: session.user.id });
  if (!deleted) {
    return NextResponse.json(
      {
        error: "database_unavailable",
        message: "当前未配置数据库，无法删除用户数据。",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(deleted, {
    headers: { "Cache-Control": "no-store" },
  });
}
