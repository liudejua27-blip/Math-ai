"use client";

import type { getGeometryLevelDisplay } from "@/lib/geometry/geometry-learning-flow";
import type { GeometryLevel } from "@/lib/geometry/geometry-scene-types";
import { cn } from "@/lib/utils";

type GeometryAttemptSummaryProps = {
  level: GeometryLevel;
  display: ReturnType<typeof getGeometryLevelDisplay>;
  selectedRefs: string[];
  correctCount: number;
  passed: boolean;
  completed: boolean;
  variantOpen: boolean;
  onCompleteCorrection: () => void;
  onOpenVariant: () => void;
};

export function GeometryAttemptSummary({
  level,
  display,
  selectedRefs,
  correctCount,
  passed,
  completed,
  variantOpen,
  onCompleteCorrection,
  onOpenVariant,
}: GeometryAttemptSummaryProps) {
  const passRule = level.scene.assessment.passRule;

  return (
    <section className="border-border border-t bg-muted/25 px-4 py-3">
      <div className="grid gap-3 text-sm lg:grid-cols-[1fr_auto]">
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="目标命中" value={`${correctCount}/${level.scene.targets.length}`} />
          <Metric label="通过要求" value={`${passRule.minCorrectTargets} 个目标`} />
          <Metric label="训练状态" value={completed ? "已完成" : passed ? "可订正" : "进行中"} />
          <Metric label="已选对象" value={`${selectedRefs.length} 个`} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={cn(
              "rounded-md px-3 py-2 font-medium text-sm transition",
              passed
                ? "bg-cyan-600 text-white hover:bg-cyan-500"
                : "bg-muted text-muted-foreground"
            )}
            disabled={!passed}
            onClick={onCompleteCorrection}
            type="button"
          >
            我订正完了
          </button>
          <button
            className="rounded-md border border-border bg-background px-3 py-2 font-medium text-sm transition hover:border-cyan-300"
            onClick={onOpenVariant}
            type="button"
          >
            {variantOpen ? "收起变式" : "进入同因变式"}
          </button>
        </div>
      </div>
      {variantOpen && (
        <div className="mt-3 rounded-md border border-cyan-200/70 bg-cyan-50 px-3 py-2 text-cyan-950 text-sm leading-6 dark:border-cyan-900/70 dark:bg-cyan-950/30 dark:text-cyan-50">
          <div className="font-medium">变式做题入口</div>
          <div className="mt-1">{display.variantPrompt}</div>
          <div className="mt-1 text-cyan-900/70 text-xs dark:text-cyan-100/70">
            {display.completionHint}
          </div>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
