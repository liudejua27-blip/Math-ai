"use client";

import type { MathDiagnosisToolResult } from "@/lib/ai/math-diagnosis-types";
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
};

export function AgentInspector({
  result,
  collapsed,
  onToggle,
}: AgentInspectorProps) {
  const events = buildWorkbenchEventsFromDiagnosis(result);

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
        <div className="flex min-h-0 w-full flex-col">
          <div className="flex items-center justify-between border-border/50 border-b px-4 py-3">
            <div>
              <div className="font-semibold text-sm">Agent Inspector</div>
              <div className="mt-1 text-muted-foreground text-xs">
                诊断、验证链、画像和几何推荐
              </div>
            </div>
            <button
              className="rounded-md border border-border/60 px-2 py-1 text-muted-foreground text-xs transition hover:text-foreground"
              onClick={onToggle}
              type="button"
            >
              收起
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!result ? (
              <EmptyInspector />
            ) : "error" in result ? (
              <div className="grid gap-4">
                <div className="rounded-lg border border-amber-300/40 bg-amber-50/70 p-3 text-amber-950 text-sm dark:bg-amber-950/20 dark:text-amber-100">
                  {result.message}
                </div>
                {result.policyDecision && (
                  <PolicyPanel policy={result.policyDecision} />
                )}
                {result.correctionCard && (
                  <CorrectionCardPanel
                    card={result.correctionCard}
                    compact={true}
                  />
                )}
                <WorkbenchTimeline events={events} />
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function StatusSummary({
  result,
}: {
  result: Exclude<MathDiagnosisToolResult, { error: string }>;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-blue-500/10 px-2 py-1 font-medium text-blue-700 text-xs dark:text-blue-300">
          confidence {Math.round(result.confidence * 100)}%
        </span>
        {result.needHumanReview && (
          <span className="rounded-md bg-amber-500/10 px-2 py-1 font-medium text-amber-700 text-xs dark:text-amber-300">
            需要复核
          </span>
        )}
      </div>
      <div className="mt-2 text-muted-foreground text-xs leading-5">
        UI 只展示 workflow 产出的结构化事件和诊断结果，不在前端临时猜测数学结论。
      </div>
    </div>
  );
}

function EmptyInspector() {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm">
      <div className="font-medium">等待诊断</div>
      <div className="mt-2 text-muted-foreground leading-6">
        输入题目和学生步骤后，右侧会显示第一错步、错因原子、严格门禁、验证链和 Geometry Lab 推荐。
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

