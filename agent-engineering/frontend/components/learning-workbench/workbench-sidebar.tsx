"use client";

import type { MathDiagnosisToolResult } from "@/lib/ai/math-diagnosis-types";
import { cn } from "@/lib/utils";

type LearningWorkbenchSidebarProps = {
  result: MathDiagnosisToolResult | null;
  className?: string;
};

const defaultAtoms = [
  { id: "A07", label: "定义域意识" },
  { id: "A11", label: "跳步结论" },
  { id: "A18", label: "参数分类" },
  { id: "A34", label: "立体几何转换" },
];

export function LearningWorkbenchSidebar({
  result,
  className,
}: LearningWorkbenchSidebarProps) {
  const atoms =
    result && !("error" in result) && result.misconceptionAtoms.length > 0
      ? result.misconceptionAtoms.slice(0, 5)
      : defaultAtoms;

  return (
    <aside
      className={cn(
        "hidden h-dvh w-72 shrink-0 flex-col border-border/60 border-r bg-sidebar/95 xl:flex",
        className
      )}
    >
      <div className="border-border/50 border-b px-4 py-3">
        <div className="font-semibold text-sm">Math-SEARAG Workbench</div>
        <div className="mt-1 text-muted-foreground text-xs">
          高中数学思维诊断操作台
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <SidebarSection title="学生画像">
          <div className="rounded-lg border border-border/60 bg-background/70 p-3">
            <div className="font-medium text-sm">当前学生</div>
            <div className="mt-1 text-muted-foreground text-xs leading-5">
              画像由错因复发率、迁移率和自我修正率更新。接入 studentId 后会生成本次 delta。
            </div>
          </div>
        </SidebarSection>

        <SidebarSection title="高频错因">
          <div className="grid gap-2">
            {atoms.map((atom) => (
              <div
                className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 px-3 py-2"
                key={atom.id}
              >
                <span className="font-medium text-xs">{atom.id}</span>
                <span className="max-w-36 truncate text-muted-foreground text-xs">
                  {atom.label}
                </span>
              </div>
            ))}
          </div>
        </SidebarSection>

        <SidebarSection title="本周训练计划">
          <div className="grid gap-2 text-sm">
            <PlanItem label="首错定位" value="每天 2 题" />
            <PlanItem label="同因变式" value="4 级递进" />
            <PlanItem label="几何实验" value="按 A34 推荐" />
          </div>
        </SidebarSection>

        <SidebarSection title="题型入口">
          <div className="grid grid-cols-2 gap-2">
            {["导数", "函数", "不等式", "立体几何", "解析几何", "数列"].map(
              (topic) => (
                <button
                  className="rounded-md border border-border/50 bg-background/70 px-2 py-2 text-xs transition hover:border-primary/40 hover:text-primary"
                  key={topic}
                  type="button"
                >
                  {topic}
                </button>
              )
            )}
          </div>
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
    <div className="flex items-center justify-between rounded-md border border-border/50 bg-background/70 px-3 py-2">
      <span>{label}</span>
      <span className="text-muted-foreground text-xs">{value}</span>
    </div>
  );
}

