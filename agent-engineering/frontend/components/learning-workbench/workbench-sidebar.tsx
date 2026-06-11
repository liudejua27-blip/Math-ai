"use client";

import type React from "react";
import type { CSSProperties } from "react";
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
  const hasDiagnosis =
    Boolean(latestDiagnosis) && !(latestDiagnosis && "error" in latestDiagnosis);
  const latestAtoms =
    latestDiagnosis && !("error" in latestDiagnosis)
      ? latestDiagnosis.misconceptionAtoms.slice(0, 4)
      : [];
  const planItems =
    workbenchSummary?.recommendedPlan.length
      ? workbenchSummary.recommendedPlan
      : hasDiagnosis
        ? ["完成订正卡", "做 2 道同因变式", "复盘第一错步"]
        : [];
  const geometryLabs =
    latestDiagnosis && !("error" in latestDiagnosis)
      ? (latestDiagnosis.recommendedGeometryLabs ?? []).slice(0, 2)
      : [];

  return (
    <aside
      className={cn(
        "ds-sidebar hidden h-dvh shrink-0 flex-col border-r xl:flex",
        className
      )}
      style={{ "--workbench-sidebar-width": `${width ?? 288}px`, width } as CSSProperties}
    >
      <div className="border-border/50 border-b px-4 py-3">
        <div className="font-semibold text-sm">Math-SEARAG Workbench</div>
        <div className="mt-1 text-muted-foreground text-xs">
          高中数学思维诊断操作台
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
            <div className="ds-card rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-sm">当前学习状态</div>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary text-xs">
                  {formatWeeklyState(workbenchSummary.profile.weeklyState)}
                </span>
              </div>
              <div className="mt-2 text-muted-foreground text-xs leading-5">
                画像会根据错因复发、变式迁移和订正表现持续更新。
              </div>
            </div>
          ) : (
            <EmptyState text="完成一次诊断后生成画像。" />
          )}
        </SidebarSection>

        <SidebarSection title="高频错因原子">
          {workbenchSummary?.topAtoms.length ? (
            <div className="grid gap-2">
              {workbenchSummary.topAtoms.map((atom) => (
                <div className="ds-card rounded-md border px-3 py-2" key={atom.id}>
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
            <EmptyState text="暂无错因记录，先输入题目和自己的步骤。" />
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
                  className="ds-card rounded-md border px-3 py-2 transition hover:border-primary/40"
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
    <div className="ds-card flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <span className="min-w-0 truncate">{label}</span>
      <span className="shrink-0 text-muted-foreground text-xs">{value}</span>
    </div>
  );
}

function AtomChip({ id, label }: { id: string; label: string }) {
  return (
    <div className="ds-card flex items-center justify-between rounded-md border px-3 py-2">
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

function formatWeeklyState(state: string) {
  if (state === "needs_review") {
    return "待复核";
  }

  if (state === "active") {
    return "训练中";
  }

  return "新手期";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
