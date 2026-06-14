"use client";

import type React from "react";
import type {
  ClaimTrace,
  FunctionVisualExplanationSpec,
  HtmlMathCardSpec,
  MathDiagnosisResult,
  MathSolutionComparison,
  MathSolutionMethod,
  VisualExplanationSpec,
} from "@/lib/ai/math-diagnosis-types";
import type { SocraticPolicyDecision } from "@/lib/ai/socratic-policy-engine";
import { cn } from "@/lib/utils";
import { MessageResponse } from "../ai-elements/message";
import { MathThinkingGraph } from "./math-thinking-graph";

export function FirstWrongStepPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  return (
    <InfoBlock title="第一断点">
      <div className="ms-card rounded-md border px-3 py-2 text-sm leading-6">
        <div className="font-medium">
          {result.firstWrongStep ?? "暂未定位第一错步"}
        </div>
        {result.firstWrongReason && (
          <div className="mt-1 text-muted-foreground">
            {result.firstWrongReason}
          </div>
        )}
        <div className="mt-2 text-muted-foreground text-xs">
          置信度 {Math.round(result.confidence * 100)}%
          {result.needHumanReview ? "，建议人工复核" : ""}
        </div>
      </div>
    </InfoBlock>
  );
}

export function PolicyPanel({ policy }: { policy: SocraticPolicyDecision }) {
  return (
    <InfoBlock title="教学策略">
      <div className="ms-card rounded-md border px-3 py-2 text-sm leading-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{formatPolicyMode(policy.mode)}</span>
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

export function SocraticQuestionsPanel({ questions }: { questions: string[] }) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <InfoBlock title="苏格拉底追问">
      <ol className="grid gap-2">
        {questions.map((question, index) => (
          <li
            className="ms-card rounded-md border px-3 py-2 text-sm leading-6"
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
  if (result.misconceptionAtoms.length === 0) {
    return null;
  }

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
          <div
            className="ms-card rounded-md border px-3 py-2 text-sm"
            key={step.stepId}
          >
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
                <ClaimTraceBlock claim={claim} key={claim.id} />
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
          <div
            className="ms-card rounded-md border px-3 py-2 text-sm"
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
  if (result.verifierTraces.length === 0) {
    return null;
  }

  return (
    <InfoBlock title="验证链">
      <div className="grid gap-2">
        {result.verifierTraces.slice(0, limit).map((trace) => (
          <div
            className="ms-card rounded-md border px-3 py-2 text-sm"
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
  const recommendation = result.learnerMemoryGuidance?.recommendation;

  return (
    <InfoBlock title="学习画像与推荐">
      <div className="grid gap-2">
        {result.learnerMemoryDelta.atomUpdates.slice(0, 4).map((delta) => (
          <div
            className="ms-card rounded-md border px-3 py-2 text-sm"
            key={delta.atomId}
          >
            <div className="font-medium">
              {delta.label} · {formatMastery(delta.mastery)}
            </div>
            <div className="mt-1 text-muted-foreground leading-6">
              复发率 {Math.round(delta.recurrenceRate30d * 100)}% · 迁移率{" "}
              {Math.round(delta.transferRate * 100)}%
            </div>
          </div>
        ))}
        {recommendation && (
          <div className="ms-card rounded-md border px-3 py-2 text-sm">
            <div className="font-medium">
              下一题推荐：{recommendation.nextProblem.title}
            </div>
            <div className="mt-1 text-muted-foreground leading-6">
              {recommendation.nextProblem.prompt}
            </div>
            <div className="mt-2 grid gap-1 text-muted-foreground text-xs">
              <div>
                追问难度：{recommendation.adaptiveTeaching.questionDifficulty}
              </div>
              <div>
                讲解方式：{recommendation.adaptiveTeaching.explanationStyle}
              </div>
              <div>
                完整解析：
                {recommendation.adaptiveTeaching.canShowFullSolution
                  ? "允许在学生尝试后开放"
                  : "暂不开放，先追问和变式"}
              </div>
              <div>
                复发预测：{recommendation.recurrencePrediction.risk} ·{" "}
                {Math.round(recommendation.recurrencePrediction.score * 100)}%
              </div>
            </div>
            {recommendation.heartbeat.enabled && (
              <div className="mt-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-amber-800 text-xs leading-5 dark:text-amber-200">
                {recommendation.heartbeat.message}
              </div>
            )}
          </div>
        )}
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
            className="ms-card rounded-md border px-3 py-2 text-sm"
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

export function SolutionMethodsPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  if (!result.solutionMethods?.length || !result.solutionComparison) {
    return null;
  }

  return (
    <InfoBlock title="推荐解法 / 最快解法">
      <div className="grid gap-2">
        <SolutionComparisonBlock comparison={result.solutionComparison} />
        {result.solutionMethods.map((method) => (
          <SolutionMethodBlock key={method.id} method={method} />
        ))}
      </div>
    </InfoBlock>
  );
}

export function VisualExplanationPanel({
  spec,
}: {
  spec?: VisualExplanationSpec;
}) {
  if (!spec) {
    return null;
  }

  return (
    <InfoBlock title="图上讲解">
      <VisualExplanationBlock spec={spec} />
    </InfoBlock>
  );
}

export function FunctionVisualExplanationPanel({
  spec,
}: {
  spec?: FunctionVisualExplanationSpec;
}) {
  if (!spec) {
    return null;
  }

  return (
    <InfoBlock title="函数图上讲解">
      <FunctionVisualExplanationBlock spec={spec} />
    </InfoBlock>
  );
}

export function ExperienceQualityPanel({
  result,
}: {
  result: MathDiagnosisResult;
}) {
  if (!result.experienceQuality) {
    return null;
  }

  const report = result.experienceQuality;
  return (
    <InfoBlock title="体验质量自检">
      <div className="ms-card rounded-md border px-3 py-2 text-sm leading-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-medium">
              {report.overallScore}/100 · {qualityLevelLabel(report.level)}
            </div>
            <div className="mt-1 text-muted-foreground">{report.summary}</div>
          </div>
          <span
            className={cn(
              "rounded-md px-2 py-1 font-medium text-xs",
              report.level === "world_class_candidate" &&
                "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              report.level === "mvp_strong" &&
                "bg-blue-500/10 text-blue-700 dark:text-blue-300",
              report.level === "needs_review" &&
                "bg-amber-500/10 text-amber-700 dark:text-amber-300",
              report.level === "blocked" &&
                "bg-red-500/10 text-red-700 dark:text-red-300"
            )}
          >
            {report.level}
          </span>
        </div>
        <div className="mt-3 grid gap-2">
          {report.checks.map((check) => (
            <div className="rounded-md bg-muted/45 px-2.5 py-2" key={check.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{check.label}</span>
                <StatusBadge status={check.status} />
                <span className="text-muted-foreground text-xs">
                  {check.score}/100
                </span>
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                {check.message}
              </div>
              {check.nextAction && (
                <div className="mt-1 text-amber-700 text-xs dark:text-amber-300">
                  下一步：{check.nextAction}
                </div>
              )}
            </div>
          ))}
        </div>
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
        "ms-card rounded-lg border",
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
          if (block.kind === "visual_explanation") {
            return (
              <VisualExplanationBlock
                key={`${block.kind}-${index}`}
                spec={block.spec}
              />
            );
          }
          if (block.kind === "function_visual_explanation") {
            return (
              <FunctionVisualExplanationBlock
                key={`${block.kind}-${index}`}
                spec={block.spec}
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
                block.kind === "solution_comparison" &&
                  "bg-cyan-50 text-cyan-950 dark:bg-cyan-950/30 dark:text-cyan-50",
                block.kind === "solution_method" &&
                  "bg-slate-50 text-slate-950 dark:bg-slate-900/50 dark:text-slate-50",
                block.kind === "variant" &&
                  "bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-100",
                block.kind === "problem" && "bg-muted/50"
              )}
              key={`${block.kind}-${index}`}
            >
              {block.kind === "solution_comparison" ? (
                <SolutionComparisonBlock comparison={block.comparison} />
              ) : block.kind === "solution_method" ? (
                <SolutionMethodBlock method={block.method} />
              ) : (
                <>
                  {"title" in block && (
                    <div className="mb-1 font-medium">{block.title}</div>
                  )}
                  <MessageResponse>
                    {"text" in block ? block.text : ""}
                  </MessageResponse>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisualExplanationBlock({ spec }: { spec: VisualExplanationSpec }) {
  return (
    <div className="rounded-md border border-violet-200/70 bg-violet-50/70 px-3 py-2 text-sm leading-6 dark:border-violet-900/70 dark:bg-violet-950/25">
      <div className="font-medium text-violet-950 dark:text-violet-50">
        {spec.title}
      </div>
      <div className="mt-2 grid gap-2">
        {spec.blocks.map((block, index) => (
          <div
            className="rounded-md bg-background/75 px-2.5 py-2 text-foreground"
            key={`${block.kind}-${index}`}
          >
            <div className="font-medium text-xs">
              {visualBlockLabel(block.kind)}
            </div>
            {block.kind === "correct_path" ? (
              <>
                <div className="mt-1 text-muted-foreground text-xs">
                  {block.title}
                </div>
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  {block.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="mt-1 text-muted-foreground">
                {"text" in block ? block.text : ""}
              </div>
            )}
          </div>
        ))}
      </div>
      {spec.linkedGeometryLabLevelId && (
        <a
          className="mt-3 inline-flex rounded-full border border-violet-300 px-3 py-1 text-violet-900 text-xs transition hover:border-violet-500 dark:text-violet-100"
          href={`/geometry-lab?level=${encodeURIComponent(spec.linkedGeometryLabLevelId)}`}
        >
          打开图上讲解场景 {spec.linkedGeometryLabLevelId}
        </a>
      )}
    </div>
  );
}

function FunctionVisualExplanationBlock({
  spec,
}: {
  spec: FunctionVisualExplanationSpec;
}) {
  return (
    <div className="rounded-md border border-cyan-200/70 bg-cyan-50/70 px-3 py-2 text-cyan-950 text-sm leading-6 dark:border-cyan-900/70 dark:bg-cyan-950/25 dark:text-cyan-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-medium">{spec.title}</div>
        <span className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-cyan-800 text-xs dark:text-cyan-200">
          {functionTopicLabel(spec.topic)}
        </span>
      </div>
      <MiniList
        items={spec.domainHighlights.map((item) => item.text)}
        title="条件与定义域高亮"
      />
      {spec.intervals.length > 0 && (
        <div className="mt-2">
          <div className="font-medium text-xs">区间/数轴</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {spec.intervals.map((interval) => (
              <span
                className={cn(
                  "rounded-md border px-2 py-1 text-xs",
                  interval.status === "valid" &&
                    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
                  interval.status === "excluded" &&
                    "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200",
                  interval.status === "critical" &&
                    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
                  interval.status === "unknown" &&
                    "border-border bg-background/70 text-muted-foreground"
                )}
                key={interval.id}
              >
                {interval.label} · {functionIntervalStatusLabel(interval.status)}
              </span>
            ))}
          </div>
        </div>
      )}
      <MiniList
        items={spec.criticalPoints.map(
          (point) => `${point.label} · ${functionPointRoleLabel(point.role)}`
        )}
        title="关键点"
      />
      <MiniList
        items={spec.monotonicityRows.map(
          (row) =>
            `${row.intervalId} · f'(x): ${row.derivativeSign} · ${functionTrendLabel(row.trend)}；${row.reason}`
        )}
        title="导数符号与单调性表"
      />
      {spec.parameterTransform && (
        <div className="mt-2 rounded-md bg-background/75 px-2.5 py-2 text-xs">
          <div className="font-medium">参数恒成立转最值</div>
          <div className="mt-1 text-muted-foreground">
            {spec.parameterTransform.originalClaim}
          </div>
          <div className="mt-1">{spec.parameterTransform.transformedClaim}</div>
          <div className="mt-1 text-muted-foreground">
            参数 {spec.parameterTransform.parameter} · 目标{" "}
            {spec.parameterTransform.targetExpression} ·{" "}
            {spec.parameterTransform.extremumType}
          </div>
          <div className="mt-1 text-amber-700 dark:text-amber-300">
            {spec.parameterTransform.riskWarning}
          </div>
        </div>
      )}
      {spec.quadraticShape && (
        <div className="mt-2 rounded-md bg-background/75 px-2.5 py-2 text-xs">
          <div className="font-medium">二次函数结构</div>
          <div className="mt-1">
            {spec.quadraticShape.expression} · 对称轴 {spec.quadraticShape.axis}
          </div>
          <div className="mt-1 text-muted-foreground">
            顶点 {spec.quadraticShape.vertex}
            {spec.quadraticShape.discriminant
              ? ` · 判别式 ${spec.quadraticShape.discriminant}`
              : ""}
          </div>
          {spec.quadraticShape.intervalRestriction && (
            <div className="mt-1 text-amber-700 dark:text-amber-300">
              {spec.quadraticShape.intervalRestriction}
            </div>
          )}
        </div>
      )}
      <MiniList
        tone="warning"
        items={spec.riskWarnings.map((warning) => warning.message)}
        title="高风险提醒"
      />
    </div>
  );
}

function MiniList({
  title,
  items,
  tone = "default",
}: {
  title: string;
  items: string[];
  tone?: "default" | "warning";
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-1.5">
      <div className="font-medium text-xs">{title}</div>
      {items.map((item, index) => (
        <div
          className={cn(
            "rounded-md px-2.5 py-2 text-xs",
            tone === "warning"
              ? "bg-amber-500/10 text-amber-800 dark:text-amber-200"
              : "bg-background/75"
          )}
          key={`${item}-${index}`}
        >
          {item}
        </div>
      ))}
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

function SolutionComparisonBlock({
  comparison,
}: {
  comparison: MathSolutionComparison;
}) {
  return (
    <div className="rounded-md border border-cyan-200/70 bg-cyan-50/70 px-3 py-2 text-cyan-950 text-sm leading-6 dark:border-cyan-900/70 dark:bg-cyan-950/25 dark:text-cyan-50">
      <div className="font-medium">解法选择建议</div>
      <div className="mt-1">
        推荐解法：{comparison.recommendedMethodId} · 最快解法：
        {comparison.fastestMethodId}
      </div>
      <div className="mt-1 text-cyan-950/75 dark:text-cyan-50/75">
        {comparison.reason}
      </div>
      <div className="mt-1 text-cyan-950/75 text-xs dark:text-cyan-50/75">
        考场提示：{comparison.examTip}
      </div>
    </div>
  );
}

function SolutionMethodBlock({ method }: { method: MathSolutionMethod }) {
  return (
    <details
      className="ms-card rounded-md border px-3 py-2 text-sm leading-6"
      open={method.isRecommended}
    >
      <summary className="cursor-pointer list-none">
        <div className="inline-flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {method.id} · {method.title}
          </span>
          {method.isRecommended && (
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 text-xs dark:text-emerald-300">
              推荐解法
            </span>
          )}
          {method.isFastest && (
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-medium text-blue-700 text-xs dark:text-blue-300">
              最快解法
            </span>
          )}
          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            约 {method.estimatedMinutes} 分钟
          </span>
        </div>
      </summary>
      <div className="mt-1 text-muted-foreground">{method.bestFor}</div>
      {method.riskWarnings.length > 0 && (
        <div className="mt-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-amber-800 text-xs leading-5 dark:text-amber-200">
          风险提醒：{method.riskWarnings.join("；")}
        </div>
      )}
      <ol className="mt-2 grid list-decimal gap-1 pl-5 text-sm">
        {method.keySteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <div className="mt-2 text-muted-foreground text-xs">
        验证重点：{method.verificationFocus.join("、")}
      </div>
    </details>
  );
}

function ClaimTraceBlock({ claim }: { claim: ClaimTrace }) {
  return (
    <div className="rounded-md bg-muted/45 px-2 py-1.5 text-xs leading-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{formatClaimType(claim.claimType)}</span>
        <StatusBadge status={claim.status} />
      </div>
      <div className="mt-1 text-muted-foreground">{claim.reason}</div>
    </div>
  );
}

function visualBlockLabel(kind: VisualExplanationSpec["blocks"][number]["kind"]) {
  const labels: Record<
    VisualExplanationSpec["blocks"][number]["kind"],
    string
  > = {
    condition_highlight: "题干条件高亮",
    wrong_step_highlight: "学生错步高亮",
    correct_path: "正确转化路径",
    risk_warning: "高风险提醒",
  };
  return labels[kind];
}

function functionTopicLabel(topic: FunctionVisualExplanationSpec["topic"]) {
  const labels: Record<FunctionVisualExplanationSpec["topic"], string> = {
    derivative_domain: "定义域/导数",
    parameter_for_all: "参数恒成立",
    quadratic_interval: "二次函数",
    monotonicity_extremum: "单调性/最值",
    generic_function: "函数条件",
  };
  return labels[topic];
}

function functionIntervalStatusLabel(
  status: FunctionVisualExplanationSpec["intervals"][number]["status"]
) {
  const labels: Record<
    FunctionVisualExplanationSpec["intervals"][number]["status"],
    string
  > = {
    valid: "合法",
    excluded: "排除",
    critical: "重点比较",
    unknown: "待确认",
  };
  return labels[status];
}

function functionPointRoleLabel(
  role: FunctionVisualExplanationSpec["criticalPoints"][number]["role"]
) {
  const labels: Record<
    FunctionVisualExplanationSpec["criticalPoints"][number]["role"],
    string
  > = {
    endpoint: "端点",
    stationary: "驻点",
    vertex: "顶点",
    boundary: "边界点",
    unknown: "待判断",
  };
  return labels[role];
}

function functionTrendLabel(
  trend: FunctionVisualExplanationSpec["monotonicityRows"][number]["trend"]
) {
  const labels: Record<
    FunctionVisualExplanationSpec["monotonicityRows"][number]["trend"],
    string
  > = {
    increasing: "递增",
    decreasing: "递减",
    constant: "常值",
    unknown: "待由符号判断",
  };
  return labels[trend];
}

function qualityLevelLabel(
  level: NonNullable<MathDiagnosisResult["experienceQuality"]>["level"]
) {
  const labels: Record<
    NonNullable<MathDiagnosisResult["experienceQuality"]>["level"],
    string
  > = {
    world_class_candidate: "顶级闭环候选",
    mvp_strong: "强 MVP",
    needs_review: "需要复核",
    blocked: "关键缺口",
  };
  return labels[level];
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    pass: "通过",
    fail: "失败",
    warn: "需确认",
    not_checked: "未验证",
  };
  return labels[status] ?? status;
}

function formatPolicyMode(mode: string) {
  const labels: Record<string, string> = {
    request_steps: "要求补充步骤",
    confirm_evidence: "确认证据",
    human_review: "人工复核",
    first_wrong_step: "第一断点追问",
    micro_scaffold: "微脚手架",
    generate_variant: "生成变式",
  };
  return labels[mode] ?? mode;
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
