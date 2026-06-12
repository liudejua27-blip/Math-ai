"use client";

import type React from "react";
import {
  BrainIcon,
  FlaskConicalIcon,
  GraduationCapIcon,
  HistoryIcon,
  PanelRightOpenIcon,
  PaperclipIcon,
  RouteIcon,
  SendIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";

export function WorkbenchPreviewPage() {
  return (
    <main className="flex h-dvh w-full overflow-hidden bg-[var(--ms-bg-app)] text-foreground">
      <aside className="hidden w-[276px] shrink-0 flex-col border-r border-border/55 bg-sidebar/80 px-3 py-4 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <GraduationCapIcon className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-sm">数学思维导师</div>
            <div className="text-muted-foreground text-xs">agent-first 私教界面</div>
          </div>
        </div>

        <button
          className="mt-5 flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 font-medium text-primary-foreground text-sm shadow-sm"
          type="button"
        >
          <SparklesIcon className="size-4" />
          新建诊断
        </button>

        <nav className="mt-5 grid gap-1.5">
          <RailItem active icon={<BrainIcon className="size-4" />} label="AI 私教线程" />
          <RailItem icon={<TargetIcon className="size-4" />} label="错因画像" />
          <RailItem icon={<RouteIcon className="size-4" />} label="变式训练" />
          <RailItem icon={<FlaskConicalIcon className="size-4" />} label="Geometry Lab" />
          <RailItem icon={<HistoryIcon className="size-4" />} label="诊断历史" />
        </nav>

        <div className="mt-5 rounded-2xl border border-border/55 bg-card/70 p-3 shadow-[var(--shadow-card)]">
          <div className="font-medium text-sm">当前学习记忆</div>
          <div className="mt-3 grid gap-2">
            <MemoryRow label="A18 参数分类缺失" value="需要复盘" />
            <MemoryRow label="A07 定义域意识" value="正在修复" />
            <MemoryRow label="下一题推荐" value="表层同因题" />
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col px-3 py-3 md:px-5 md:py-4">
        <header className="flex shrink-0 items-center justify-between gap-3 rounded-2xl border border-border/55 bg-card/80 px-4 py-3 shadow-[var(--shadow-card)] backdrop-blur-xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <h1 className="truncate font-semibold text-base">AI 数学思维导师</h1>
            </div>
            <div className="mt-1 truncate text-muted-foreground text-xs">
              预览模式 · 学生只需要发题目、步骤或草稿图片
            </div>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-border/55 bg-background px-3 py-2 font-medium text-xs"
            type="button"
          >
            <PanelRightOpenIcon className="size-4" />
            诊断过程
          </button>
        </header>

        <div className="relative mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/55 bg-background shadow-[var(--shadow-float)]">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8">
            <div className="mx-auto flex max-w-3xl flex-col gap-5">
              <div className="text-center">
                <div className="font-semibold text-2xl tracking-tight">
                  你的 AI 高中数学思维导师
                </div>
                <div className="mx-auto mt-3 max-w-xl text-muted-foreground text-sm leading-6">
                  直接发题目、草稿图片或自己的解题步骤。Agent 会先确认你的思路，再定位第一错步，而不是一上来灌答案。
                </div>
              </div>

              <div className="rounded-2xl border border-border/55 bg-card/75 p-4 shadow-[var(--shadow-card)]">
                <div className="text-muted-foreground text-xs">学生输入</div>
                <div className="mt-2 text-sm leading-6">
                  已知函数 f(x)=x^3-3ax 在 [-2,2] 上求最值。我写到 S2：所以 a 一定大于 0，答案就是 a&gt;0。
                </div>
              </div>

              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-[var(--shadow-card)]">
                <div className="text-primary text-xs">AI 私教</div>
                <div className="mt-2 text-sm leading-6">
                  我先不直接给完整答案。第一处需要停下来的地方是 S2：你把“存在临界点”直接当成“最终参数范围”。先回答一个小问题：临界点一定落在 [-2,2] 里面吗？
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <PreviewCard title="第一错步" value="S2 跳步结论" />
                <PreviewCard title="错因原子" value="A18 参数分类缺失" />
                <PreviewCard title="下一题" value="同因表层变式" />
              </div>
            </div>
          </div>

          <div className="mx-auto w-full max-w-3xl px-4 pb-5">
            <div className="rounded-2xl border border-border/55 bg-card/85 p-3 shadow-[var(--shadow-composer)] backdrop-blur">
              <div className="min-h-20 text-muted-foreground text-sm">
                输入题目、粘贴步骤，或上传草稿图片...
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button className="rounded-xl border border-border/55 p-2" type="button">
                  <PaperclipIcon className="size-4" />
                </button>
                <button
                  className="rounded-xl bg-primary p-2 text-primary-foreground"
                  type="button"
                >
                  <SendIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function RailItem({
  active,
  icon,
  label,
}: {
  active?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={
        active
          ? "flex items-center gap-2 rounded-xl bg-sidebar-accent px-3 py-2 text-sidebar-accent-foreground text-sm"
          : "flex items-center gap-2 rounded-xl px-3 py-2 text-sidebar-foreground/75 text-sm"
      }
    >
      {icon}
      {label}
    </div>
  );
}

function MemoryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/45 bg-background/60 px-3 py-2">
      <div className="truncate font-medium text-xs">{label}</div>
      <div className="mt-1 text-muted-foreground text-[11px]">{value}</div>
    </div>
  );
}

function PreviewCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/55 bg-card/75 p-4">
      <div className="text-muted-foreground text-xs">{title}</div>
      <div className="mt-2 font-medium text-sm">{value}</div>
    </div>
  );
}
