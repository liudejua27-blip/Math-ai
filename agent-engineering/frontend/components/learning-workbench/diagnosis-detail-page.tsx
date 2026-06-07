"use client";

import type { DiagnosisSessionDetail } from "@/lib/ai/student-workbench-types";
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

export function DiagnosisDetailPage({
  detail,
}: {
  detail: DiagnosisSessionDetail;
}) {
  const { result } = detail;

  return (
    <main className="min-h-dvh bg-sidebar px-4 py-6">
      <div className="mx-auto grid w-full max-w-6xl gap-4">
        <div className="rounded-lg border border-border/70 bg-background p-4">
          <a
            className="text-muted-foreground text-xs transition hover:text-foreground"
            href="/"
          >
            返回学习工作台
          </a>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-semibold text-xl">诊断详情</h1>
              <div className="mt-1 text-muted-foreground text-sm">
                {new Intl.DateTimeFormat("zh-CN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(detail.createdAt))}
              </div>
            </div>
            <span className="rounded-md bg-blue-500/10 px-2 py-1 font-medium text-blue-700 text-xs dark:text-blue-300">
              confidence {Math.round(result.confidence * 100)}%
            </span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="grid gap-4">
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <div className="font-medium text-sm">题目</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {detail.problemText}
              </p>
            </div>
            <div className="rounded-lg border border-border/70 bg-background p-4">
              <div className="font-medium text-sm">学生步骤</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {detail.studentSteps || "未记录学生步骤"}
              </p>
            </div>
            <CorrectionCardPanel card={result.correctionCard} />
          </section>

          <aside className="grid content-start gap-4">
            <FirstWrongStepPanel result={result} />
            <StepAlignmentDetailsPanel result={result} />
            <PolicyPanel policy={result.policyDecision} />
            <MisconceptionAtomsPanel result={result} />
            <StrictChecksPanel result={result} />
            <VerifierTracePanel result={result} />
            <LearnerMemoryPanel result={result} />
            <RemediationPlanPanel result={result} />
            <GeometryLabRecommendationPanel result={result} />
          </aside>
        </div>
      </div>
    </main>
  );
}
