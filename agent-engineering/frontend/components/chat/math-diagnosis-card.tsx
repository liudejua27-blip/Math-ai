"use client";

import type { MathDiagnosisToolResult } from "@/lib/ai/math-diagnosis-types";
import {
  CorrectionCardPanel,
  GeometryLabRecommendationPanel,
  LearnerMemoryPanel,
  MisconceptionAtomsPanel,
  PolicyPanel,
  RemediationPlanPanel,
  SocraticQuestionsPanel,
  StrictChecksPanel,
  VerifierTracePanel,
} from "../learning-workbench/math-diagnosis-panels";

type MathDiagnosisCardProps = {
  result: MathDiagnosisToolResult;
};

export function MathDiagnosisCard({ result }: MathDiagnosisCardProps) {
  if ("error" in result) {
    return (
      <section className="w-full rounded-lg border border-amber-300/40 bg-amber-50/70 p-4 text-amber-950 shadow-sm dark:bg-amber-950/20 dark:text-amber-100">
        <div className="font-semibold text-sm">需要补充信息</div>
        <p className="mt-1 text-sm leading-6">{result.message}</p>
        {result.policyDecision && <PolicyPanel policy={result.policyDecision} />}
        {result.correctionCard && (
          <CorrectionCardPanel card={result.correctionCard} compact={true} />
        )}
      </section>
    );
  }

  return (
    <section className="w-full max-w-3xl overflow-hidden rounded-lg border border-border/70 bg-card shadow-[var(--shadow-card)]">
      <header className="border-border/70 border-b bg-muted/35 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-emerald-500/10 px-2 py-1 font-medium text-emerald-700 text-xs dark:text-emerald-300">
            Math-SEARAG 诊断
          </span>
          {result.needHumanReview && (
            <span className="rounded-md bg-amber-500/10 px-2 py-1 font-medium text-amber-700 text-xs dark:text-amber-300">
              需要复核
            </span>
          )}
          <span className="text-muted-foreground text-xs">
            置信度 {Math.round(result.confidence * 100)}%
          </span>
        </div>
        <h3 className="mt-2 font-semibold text-base">
          {result.firstWrongStep
            ? `第一断点：${result.firstWrongStep}`
            : "暂未定位第一断点"}
        </h3>
        {result.firstWrongReason && (
          <p className="mt-1 text-muted-foreground text-sm leading-6">
            {result.firstWrongReason}
          </p>
        )}
      </header>

      <div className="grid gap-4 p-4">
        <PolicyPanel policy={result.policyDecision} />
        <SocraticQuestionsPanel questions={result.socraticQuestions} />
        <MisconceptionAtomsPanel limit={6} result={result} />
        <StrictChecksPanel failedOnly={true} limit={4} result={result} />
        <VerifierTracePanel limit={6} result={result} />
        <LearnerMemoryPanel result={result} />
        <RemediationPlanPanel result={result} />
        <GeometryLabRecommendationPanel result={result} />
        <CorrectionCardPanel card={result.correctionCard} />
      </div>
    </section>
  );
}

