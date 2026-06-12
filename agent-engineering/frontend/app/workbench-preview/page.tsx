import { WorkbenchPreviewPage } from "@/components/learning-workbench/workbench-preview-page";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<div className="flex h-dvh bg-background" />}>
      <WorkbenchPreviewPage />
    </Suspense>
  );
}
