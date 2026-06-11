"use client";

import {
  ActivityIcon,
  GaugeIcon,
  PanelRightOpenIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";
import type { MathDiagnosisToolResult } from "@/lib/ai/math-diagnosis-types";
import type {
  MathAgentRunStatus,
  MathAgentRuntimeControlAction,
} from "@/lib/ai/runtime/math-agent-runtime";
import {
  buildAgentRunViewModel,
  type AgentRunPhaseState,
} from "@/lib/ai/agent-run-view-model";
import type { WorkbenchEvent } from "@/lib/ai/workbench-events";
import { cn } from "@/lib/utils";

type AgentRunRibbonProps = {
  result: MathDiagnosisToolResult | null;
  runtimeStatus: MathAgentRunStatus;
  liveEvents: WorkbenchEvent[];
  onOpenInspector: () => void;
  onControlAction: (action: MathAgentRuntimeControlAction) => void;
};

export function AgentRunRibbon({
  result,
  runtimeStatus,
  liveEvents,
  onOpenInspector,
  onControlAction,
}: AgentRunRibbonProps) {
  const viewModel = useMemo(
    () =>
      buildAgentRunViewModel({
        events: liveEvents,
        result,
        status: runtimeStatus,
      }),
    [liveEvents, result, runtimeStatus]
  );

  return (
    <section className="border-border/35 border-b bg-[var(--ms-bg-canvas)] px-3 py-2 md:px-5">
      <div className="mx-auto grid w-full max-w-5xl gap-2">
        <div className="ms-runtime-ribbon px-3 py-2.5">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--ms-accent-soft)] text-[var(--ms-accent)]">
              <ActivityIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ms-chip">Math-SEARAG Runtime</span>
                <span className={cn("rounded-md px-2 py-0.5 font-medium text-xs", statusTone(viewModel.status))}>
                  {formatRuntimeStatus(viewModel.status)}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  phase: {viewModel.activePhase}
                </span>
              </div>
              <div className="mt-1 truncate font-semibold text-sm">
                {viewModel.headline}
              </div>
              <div className="mt-0.5 line-clamp-2 text-muted-foreground text-xs leading-5">
                {viewModel.detail}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <RibbonButton
                disabled={!viewModel.canRequestReview}
                label="复核"
                onClick={() => onControlAction("request_human_review")}
              >
                <ShieldCheckIcon className="size-3.5" />
              </RibbonButton>
              <RibbonButton
                disabled={!viewModel.canReplayTrace}
                label="回放"
                onClick={() => onControlAction("replay_trace")}
              >
                <RotateCcwIcon className="size-3.5" />
              </RibbonButton>
              <RibbonButton label="Inspector" onClick={onOpenInspector}>
                <PanelRightOpenIcon className="size-3.5" />
              </RibbonButton>
            </div>
            <div className="hidden items-center gap-2 text-muted-foreground text-xs sm:flex">
              <GaugeIcon className="size-3.5" />
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--ms-accent)] transition-[width] duration-300"
                  style={{ width: `${viewModel.progressPercent}%` }}
                />
              </div>
              <span>{viewModel.progressPercent}%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {viewModel.phaseStates.map((phase) => (
            <PhaseChip key={phase.phase} phase={phase} />
          ))}
          {viewModel.toolReceipts.map((receipt) => (
            <div
              className="ms-tool-receipt min-w-[180px] px-2.5 py-1.5 text-xs"
              key={receipt.id}
              title={receipt.detail}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{receipt.name}</span>
                <span className={cn("rounded px-1.5 py-0.5", eventTone(receipt.status))}>
                  {receipt.status}
                </span>
              </div>
              {receipt.durationMs !== undefined && (
                <div className="mt-1 text-muted-foreground">
                  {receipt.durationMs}ms
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RibbonButton({
  children,
  disabled = false,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="ms-agent-action"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function PhaseChip({ phase }: { phase: AgentRunPhaseState }) {
  return (
    <div
      className={cn(
        "ms-phase-chip shrink-0",
        phase.status === "running" && "border-blue-400/50 text-blue-700 dark:text-blue-300",
        phase.status === "completed" && "border-emerald-400/40 text-emerald-700 dark:text-emerald-300",
        phase.status === "warn" && "border-amber-400/50 text-amber-700 dark:text-amber-300",
        phase.status === "failed" && "border-red-400/50 text-red-700 dark:text-red-300"
      )}
    >
      <span>{phase.label}</span>
      <span className="text-muted-foreground">{phase.eventCount}</span>
    </div>
  );
}

function formatRuntimeStatus(status: MathAgentRunStatus) {
  const labels: Record<MathAgentRunStatus, string> = {
    idle: "idle",
    running: "running",
    waiting_approval: "approval",
    interrupted: "paused",
    failed: "failed",
    completed: "done",
  };
  return labels[status];
}

function statusTone(status: MathAgentRunStatus) {
  if (status === "running") {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (status === "completed") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "failed") {
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  }
  if (status === "interrupted" || status === "waiting_approval") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  return "bg-muted text-muted-foreground";
}

function eventTone(status: WorkbenchEvent["status"]) {
  if (status === "completed") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "running" || status === "queued") {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (status === "warn" || status === "blocked") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (status === "failed") {
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  }
  return "bg-muted text-muted-foreground";
}
