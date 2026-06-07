"use client";

import type { GeometryLevel } from "@/lib/geometry/geometry-scene-types";

type GeometryAttemptSummaryProps = {
  level: GeometryLevel;
  selectedRefs: string[];
};

export function GeometryAttemptSummary({
  level,
  selectedRefs,
}: GeometryAttemptSummaryProps) {
  const selected = new Set(selectedRefs);
  const correctCount = level.scene.targets.filter((target) =>
    target.correctRefs.some((refId) => selected.has(refId))
  ).length;
  const passRule = level.scene.assessment.passRule;

  return (
    <section className="border-border border-t bg-muted/25 px-4 py-3">
      <div className="grid gap-3 text-sm sm:grid-cols-4">
        <Metric label="目标命中" value={`${correctCount}/${level.scene.targets.length}`} />
        <Metric label="通过要求" value={`${passRule.minCorrectTargets} 个目标`} />
        <Metric label="证据要求" value={passRule.requireEvidence ? "需要" : "可选"} />
        <Metric label="解释要求" value={passRule.requireReason ? "需要" : "可选"} />
      </div>
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
