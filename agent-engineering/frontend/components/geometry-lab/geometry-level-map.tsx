"use client";

import type { GeometryLevel } from "@/lib/geometry/geometry-scene-types";
import { cn } from "@/lib/utils";

type GeometryLevelMapProps = {
  levels: GeometryLevel[];
  activeLevelId: string;
  onSelectLevel: (levelId: string) => void;
};

export function GeometryLevelMap({
  levels,
  activeLevelId,
  onSelectLevel,
}: GeometryLevelMapProps) {
  return (
    <aside className="border-border border-r bg-muted/25">
      <div className="flex h-12 items-center border-border border-b px-4">
        <div>
          <div className="font-semibold text-sm">Geometry Lab</div>
          <div className="text-muted-foreground text-xs">12 个可控空间训练关卡</div>
        </div>
      </div>
      <div className="grid gap-2 p-3">
        {levels.map((level) => (
          <button
            className={cn(
              "rounded-md border px-3 py-2 text-left text-sm transition",
              activeLevelId === level.levelId
                ? "border-cyan-400 bg-cyan-50 text-cyan-950 dark:bg-cyan-950/40 dark:text-cyan-50"
                : "border-border bg-background hover:border-cyan-300"
            )}
            key={level.levelId}
            onClick={() => onSelectLevel(level.levelId)}
            type="button"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{level.levelId}</span>
              <span className="text-muted-foreground text-xs">{level.chapter}</span>
            </div>
            <div className="mt-1 font-medium">{level.title}</div>
            <div className="mt-1 line-clamp-2 text-muted-foreground text-xs">
              {level.summary}
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
