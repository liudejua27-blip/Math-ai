"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  MathDiagnosisResult,
  MathDiagnosisToolResult,
} from "@/lib/ai/math-diagnosis-types";
import type {
  MathAgentRunStatus,
  MathAgentRuntimeControlAction,
} from "@/lib/ai/runtime/math-agent-runtime";
import { buildWorkbenchEventsFromDiagnosis } from "@/lib/ai/workbench-events";
import { cn } from "@/lib/utils";
import {
  CorrectionCardPanel,
  FirstWrongStepPanel,
  GeometryLabRecommendationPanel,
  LearnerMemoryPanel,
  MisconceptionAtomsPanel,
  PolicyPanel,
  RemediationPlanPanel,
  StepAlignmentDetailsPanel,
  StrictChecksPanel,
  VerifierTracePanel,
} from "./math-diagnosis-panels";

type AgentInspectorProps = {
  result: MathDiagnosisToolResult | null;
  collapsed: boolean;
  onToggle: () => void;
  exportable?: boolean;
  mobileMode?: "drawer" | "sidebar";
  width?: number;
  runtimeStatus?: MathAgentRunStatus;
  onControlAction?: (action: MathAgentRuntimeControlAction) => void;
};

export function AgentInspector({
  result,
  collapsed,
  onToggle,
  exportable = false,
  mobileMode = "sidebar",
  width = 380,
  runtimeStatus = "idle",
  onControlAction,
}: AgentInspectorProps) {
  if (mobileMode === "drawer") {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 xl:hidden">
        <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-xl border-border/70 border-t bg-background shadow-xl">
          <InspectorShell
            exportable={exportable}
            onControlAction={onControlAction}
            onToggle={onToggle}
            result={result}
            runtimeStatus={runtimeStatus}
            titleAction="关闭"
          />
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "ds-inspector hidden h-dvh shrink-0 border-l transition-[width] duration-200 xl:flex",
        collapsed && "w-12"
      )}
      style={
        collapsed
          ? undefined
          : ({ "--workbench-inspector-width": `${width}px`, width } as CSSProperties)
      }
    >
      {collapsed ? (
        <button
          className="flex h-full w-full items-start justify-center px-2 py-4 text-muted-foreground text-xs [writing-mode:vertical-rl] hover:text-foreground"
          onClick={onToggle}
          type="button"
        >
          Agent Inspector
        </button>
      ) : (
        <InspectorShell
          exportable={exportable}
          onControlAction={onControlAction}
          onToggle={onToggle}
          result={result}
          runtimeStatus={runtimeStatus}
          titleAction="收起"
        />
      )}
    </aside>
  );
}

