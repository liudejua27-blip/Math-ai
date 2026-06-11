"use client";

import { useState } from "react";
import type { GeometrySceneSpec } from "@/lib/geometry/geometry-scene-types";
import { GeometrySceneRenderer } from "./geometry-scene-renderer";
import { GeometryR3FScene } from "./geometry-r3f-scene";

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
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");

  return (
    <section className="min-h-0 border-border border-r bg-background">
      <div className="flex h-12 items-center justify-between border-border border-b px-4">
        <div>
          <div className="font-semibold text-sm">{displayTitle}</div>
          <div className="text-muted-foreground text-xs">
            {scene.template} · GeometrySceneSpec v{scene.version}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-md border border-border bg-muted/40 p-0.5 text-xs">
            <button
              className={
                viewMode === "3d"
                  ? "rounded bg-background px-2 py-1 shadow-sm"
                  : "px-2 py-1 text-muted-foreground"
              }
              onClick={() => setViewMode("3d")}
              type="button"
            >
              3D
            </button>
            <button
              className={
                viewMode === "2d"
                  ? "rounded bg-background px-2 py-1 shadow-sm"
                  : "px-2 py-1 text-muted-foreground"
              }
              onClick={() => setViewMode("2d")}
              type="button"
            >
              2D
            </button>
          </div>
          <div className="text-muted-foreground text-xs">
            已选 {selectedRefs.length} 个对象
          </div>
        </div>
      </div>
      <div className="p-4">
        {viewMode === "3d" ? (
          <GeometryR3FScene
            activeTimelineId={activeTimelineId}
            onSelectRef={onSelectRef}
            scene={scene}
            selectedRefs={selectedRefs}
          />
        ) : (
          <GeometrySceneRenderer
            activeTimelineId={activeTimelineId}
            onSelectRef={onSelectRef}
            scene={scene}
            selectedRefs={selectedRefs}
          />
        )}
      </div>
    </section>
  );
}
