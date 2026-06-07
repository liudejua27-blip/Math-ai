import { notFound, redirect } from "next/navigation";
import { DiagnosisDetailPage } from "@/components/learning-workbench/diagnosis-detail-page";
import { getDiagnosisSessionDetail } from "@/lib/db/queries";
import { auth } from "../../(auth)/auth";

export default async function Page({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const [{ sessionId }, session] = await Promise.all([params, auth()]);

  if (!session?.user?.id) {
    redirect("/");
  }

  const detail = await getDiagnosisSessionDetail(sessionId, session.user.id).catch(
    () => null
  );

  if (!detail) {
    notFound();
  }

  return <DiagnosisDetailPage detail={detail} />;
}