function InspectorShell({
  result,
  onToggle,
  exportable,
  titleAction,
  runtimeStatus,
  onControlAction,
}: {
  result: MathDiagnosisToolResult | null;
  onToggle: () => void;
  exportable: boolean;
  titleAction: string;
  runtimeStatus: MathAgentRunStatus;
  onControlAction?: (action: MathAgentRuntimeControlAction) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);
  const events = useMemo(() => buildWorkbenchEventsFromDiagnosis(result), [result]);

  async function copySummary() {
    await navigator.clipboard.writeText(buildExportSummary(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function copyReadableReport() {
    await navigator.clipboard.writeText(buildReadableReport(result, events));
    setReportCopied(true);
    window.setTimeout(() => setReportCopied(false), 1200);
  }

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="flex items-start justify-between gap-3 border-border/50 border-b px-4 py-3">
        <div>
          <div className="font-semibold text-sm">Agent Inspector</div>
          <div className="mt-1 text-muted-foreground text-xs">
            实时运行、验证链、画像更新和几何推荐
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {exportable && result && (
            <>
              <button
                className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground text-xs transition hover:text-foreground"
                onClick={copySummary}
                type="button"
              >
                {copied ? "已复制" : "复制摘要"}
              </button>
              <button
                className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground text-xs transition hover:text-foreground"
                onClick={copyReadableReport}
                type="button"
              >
                {reportCopied ? "报告已复制" : "复制报告"}
              </button>
              <button
                className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground text-xs transition hover:text-foreground"
                onClick={() => exportDiagnosisJson(result)}
                type="button"
              >
                导出 JSON
              </button>
            </>
          )}
          <button
            className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground text-xs transition hover:text-foreground"
            onClick={onToggle}
            type="button"
          >
            {titleAction}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="grid gap-4">
          <RuntimeStatusPanel
            onControlAction={onControlAction}
            result={result}
            runtimeStatus={runtimeStatus}
          />
          <InspectorContent events={events} result={result} />
        </div>
      </div>
    </div>
  );
}

function InspectorContent({
  result,
  events,
}: {
  result: MathDiagnosisToolResult | null;
  events: ReturnType<typeof buildWorkbenchEventsFromDiagnosis>;
}) {
  if (!result) {
    return (
      <>
        <EmptyInspector />
        <WorkbenchTimeline events={events} runtimeStatus="idle" />
      </>
    );
  }

  if ("error" in result) {
    return (
      <>
        <div className="rounded-lg border border-amber-300/40 bg-amber-50/70 p-3 text-amber-950 text-sm dark:bg-amber-950/20 dark:text-amber-100">
          {result.message}
        </div>
        {result.policyDecision && <PolicyPanel policy={result.policyDecision} />}
        {result.correctionCard && (
          <CorrectionCardPanel card={result.correctionCard} compact={true} />
        )}
        <WorkbenchTimeline events={events} runtimeStatus="completed" />
      </>
    );
  }

  return (
    <>
      <StatusSummary result={result} />
      <FirstWrongStepPanel result={result} />
      <StepAlignmentDetailsPanel result={result} />
      <PolicyPanel policy={result.policyDecision} />
      <MisconceptionAtomsPanel result={result} />
      <StrictChecksPanel result={result} />
      <VerifierTracePanel result={result} />
      <LearnerMemoryPanel result={result} />
      <RemediationPlanPanel result={result} />
      <GeometryLabRecommendationPanel result={result} />
      <WorkbenchTimeline events={events} runtimeStatus="completed" />
    </>
  );
}

function RuntimeStatusPanel({
  runtimeStatus,
  result,
  onControlAction,
}: {
  runtimeStatus: MathAgentRunStatus;
  result: MathDiagnosisToolResult | null;
  onControlAction?: (action: MathAgentRuntimeControlAction) => void;
}) {
  const hasDiagnosis = result && !("error" in result);
  return (
    <div className="ds-card rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium text-sm">Runtime 控制台</div>
          <div className="mt-1 text-muted-foreground text-xs">
            {formatRuntimeStatus(runtimeStatus)}
          </div>
        </div>
        <span
          className={cn(
            "rounded-md px-2 py-1 font-medium text-xs",
            runtimeStatus === "running" &&
              "bg-blue-500/10 text-blue-700 dark:text-blue-300",
            runtimeStatus === "completed" &&
              "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            runtimeStatus === "failed" &&
              "bg-red-500/10 text-red-700 dark:text-red-300",
            runtimeStatus === "interrupted" &&
              "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            (runtimeStatus === "idle" || runtimeStatus === "waiting_approval") &&
              "bg-muted text-muted-foreground"
          )}
        >
          {runtimeStatus}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <ControlButton
          disabled={!onControlAction || runtimeStatus !== "running"}
          label="中断"
          onClick={() => onControlAction?.("interrupt")}
        />
        <ControlButton
          disabled={!onControlAction}
          label="继续"
          onClick={() => onControlAction?.("resume")}
        />
        <ControlButton
          disabled={!onControlAction || !hasDiagnosis}
          label="确认证据"
          onClick={() => onControlAction?.("approve_evidence")}
        />
        <ControlButton
          disabled={!onControlAction || !hasDiagnosis}
          label="要求复核"
          onClick={() => onControlAction?.("request_human_review")}
        />
        <ControlButton
          disabled={!onControlAction || !hasDiagnosis}
          label="继续变式"
          onClick={() => onControlAction?.("retry")}
        />
        <ControlButton
          disabled={!onControlAction || !hasDiagnosis}
          label="回放 Trace"
          onClick={() => onControlAction?.("replay_trace")}
        />
      </div>
    </div>
  );
}

function ControlButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-md border border-border/60 px-2 py-1.5 text-xs transition hover:border-primary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function StatusSummary({ result }: { result: MathDiagnosisResult }) {
  return (
    <div className="ds-card rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-blue-500/10 px-2 py-1 font-medium text-blue-700 text-xs dark:text-blue-300">
          confidence {Math.round(result.confidence * 100)}%
        </span>
        {result.needHumanReview && (
          <span className="rounded-md bg-amber-500/10 px-2 py-1 font-medium text-amber-700 text-xs dark:text-amber-300">
            需要人工复核
          </span>
        )}
      </div>
      <div className="mt-2 text-muted-foreground text-xs leading-5">
        这里展示 workflow 产出的结构化结果，前端不临时猜测数学结论。
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
      <div className="font-medium">等待诊断</div>
      <div className="mt-2 text-muted-foreground leading-6">
        输入题目和学生步骤后，这里会显示实时事件、第一错步、错因原子、严格门禁、验证链、画像更新和 Geometry Lab 推荐。
      </div>
    </div>
  );
}

function WorkbenchTimeline({
  events,
  runtimeStatus,
}: {
  events: ReturnType<typeof buildWorkbenchEventsFromDiagnosis>;
  runtimeStatus: MathAgentRunStatus;
}) {
  const liveEvents =
    runtimeStatus === "running" && events.length === 0
      ? [
          {
            id: "runtime-waiting-live",
            type: "diagnosis_started" as const,
            title: "等待实时事件",
            status: "running" as const,
            detail: "Runtime 正在运行，事件会通过 SSE / workflow hooks 持续追加。",
            phase: "runtime" as const,
          },
        ]
      : events;

  if (liveEvents.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Live Tool Timeline
      </div>
      <div className="grid gap-2">
        {liveEvents.map((item) => (
          <div className="ds-card rounded-md border px-3 py-2 text-sm" key={item.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{item.title}</span>
              <span className={cn("rounded-md px-2 py-0.5 text-xs", statusTone(item.status))}>
                {item.status}
              </span>
            </div>
            <div className="mt-1 text-muted-foreground text-xs leading-5">
              {item.detail}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
              {item.phase && <span>phase: {item.phase}</span>}
              {item.toolName && <span>tool: {item.toolName}</span>}
              {item.durationMs !== undefined && <span>{item.durationMs}ms</span>}
              {item.replayable && <span>replayable</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildExportSummary(result: MathDiagnosisToolResult | null) {
  if (!result) {
    return "Math-SEARAG：等待诊断。";
  }

  if ("error" in result) {
    return `Math-SEARAG：${result.message}`;
  }

  return [
    `Math-SEARAG diagnosis ${result.jobId}`,
    `第一错步：${result.firstWrongStep ?? "暂未定位"}`,
    `错因：${result.firstWrongReason ?? "暂未生成"}`,
    `置信度：${Math.round(result.confidence * 100)}%`,
    `人工复核：${result.needHumanReview ? "需要" : "不需要"}`,
    `错因原子：${result.misconceptionAtoms
      .map((atom) => atom.label || atom.id)
      .join("、")}`,
  ].join("\n");
}

function buildReadableReport(
  result: MathDiagnosisToolResult | null,
  events: ReturnType<typeof buildWorkbenchEventsFromDiagnosis>
) {
  if (!result) {
    return "# Math-SEARAG 学习诊断报告\n\n当前还没有诊断结果。";
  }

  if ("error" in result) {
    return `# Math-SEARAG 学习诊断报告\n\n当前状态：${result.message}`;
  }

  return [
    "# Math-SEARAG 学习诊断报告",
    "",
    `诊断编号：${result.jobId}`,
    `第一错步：${result.firstWrongStep ?? "暂未定位"}`,
    `错因解释：${result.firstWrongReason ?? "暂未生成"}`,
    `置信度：${Math.round(result.confidence * 100)}%`,
    `是否需要人工复核：${result.needHumanReview ? "需要" : "不需要"}`,
    "",
    "## 错因原子",
    ...result.misconceptionAtoms.map(
      (atom) => `- ${atom.id} ${atom.label}：${atom.description}`
    ),
    "",
    "## 下一步训练",
    ...(result.remediationPlan?.items.length
      ? result.remediationPlan.items.map(
          (item) => `- L${item.level} ${item.title}：${item.prompt}`
        )
      : ["- 暂无训练计划。"]),
    "",
    "## Runtime Trace",
    ...events.map((item) => `- [${item.status}] ${item.title}：${item.detail}`),
  ].join("\n");
}

function exportDiagnosisJson(result: MathDiagnosisToolResult) {
  const payload = {
    exportedAt: new Date().toISOString(),
    product: "Math-SEARAG Learning Agent",
    diagnosis: result,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const jobId = "error" in result ? "error" : result.jobId;
  anchor.href = url;
  anchor.download = `math-searag-diagnosis-${jobId}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatRuntimeStatus(status: MathAgentRunStatus) {
  const labels: Record<MathAgentRunStatus, string> = {
    idle: "空闲：等待学生输入题目和步骤。",
    running: "运行中：正在执行诊断、验证和策略决策。",
    waiting_approval: "等待确认：需要学生或老师确认下一步。",
    interrupted: "已中断：可继续、重试或要求复核。",
    failed: "失败：请检查后端或重新运行。",
    completed: "完成：可查看报告、确认或继续变式。",
  };
  return labels[status];
}

function statusTone(status: string) {
  if (status === "running" || status === "queued") {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }
  if (status === "completed") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "warn" || status === "blocked") {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }
  if (status === "failed") {
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  }
  return "bg-muted text-muted-foreground";
}
