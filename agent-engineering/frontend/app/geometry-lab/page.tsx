import { Suspense } from "react";
import { GeometryLabPage } from "@/components/geometry-lab/geometry-lab-page";

type GeometryLabRouteProps = {
  searchParams?: Promise<{ level?: string | string[] }>;
};

export default function Page(props: GeometryLabRouteProps) {
  return (
    <Suspense fallback={<div className="h-dvh bg-background" />}>
      <GeometryLabRoute {...props} />
    </Suspense>
  );
}

async function GeometryLabRoute({ searchParams }: GeometryLabRouteProps) {
  const params = await searchParams;
  const level = Array.isArray(params?.level) ? params?.level[0] : params?.level;

  return <GeometryLabPage initialLevelId={level} />;
}
