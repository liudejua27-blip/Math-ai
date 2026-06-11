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
      <div className="ds-card rounded-md border px-3 py-2 text-sm leading-6">
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
      <div className="ds-card rounded-md border px-3 py-2 text-sm leading-6">
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
            className="ds-card rounded-md border px-3 py-2 text-sm leading-6"
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

export function StepAlignmentDetailsPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  if (!result.stepAlignmentDetails?.length) {
    return null;
  }

  return (
    <InfoBlock title="Step Alignment">
      <div className="grid gap-2">
        {result.stepAlignmentDetails.slice(0, 4).map((step) => (
          <div className="ds-card rounded-md border px-3 py-2 text-sm" key={step.stepId}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{step.stepId}</span>
              <StatusBadge status={step.status} />
              {step.expression && (
                <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
                  {step.expression}
                </span>
              )}
            </div>
            <div className="mt-1 text-muted-foreground leading-6">
              {step.sentence}
            </div>
            <div className="mt-2 grid gap-1.5">
              {step.claims.slice(0, 3).map((claim) => (
                <div
                  className="rounded-md bg-muted/45 px-2 py-1.5 text-xs leading-5"
                  key={claim.id}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {formatClaimType(claim.claimType)}
                    </span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {claim.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          <div className="ds-card rounded-md border px-3 py-2 text-sm" key={check.id}>
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
          <div className="ds-card rounded-md border px-3 py-2 text-sm" key={trace.id}>
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
          <div className="ds-card rounded-md border px-3 py-2 text-sm" key={delta.atomId}>
            <div className="font-medium">
              {delta.label} · {formatMastery(delta.mastery)}
            </div>
            <div className="mt-1 text-muted-foreground leading-6">
              复发率 {Math.round(delta.recurrenceRate30d * 100)}% · 迁移率{" "}
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
            className="ds-card rounded-md border px-3 py-2 text-sm"
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
        "ds-card rounded-lg border",
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
      {formatStatus(status)}
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

function formatStatus(status: string) {
  if (status === "pass") {
    return "通过";
  }

  if (status === "fail") {
    return "失败";
  }

  if (status === "warn") {
    return "需确认";
  }

  if (status === "not_checked") {
    return "未验证";
  }

  return status;
}

function formatClaimType(type: string) {
  const labels: Record<string, string> = {
    equivalence_transform: "等价变形",
    condition_omission: "条件遗漏",
    domain: "定义域",
    classification: "分类讨论",
    monotonicity_extremum: "单调性与最值",
    derivative_geometric_meaning: "导数几何意义",
    sequence_recursion_induction: "数列递推与归纳",
    conic_condition_transform: "圆锥曲线条件转化",
    trig_identity_transform: "三角恒等变形",
    probability_reading: "概率统计读题",
    geometry_vector_method_mismatch: "空间向量/传统几何混用",
    geometry_relation: "几何关系",
    proof_step: "证明步骤",
  };

  return labels[type] ?? type;
}

function formatMastery(mastery: string) {
  const labels: Record<string, string> = {
    weak: "正在修复",
    improving: "趋于稳定",
    stable: "稳定掌握",
    mastered: "已掌握",
  };

  return labels[mastery] ?? mastery;
}
