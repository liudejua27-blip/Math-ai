"use client";

import type React from "react";
import type { CSSProperties } from "react";
import type { LearnerRecommendation } from "@/lib/ai/learner-memory-types";
import type { MathDiagnosisToolResult } from "@/lib/ai/math-diagnosis-types";
import type {
  DiagnosisHistoryItem,
  StudentWorkbenchSummary,
} from "@/lib/ai/student-workbench-types";
import { cn } from "@/lib/utils";

type LearningWorkbenchSidebarProps = {
  latestDiagnosis: MathDiagnosisToolResult | null;
  workbenchSummary: StudentWorkbenchSummary | null;
  recentDiagnoses?: DiagnosisHistoryItem[];
  className?: string;
  width?: number;
  activeTaskLabel?: string;
};

export function LearningWorkbenchSidebar({
  latestDiagnosis,
  workbenchSummary,
  recentDiagnoses = workbenchSummary?.recentDiagnoses ?? [],
  className,
  width,
  activeTaskLabel,
}: LearningWorkbenchSidebarProps) {
  const latestResult =
    latestDiagnosis && !("error" in latestDiagnosis) ? latestDiagnosis : null;
  const latestAtoms = latestResult?.misconceptionAtoms.slice(0, 4) ?? [];
  const recommendation =
    latestResult?.learnerMemoryGuidance?.recommendation ??
    workbenchSummary?.learnerRecommendation ??
    null;
  const planItems = buildPlanItems(workbenchSummary, recommendation, Boolean(latestResult));
  const geometryLabs = latestResult?.recommendedGeometryLabs?.slice(0, 2) ?? [];

  return (
    <aside
      className={cn(
        "ms-sidebar hidden h-dvh shrink-0 flex-col border-r xl:flex",
        className
      )}
      style={{ "--workbench-sidebar-width": `${width ?? 288}px`, width } as CSSProperties}
    >
      <div className="border-border/50 border-b px-4 py-3">
        <div className="font-semibold text-sm">Math-SEARAG Workbench</div>
        <div className="mt-1 text-muted-foreground text-xs">
          高中数学思维诊断工作台
        </div>
        {activeTaskLabel && (
          <div className="mt-2 rounded-md border border-border/50 bg-background/70 px-2 py-1.5 text-xs">
            当前任务：{activeTaskLabel}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <SidebarSection title="学生画像">
          {workbenchSummary?.profile ? (
            <div className="ms-card rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">当前学习状态</div>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary text-xs">
                  {formatWeeklyState(workbenchSummary.profile.weeklyState)}
                </span>
              </div>
              <div className="mt-2 text-muted-foreground text-xs leading-5">
                画像会根据错因复发、变式迁移和订正表现持续更新，并驱动下一题推荐。
              </div>
            </div>
          ) : (
            <EmptyState text="完成一次诊断后生成画像。" />
          )}
        </SidebarSection>

        <SidebarSection title="主动复盘提醒">
          {recommendation ? (
            <RecommendationCard recommendation={recommendation} />
          ) : (
            <EmptyState text="系统会在发现高复发错因后生成复盘提醒。" />
          )}
        </SidebarSection>

        <SidebarSection title="高频错因原子">
          {workbenchSummary?.topAtoms.length ? (
            <div className="grid gap-2">
              {workbenchSummary.topAtoms.map((atom) => (
                <div className="ms-card rounded-md border px-3 py-2" key={atom.id}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-xs">{atom.atomId}</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                      {atom.masteryLabel}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-muted-foreground text-xs">
                    {atom.atomLabel}
                  </div>
                  <div className="mt-1 text-muted-foreground text-[11px]">
                    复发 {atom.recurrenceCount} 次 · 迁移率{" "}
                    {Math.round(atom.transferRate * 100)}%
                  </div>
                  <div className="mt-1 text-muted-foreground text-[11px]">
                    订正修复率 {Math.round(atom.selfRepairRate * 100)}%
                  </div>
                </div>
              ))}
            </div>
          ) : latestAtoms.length ? (
            <div className="grid gap-2">
              {latestAtoms.map((atom) => (
                <AtomChip id={atom.id} key={atom.id} label={atom.label} />
              ))}
            </div>
          ) : (
            <EmptyState text="暂无错因记录，先输入题目和自己的解题步骤。" />
          )}
        </SidebarSection>

        <SidebarSection title="本周训练计划">
          {planItems.length ? (
            <div className="grid gap-2 text-sm">
              {planItems.slice(0, 5).map((item, index) => (
                <PlanItem key={`${item}-${index}`} label={item} value="待完成" />
              ))}
            </div>
          ) : (
            <EmptyState text="诊断后会生成同因变式和复盘计划。" />
          )}
        </SidebarSection>

        <SidebarSection title="最近诊断">
          {recentDiagnoses.length ? (
            <div className="grid gap-2">
              {recentDiagnoses.slice(0, 6).map((item) => (
                <a
                  className="ms-card ms-card-hover rounded-md border px-3 py-2 transition hover:border-primary/40"
                  href={`/diagnosis/${item.id}`}
                  key={item.id}
                >
                  <div className="line-clamp-2 text-xs leading-5">
                    {item.problemPreview || "未命名诊断"}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-muted-foreground text-[11px]">
                    <span>{formatDate(item.createdAt)}</span>
                    <span>{Math.round(item.confidence * 100)}%</span>
                  </div>
                  {item.firstWrongStep && (
                    <div className="mt-1 line-clamp-1 text-muted-foreground text-[11px]">
                      第一错步：{item.firstWrongStep}
                    </div>
                  )}
                  {item.needHumanReview && (
                    <div className="mt-1 text-amber-700 text-[11px] dark:text-amber-300">
                      需要人工复核
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : (
            <EmptyState text="暂无历史诊断。" />
          )}
        </SidebarSection>

        <SidebarSection title="Geometry Lab">
          {geometryLabs.length ? (
            <div className="grid gap-2">
              {geometryLabs.map((lab) => (
                <a
                  className="rounded-md border border-cyan-200/70 bg-cyan-50 px-3 py-2 text-cyan-900 text-xs leading-5 transition hover:border-cyan-400 dark:border-cyan-900/70 dark:bg-cyan-950/30 dark:text-cyan-100"
                  href={`/geometry-lab?level=${encodeURIComponent(lab.levelId)}`}
                  key={lab.levelId}
                >
                  <div className="font-medium">{lab.title}</div>
                  <div className="mt-1 opacity-80">{lab.reason}</div>
                </a>
              ))}
            </div>
          ) : (
            <EmptyState text="出现立体几何错因后会推荐对应实验。" />
          )}
        </SidebarSection>
      </div>
    </aside>
  );
}

function RecommendationCard({
  recommendation,
}: {
  recommendation: LearnerRecommendation;
}) {
  return (
    <div className="ms-card rounded-lg border p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm">{recommendation.nextProblem.title}</div>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
          {formatRisk(recommendation.recurrencePrediction.risk)}
        </span>
      </div>
      <div className="mt-2 text-muted-foreground leading-5">
        {recommendation.nextProblem.prompt}
      </div>
      <div className="mt-3 grid gap-1 text-muted-foreground">
        <div>追问难度：{formatDifficulty(recommendation.adaptiveTeaching.questionDifficulty)}</div>
        <div>讲解方式：{formatExplanationStyle(recommendation.adaptiveTeaching.explanationStyle)}</div>
        <div>
          完整解析：
          {recommendation.adaptiveTeaching.canShowFullSolution ? "可在尝试后开放" : "先暂不开放"}
        </div>
      </div>
      {recommendation.heartbeat.enabled && (
        <div className="mt-3 rounded-md border border-amber-200/70 bg-amber-50 px-2 py-2 text-amber-900 leading-5 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          {recommendation.heartbeat.message}
          {recommendation.heartbeat.nextCheckInAt && (
            <div className="mt-1 opacity-80">
              下次提醒：{formatDate(recommendation.heartbeat.nextCheckInAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </div>
      {children}
    </section>
  );
}

function PlanItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="ms-card flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 text-muted-foreground text-xs">{value}</span>
    </div>
  );
}

function AtomChip({ id, label }: { id: string; label: string }) {
  return (
    <div className="ms-card flex items-center justify-between rounded-md border px-3 py-2">
      <span className="font-medium text-xs">{id}</span>
      <span className="max-w-36 truncate text-muted-foreground text-xs">
        {label}
      </span>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border/60 bg-background/50 px-3 py-3 text-muted-foreground text-xs leading-5">
      {text}
    </div>
  );
}

function buildPlanItems(
  workbenchSummary: StudentWorkbenchSummary | null,
  recommendation: LearnerRecommendation | null,
  hasLatestDiagnosis: boolean
) {
  const plan = workbenchSummary?.recommendedPlan ?? [];
  if (plan.length) {
    return plan;
  }
  if (recommendation) {
    return [
      recommendation.nextProblem.title,
      recommendation.reviewPlan.reason,
      recommendation.adaptiveTeaching.fullSolutionReason,
    ];
  }
  if (hasLatestDiagnosis) {
    return ["完成订正卡", "做 2 道同因变式", "复盘第一错步"];
  }
  return [];
}

function formatWeeklyState(state: string) {
  if (state === "needs_review") {
    return "待复核";
  }

  if (state === "active") {
    return "训练中";
  }

  return "新手期";
}

function formatDifficulty(value: LearnerRecommendation["adaptiveTeaching"]["questionDifficulty"]) {
  const labels = {
    micro: "微脚手架",
    standard: "标准追问",
    transfer: "迁移追问",
    challenge: "挑战迁移",
  };
  return labels[value];
}

function formatExplanationStyle(value: LearnerRecommendation["adaptiveTeaching"]["explanationStyle"]) {
  const labels = {
    micro_scaffold: "小步纠偏",
    socratic_standard: "苏格拉底追问",
    visual_first: "先看图再推理",
    variant_first: "先做变式",
  };
  return labels[value];
}

function formatRisk(value: LearnerRecommendation["recurrencePrediction"]["risk"]) {
  if (value === "high") {
    return "高复发";
  }
  if (value === "medium") {
    return "中复发";
  }
  return "低复发";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
