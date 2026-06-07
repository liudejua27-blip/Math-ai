"use client";

import type React from "react";
import type {
  HtmlMathCardSpec,
  MathDiagnosisResult,
} from "@/lib/ai/math-diagnosis-types";
import type { SocraticPolicyDecision } from "@/lib/ai/socratic-policy-engine";
import { cn } from "@/lib/utils";
import { MessageResponse } from "../ai-elements/message";
import { MathThinkingGraph } from "../chat/math-thinking-graph";

export function FirstWrongStepPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  return (
    <InfoBlock title="第一断点">
      <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm leading-6">
        <div className="font-medium">
          {result.firstWrongStep ?? "暂未定位第一断点"}
        </div>
        {result.firstWrongReason && (
          <div className="mt-1 text-muted-foreground">
            {result.firstWrongReason}
          </div>
        )}
      </div>
    </InfoBlock>
  );
}

export function PolicyPanel({
  policy,
}: {
  policy: SocraticPolicyDecision;
}) {
  return (
    <InfoBlock title="教学策略">
      <div className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm leading-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{policy.mode}</span>
          {!policy.allowedContent.canShowFullSolution && (
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 text-xs dark:text-amber-300">
              暂不展示完整解析
            </span>
          )}
        </div>
        <div className="mt-1 text-muted-foreground">{policy.reason}</div>
        {policy.nextPrompts.length > 0 && (
          <div className="mt-2 text-muted-foreground">
            下一问：{policy.nextPrompts[0]}
          </div>
        )}
      </div>
    </InfoBlock>
  );
}

export function SocraticQuestionsPanel({
  questions,
}: {
  questions: string[];
}) {
  return (
    <InfoBlock title="苏格拉底追问">
      <ol className="grid gap-2">
        {questions.map((question, index) => (
          <li
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm leading-6"
            key={`${question}-${index}`}
          >
            {question}
          </li>
        ))}
      </ol>
    </InfoBlock>
  );
}

export function MisconceptionAtomsPanel({
  result,
  limit = 8,
}: {
  result: MathDiagnosisResult;
  limit?: number;
}) {
  return (
    <InfoBlock title="错因原子">
      <div className="flex flex-wrap gap-2">
        {result.misconceptionAtoms.slice(0, limit).map((atom) => (
          <span
            className="rounded-md border border-red-200/60 bg-red-50 px-2.5 py-1 text-red-700 text-xs dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
            key={atom.id}
            title={atom.description}
          >
            {atom.label || atom.id}
          </span>
        ))}
      </div>
    </InfoBlock>
  );
}

export function StrictChecksPanel({
  result,
  failedOnly = false,
  limit = 6,
}: {
  result: MathDiagnosisResult;
  failedOnly?: boolean;
  limit?: number;
}) {
  const checks = failedOnly
    ? result.strictChecks.filter((check) => check.status === "fail")
    : result.strictChecks;

  if (checks.length === 0) {
    return null;
  }

  return (
    <InfoBlock title={failedOnly ? "未通过门禁" : "严格门禁"}>
      <div className="grid gap-2">
        {checks.slice(0, limit).map((check) => (
          <div
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            key={check.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{check.label}</span>
              <StatusBadge status={check.status} />
            </div>
            <div className="mt-1 text-muted-foreground leading-6">
              {check.reason}
            </div>
          </div>
        ))}
      </div>
    </InfoBlock>
  );
}

export function VerifierTracePanel({
  result,
  limit = 6,
}: {
  result: MathDiagnosisResult;
  limit?: number;
}) {
  return (
    <InfoBlock title="验证链">
      <div className="grid gap-2">
        {result.verifierTraces.slice(0, limit).map((trace) => (
          <div
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            key={trace.id}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{trace.claim}</span>
              <StatusBadge status={trace.status} />
              <span className="text-muted-foreground text-xs">
                {trace.verifier}
              </span>
            </div>
            {trace.failureReason && (
              <div className="mt-1 text-muted-foreground leading-6">
                {trace.failureReason}
              </div>
            )}
            <div className="mt-1 text-muted-foreground text-xs">
              evidence: {trace.evidenceIds.join(", ") || "none"}
            </div>
          </div>
        ))}
      </div>
    </InfoBlock>
  );
}

export function LearnerMemoryPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  if (!result.learnerMemoryDelta) {
    return null;
  }

  return (
    <InfoBlock title="学习画像更新">
      <div className="grid gap-2">
        {result.learnerMemoryDelta.atomUpdates.slice(0, 4).map((delta) => (
          <div
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            key={delta.atomId}
          >
            <div className="font-medium">
              {delta.label} · {delta.mastery}
            </div>
            <div className="mt-1 text-muted-foreground leading-6">
              recurrence {Math.round(delta.recurrenceRate30d * 100)}%，transfer{" "}
              {Math.round(delta.transferRate * 100)}%
            </div>
          </div>
        ))}
      </div>
    </InfoBlock>
  );
}

