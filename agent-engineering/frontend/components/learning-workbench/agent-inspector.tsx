"use client";

import { useState } from "react";
import type {
  MathDiagnosisResult,
  MathDiagnosisToolResult,
} from "@/lib/ai/math-diagnosis-types";
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
  StrictChecksPanel,
  VerifierTracePanel,
} from "./math-diagnosis-panels";

type AgentInspectorProps = {
  result: MathDiagnosisToolResult | null;
  collapsed: boolean;
  onToggle: () => void;
  exportable?: boolean;
  mobileMode?: "drawer" | "sidebar";
};

export function AgentInspector({
  result,
  collapsed,
  onToggle,
  exportable = false,
  mobileMode = "sidebar",
}: AgentInspectorProps) {
  if (mobileMode === "drawer") {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 xl:hidden">
        <div className="absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-hidden rounded-t-xl border-border/70 border-t bg-background shadow-xl">
          <InspectorShell
            exportable={exportable}
            onToggle={onToggle}
            result={result}
            titleAction="关闭"
          />
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "hidden h-dvh shrink-0 border-border/60 border-l bg-background transition-[width] duration-300 xl:flex",
        collapsed ? "w-12" : "w-[360px] 2xl:w-[400px]"
      )}
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
          onToggle={onToggle}
          result={result}
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
}: {
  result: MathDiagnosisToolResult | null;
  onToggle: () => void;
  exportable: boolean;
  titleAction: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    await navigator.clipboard.writeText(buildExportSummary(result));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div className="flex min-h-0 w-full flex-col">
      <div className="flex items-start justify-between gap-3 border-border/50 border-b px-4 py-3">
        <div>
          <div className="font-semibold text-sm">Agent Inspector</div>
          <div className="mt-1 text-muted-foreground text-xs">
            诊断、验证链、画像更新和几何推荐
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
        <InspectorContent result={result} />
      </div>
    </div>
  );
}

function InspectorContent({ result }: { result: MathDiagnosisToolResult | null }) {
  const events = buildWorkbenchEventsFromDiagnosis(result);

  if (!result) {
    return <EmptyInspector />;
  }

  if ("error" in result) {
    return (
      <div className="grid gap-4">
        <div className="rounded-lg border border-amber-300/40 bg-amber-50/70 p-3 text-amber-950 text-sm dark:bg-amber-950/20 dark:text-amber-100">
          {result.message}
        </div>
        {result.policyDecision && <PolicyPanel policy={result.policyDecision} />}
        {result.correctionCard && (
          <CorrectionCardPanel card={result.correctionCard} compact={true} />
        )}
        <WorkbenchTimeline events={events} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <StatusSummary result={result} />
      <FirstWrongStepPanel result={result} />
      <PolicyPanel policy={result.policyDecision} />
      <MisconceptionAtomsPanel result={result} />
      <StrictChecksPanel result={result} />
      <VerifierTracePanel result={result} />
      <LearnerMemoryPanel result={result} />
      <RemediationPlanPanel result={result} />
      <GeometryLabRecommendationPanel result={result} />
      <WorkbenchTimeline events={events} />
    </div>
  );
}

function StatusSummary({ result }: { result: MathDiagnosisResult }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
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
        这里只展示 workflow 产出的结构化结果，不在前端临时猜测数学结论。
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
      <div className="font-medium">等待诊断</div>
      <div className="mt-2 text-muted-foreground leading-6">
        输入题目和学生步骤后，这里会显示第一错步、错因原子、严格门禁、验证链、画像更新和 Geometry Lab 推荐。
      </div>
    </div>
  );
}

function WorkbenchTimeline({
  events,
}: {
  events: ReturnType<typeof buildWorkbenchEventsFromDiagnosis>;
}) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        Tool Event Timeline
      </div>
      <div className="grid gap-2">
        {events.map((item) => (
          <div
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            key={item.id}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{item.title}</span>
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs",
                  item.status === "completed" &&
                    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                  item.status === "warn" &&
                    "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  item.status === "blocked" &&
                    "bg-red-500/10 text-red-700 dark:text-red-300"
                )}
              >
                {item.type}
              </span>
            </div>
            <div className="mt-1 text-muted-foreground text-xs leading-5">
              {item.detail}
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
