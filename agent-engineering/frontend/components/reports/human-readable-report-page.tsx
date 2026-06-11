import {
  buildHumanReadableLearningReports,
  type AudienceLearningReport,
} from "@/lib/reports/human-readable-learning-report";
import type { StudentWorkbenchSummary } from "@/lib/ai/student-workbench-types";

const demoSummary: StudentWorkbenchSummary = {
  profile: {
    id: "demo-profile",
    userId: "demo-user",
    grade: "高二",
    targetExam: "新高考",
    weeklyState: "active",
    masterySummary: {},
    updatedAt: new Date("2026-06-11T00:00:00.000Z").toISOString(),
  },
  topAtoms: [
    {
      id: "m1",
      atomId: "A34",
      atomLabel: "二面角对象识别",
      recurrenceCount: 3,
      lastSeenAt: new Date("2026-06-10T00:00:00.000Z").toISOString(),
      mastery: "weak",
      masteryLabel: "连续复发",
      transferRate: 0.28,
      selfRepairRate: 0.36,
      status: "active",
    },
    {
      id: "m2",
      atomId: "A07",
      atomLabel: "定义域意识",
      recurrenceCount: 2,
      lastSeenAt: new Date("2026-06-09T00:00:00.000Z").toISOString(),
      mastery: "improving",
      masteryLabel: "正在修复",
      transferRate: 0.52,
      selfRepairRate: 0.58,
      status: "active",
    },
  ],
  recentDiagnoses: [
    {
      id: "d1",
      sourceJobId: "job-demo-1",
      createdAt: new Date("2026-06-10T00:00:00.000Z").toISOString(),
      problemPreview: "正方体中求线面角的几何题",
      firstWrongStep: "S2",
      confidence: 0.82,
      needHumanReview: false,
      atomIds: ["A34"],
      atomLabels: ["二面角对象识别"],
    },
    {
      id: "d2",
      sourceJobId: "job-demo-2",
      createdAt: new Date("2026-06-09T00:00:00.000Z").toISOString(),
      problemPreview: "含 ln x 的导数题",
      firstWrongStep: "S1",
      confidence: 0.78,
      needHumanReview: false,
      atomIds: ["A07"],
      atomLabels: ["定义域意识"],
    },
  ],
  weeklyReport: null,
  recommendedPlan: [
    "先复盘二面角对象识别，再做 1 道基础同类题。",
    "围绕定义域意识做 2 道换情境变式题。",
  ],
};

export function HumanReadableReportPage() {
  const reports = buildHumanReadableLearningReports(demoSummary);

  return (
    <main className="min-h-screen bg-[var(--ms-bg-app)] px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <header>
          <div className="text-muted-foreground text-sm">Math-SEARAG</div>
          <h1 className="mt-2 font-semibold text-2xl">家长/老师端学习报告</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground text-sm leading-6">
            这里展示学习结论、孩子最近的变化和下一步建议。报告面向真实沟通场景，不展示工程诊断过程。
          </p>
        </header>
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportCard report={reports.parent} />
          <ReportCard report={reports.teacher} />
        </div>
      </div>
    </main>
  );
}

function ReportCard({ report }: { report: AudienceLearningReport }) {
  return (
    <section className="ms-card border p-5">
      <div className="text-muted-foreground text-xs">
        {report.audience === "parent" ? "家长端" : "老师端"}
      </div>
      <h2 className="mt-2 font-semibold text-xl">{report.title}</h2>
      <p className="mt-3 text-sm leading-6">{report.summary}</p>
      <ReportList items={report.strengths} title="已经做得好的地方" />
      <ReportList items={report.concerns} title="需要重点关注" />
      <ReportList items={report.recommendedActions} title="下一步建议" />
      <ReportList items={report.recentExamples} title="最近例子" />
      <div className="mt-4 rounded-md bg-muted/50 px-3 py-2 text-sm leading-6">
        {report.nextCheckIn}
      </div>
    </section>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <div className="font-medium text-sm">{title}</div>
      <ul className="mt-2 grid gap-2 text-muted-foreground text-sm leading-6">
        {items.map((item) => (
          <li className="rounded-md bg-muted/35 px-3 py-2" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