export function RemediationPlanPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  if (!result.remediationPlan) {
    return null;
  }

  return (
    <InfoBlock title="下一步训练计划">
      <div className="grid gap-2">
        {result.remediationPlan.items.slice(0, 4).map((item, index) => (
          <div
            className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
            key={`${item.atomId}-${item.level}-${index}`}
          >
            <div className="font-medium">
              L{item.level} · {item.title}
            </div>
            <div className="mt-1 text-muted-foreground leading-6">
              {item.prompt}
            </div>
          </div>
        ))}
      </div>
    </InfoBlock>
  );
}

export function GeometryLabRecommendationPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  if (!result.recommendedGeometryLabs?.length) {
    return null;
  }

  return (
    <InfoBlock title="Geometry Lab 推荐">
      <div className="grid gap-2">
        {result.recommendedGeometryLabs.slice(0, 3).map((lab) => (
          <a
            className="rounded-md border border-cyan-200/70 bg-cyan-50 px-3 py-2 text-sm leading-6 transition hover:border-cyan-400 dark:border-cyan-900/70 dark:bg-cyan-950/30"
            href={`/geometry-lab?level=${encodeURIComponent(lab.levelId)}`}
            key={lab.levelId}
          >
            <div className="font-medium text-cyan-800 dark:text-cyan-100">
              {lab.levelId} · {lab.title}
            </div>
            <div className="mt-1 text-cyan-900/75 dark:text-cyan-100/75">
              {lab.reason}
            </div>
          </a>
        ))}
      </div>
    </InfoBlock>
  );
}

export function CorrectionCardPanel({
  card,
  compact,
}: {
  card: HtmlMathCardSpec;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/70 bg-background",
        compact ? "mt-3 p-3" : "p-4"
      )}
    >
      <div className="font-semibold text-sm">{card.title}</div>
      <div className="mt-3 grid gap-2">
        {card.blocks.map((block, index) => {
          if (block.kind === "thinking_graph") {
            return (
              <MathThinkingGraph
                graph={block.graph}
                key={`${block.kind}-${index}`}
              />
            );
          }

          return (
            <div
              className={cn(
                "rounded-md px-3 py-2 text-sm leading-6",
                block.kind === "wrong_step" &&
                  "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-100",
                block.kind === "socratic_question" &&
                  "bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100",
                block.kind === "correction_step" &&
                  "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
                block.kind === "variant" &&
                  "bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
                block.kind === "problem" && "bg-muted/50"
              )}
              key={`${block.kind}-${index}`}
            >
              {"title" in block && (
                <div className="mb-1 font-medium">{block.title}</div>
              )}
              <MessageResponse>
                {"text" in block ? block.text : ""}
              </MessageResponse>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-md px-2 py-0.5 font-medium text-xs",
        status === "pass" &&
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        status === "fail" && "bg-red-500/10 text-red-700 dark:text-red-300",
        status === "warn" &&
          "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        status === "not_checked" && "bg-muted text-muted-foreground"
      )}
    >
      {status}
    </span>
  );
}

export function InfoBlock({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div>
      <div className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}

