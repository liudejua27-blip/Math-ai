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
  saveStatus: "idle" | "saving" | "saved" | "error";
  onCompleteCorrection: () => void;
  onOpenVariant: () => void;
  onSubmitVariantResult: (success: boolean) => void;
};

export function GeometryAttemptSummary({
  level,
  display,
  selectedRefs,
  correctCount,
  passed,
  completed,
  variantOpen,
  saveStatus,
  onCompleteCorrection,
  onOpenVariant,
  onSubmitVariantResult,
}: GeometryAttemptSummaryProps) {
  const passRule = level.scene.assessment.passRule;

  return (
    <section className="border-border border-t bg-[var(--ds-bg-canvas)] px-4 py-3">
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
                ? "ds-button-primary"
                : "bg-muted text-muted-foreground"
            )}
            disabled={!passed}
            onClick={onCompleteCorrection}
            type="button"
          >
            我订正完了
          </button>
          <button
            className="ds-button-secondary"
            onClick={onOpenVariant}
            type="button"
          >
            {variantOpen ? "收起变式" : "进入同因变式"}
          </button>
        </div>
      </div>
      {saveStatus !== "idle" && (
        <div className="mt-2 text-muted-foreground text-xs">
          {saveStatus === "saving" && "正在写入学习闭环..."}
          {saveStatus === "saved" && "已写入学习画像和训练记录。"}
          {saveStatus === "error" && "当前为本地完成状态，登录后可同步到学习画像。"}
        </div>
      )}
      {variantOpen && (
        <div className="ds-card mt-3 border px-3 py-2 text-sm leading-6">
          <div className="font-medium">变式做题入口</div>
          <div className="mt-1">{display.variantPrompt}</div>
          <div className="mt-1 text-muted-foreground text-xs">
            {display.completionHint}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="ds-button-primary px-3 py-1.5 text-xs"
              onClick={() => onSubmitVariantResult(true)}
              type="button"
            >
              变式做对了
            </button>
            <button
              className="ds-button-secondary px-3 py-1.5 text-xs"
              onClick={() => onSubmitVariantResult(false)}
              type="button"
            >
              变式仍需练习
            </button>
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
