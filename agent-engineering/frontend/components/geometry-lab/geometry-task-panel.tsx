"use client";

import type { GeometrySceneSpec } from "@/lib/geometry/geometry-scene-types";
import { cn } from "@/lib/utils";

type GeometryTaskPanelProps = {
  scene: GeometrySceneSpec;
  selectedRefs: string[];
  reasonText: string;
  setReasonText: (value: string) => void;
  onSelectRef: (refId: string) => void;
};

export function GeometryTaskPanel({
  scene,
  selectedRefs,
  reasonText,
  setReasonText,
  onSelectRef,
}: GeometryTaskPanelProps) {
  const selected = new Set(selectedRefs);

  return (
    <section className="border-border border-b p-4">
      <div className="font-semibold text-sm">任务</div>
      <div className="mt-3 grid gap-3">
        {scene.targets.map((target) => {
          const solved = target.correctRefs.some((refId) => selected.has(refId));
          return (
            <div
              className="rounded-md border border-border bg-background p-3"
              key={target.id}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-sm">{target.prompt}</div>
                <span
                  className={cn(
                    "shrink-0 rounded px-2 py-1 text-xs",
                    solved
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {solved ? "已命中" : target.type}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {target.correctRefs.map((refId) => (
                  <button
                    className={cn(
                      "rounded border px-2 py-1 text-xs",
                      selected.has(refId)
                        ? "border-cyan-400 bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-50"
                        : "border-border bg-muted/35"
                    )}
                    key={refId}
                    onClick={() => onSelectRef(refId)}
                    type="button"
                  >
                    {refId}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <label className="mt-4 block">
        <span className="font-medium text-sm">几何依据</span>
        <textarea
          className="mt-2 min-h-24 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-400"
          onChange={(event) => setReasonText(event.target.value)}
          placeholder="例如：A1 在底面 ABCD 上的射影是 A，所以 A1C 与底面的线面角转化为 A1C 与 AC 的夹角。"
          value={reasonText}
        />
      </label>
    </section>
  );
}
