"use client";

import { useMemo, useState } from "react";
import { GEOMETRY_LEVELS } from "@/lib/geometry/geometry-levels";
import { validateGeometrySceneSpec } from "@/lib/geometry/geometry-scene-validator";
import { GeometryAttemptSummary } from "./geometry-attempt-summary";
import { GeometryCanvas } from "./geometry-canvas";
import { GeometryEvidencePanel } from "./geometry-evidence-panel";
import { GeometryLevelMap } from "./geometry-level-map";
import { GeometryTaskPanel } from "./geometry-task-panel";
import { GeometryTimeline } from "./geometry-timeline";

type GeometryLabPageProps = {
  initialLevelId?: string;
};

export function GeometryLabPage({ initialLevelId }: GeometryLabPageProps) {
  const initialLevel =
    GEOMETRY_LEVELS.find((level) => level.levelId === initialLevelId) ??
    GEOMETRY_LEVELS[2];
  const [activeLevelId, setActiveLevelId] = useState(initialLevel.levelId);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const activeLevel = useMemo(
    () =>
      GEOMETRY_LEVELS.find((level) => level.levelId === activeLevelId) ??
      GEOMETRY_LEVELS[0],
    [activeLevelId]
  );
  const validation = validateGeometrySceneSpec(activeLevel.scene);

  function selectLevel(levelId: string) {
    setActiveLevelId(levelId);
    setSelectedRefs([]);
  }

  function toggleRef(refId: string) {
    setSelectedRefs((current) =>
      current.includes(refId)
        ? current.filter((item) => item !== refId)
        : [...current, refId]
    );
  }

  function focusRefs(refIds: string[]) {
    if (refIds.length === 0) {
      return;
    }
    setSelectedRefs((current) => [...new Set([...current, ...refIds])]);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(420px,1fr)_360px]">
        <GeometryLevelMap
          activeLevelId={activeLevel.levelId}
          levels={GEOMETRY_LEVELS}
          onSelectLevel={selectLevel}
        />

        <div className="grid min-h-screen grid-rows-[1fr_auto]">
          <GeometryCanvas
            onSelectRef={toggleRef}
            scene={activeLevel.scene}
            selectedRefs={selectedRefs}
          />
          <GeometryAttemptSummary
            level={activeLevel}
            selectedRefs={selectedRefs}
          />
        </div>

        <aside className="min-h-screen overflow-y-auto border-border border-l bg-muted/15">
          <div className="flex h-12 items-center justify-between border-border border-b px-4">
            <div>
              <div className="font-semibold text-sm">{activeLevel.title}</div>
              <div className="text-muted-foreground text-xs">
                {activeLevel.targetAtoms.join(" / ")}
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-xs">
              {validation.valid ? "Spec OK" : "Spec Error"}
            </span>
          </div>
          {!validation.valid && (
            <div className="border-red-200 border-b bg-red-50 p-3 text-red-800 text-xs">
              {validation.errors.join("；")}
            </div>
          )}
          <GeometryTaskPanel
            onSelectRef={toggleRef}
            scene={activeLevel.scene}
            selectedRefs={selectedRefs}
          />
          <GeometryTimeline onSelectRefs={focusRefs} scene={activeLevel.scene} />
          <GeometryEvidencePanel
            scene={activeLevel.scene}
            selectedRefs={selectedRefs}
          />
        </aside>
      </div>
    </main>
  );
}
