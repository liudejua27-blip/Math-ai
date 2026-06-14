import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { exportUserPrivacyData } from "@/lib/db/queries";

export async function POST() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "请先登录后再导出数据。" },
      { status: 401 }
    );
  }

  const exported = await exportUserPrivacyData({ userId: session.user.id });
  if (!exported) {
    return NextResponse.json(
      {
        error: "database_unavailable",
        message: "当前未配置数据库，无法导出用户数据。",
      },
      { status: 503 }
    );
  }

  return NextResponse.json(exported, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="math-searag-data-${session.user.id}.json"`,
    },
  });
}
