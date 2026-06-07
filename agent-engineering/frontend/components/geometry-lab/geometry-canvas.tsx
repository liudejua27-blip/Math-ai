"use client";

import type { GeometrySceneSpec } from "@/lib/geometry/geometry-scene-types";
import { GeometrySceneRenderer } from "./geometry-scene-renderer";

type GeometryCanvasProps = {
  scene: GeometrySceneSpec;
  displayTitle: string;
  selectedRefs: string[];
  activeTimelineId: string | null;
  onSelectRef: (refId: string) => void;
};

export function GeometryCanvas({
  scene,
  displayTitle,
  selectedRefs,
  activeTimelineId,
  onSelectRef,
}: GeometryCanvasProps) {
  return (
    <section className="min-h-0 border-border border-r bg-background">
      <div className="flex h-12 items-center justify-between border-border border-b px-4">
        <div>
          <div className="font-semibold text-sm">{displayTitle}</div>
          <div className="text-muted-foreground text-xs">
            {scene.template} · GeometrySceneSpec v{scene.version}
          </div>
        </div>
        <div className="text-muted-foreground text-xs">
          已选 {selectedRefs.length} 个对象
        </div>
      </div>
      <div className="p-4">
        <GeometrySceneRenderer
          activeTimelineId={activeTimelineId}
          onSelectRef={onSelectRef}
          scene={scene}
          selectedRefs={selectedRefs}
        />
      </div>
    </section>
  );
}
