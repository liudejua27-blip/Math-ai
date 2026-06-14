"use client";

import {
  evaluateGeometrySelection,
  solveGeometryLevel,
} from "@/lib/geometry/geometry-reasoning-engine";
import type { GeometryLevel } from "@/lib/geometry/geometry-scene-types";
import { cn } from "@/lib/utils";

type GeometryTaskPanelProps = {
  level: GeometryLevel;
  selectedRefs: string[];
  reasonText: string;
  setReasonText: (value: string) => void;
  onSelectRef: (refId: string) => void;
};

export function GeometryTaskPanel({
  level,
  selectedRefs,
  reasonText,
  setReasonText,
  onSelectRef,
}: GeometryTaskPanelProps) {
  const selected = new Set(selectedRefs);
  const solvers = solveGeometryLevel(level);
  const feedback = evaluateGeometrySelection({ level, selectedRefs });

  return (
    <section className="border-border border-b p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold text-sm">几何推理任务</div>
          <div className="mt-1 text-muted-foreground text-xs">
            选择对象后立即判断：是否支持当前的线面角、二面角或截面构造。
          </div>
        </div>
        <span className="rounded bg-muted px-2 py-1 text-xs">
          {feedback.solvedTargetIds.length}/{level.scene.targets.length}
        </span>
      </div>

      <div className="mt-3 grid gap-3">
        {solvers.map((solver) => {
          const solved = feedback.solvedTargetIds.includes(solver.targetId);
          return (
            <div
              className="rounded-md border border-border bg-background p-3"
              key={solver.targetId}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{solver.prompt}</div>
                  <div className="mt-1 text-muted-foreground text-xs">
                    {formatSolverKind(solver.kind)}
                  </div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-2 py-1 text-xs",
                    solved
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {solved ? "已命中" : "待确认"}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {solver.auxiliaryCandidates.map((candidate) => (
                  <button
                    className={cn(
                      "rounded border px-2 py-1 text-xs transition",
                      selected.has(candidate.refId)
                        ? "border-cyan-400 bg-cyan-50 text-cyan-900 dark:bg-cyan-950 dark:text-cyan-50"
                        : candidate.required
                          ? "border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                          : "border-border bg-muted/35"
                    )}
                    key={`${solver.targetId}-${candidate.refId}-${candidate.role}`}
                    onClick={() => onSelectRef(candidate.refId)}
                    type="button"
                  >
                    {candidate.label}
                    {candidate.required ? " *" : ""}
                  </button>
                ))}
              </div>

              <ol className="mt-3 grid gap-1 text-muted-foreground text-xs leading-5">
                {solver.reasoningTrace.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-md border border-border bg-muted/25 p-3">
        <div className="font-medium text-sm">即时反馈</div>
        <div className="mt-2 grid gap-2 text-xs leading-5">
          {feedback.messages.map((message, index) => (
            <div
              className={cn(
                "rounded-md px-3 py-2",
                message.status === "success" &&
                  "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
                message.status === "warning" &&
                  "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
                message.status === "error" &&
                  "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-100"
              )}
              key={`${message.refId ?? "message"}-${index}`}
            >
              {message.text}
            </div>
          ))}
        </div>
      </div>

      <label className="mt-4 block">
        <span className="font-medium text-sm">几何依据</span>
        <textarea
          className="mt-2 min-h-24 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-cyan-400"
          onChange={(event) => setReasonText(event.target.value)}
          placeholder="例如：A1 在底面 ABCD 上的投影是 A，所以 A1C 与底面的线面角可转化为 A1C 与 AC 的夹角。"
          value={reasonText}
        />
      </label>
    </section>
  );
}

function formatSolverKind(kind: string) {
  const labels: Record<string, string> = {
    line_plane_angle: "线面角",
    dihedral_angle: "二面角",
    section_construction: "截面构造",
    generic_constraint: "几何约束",
  };
  return labels[kind] ?? kind;
}
