"use client";

import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  LoaderIcon,
  PanelRightIcon,
  RotateCcwIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  XCircleIcon,
} from "lucide-react";
import {
  memo,
  useState,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  type ToolCallMessagePart,
  type ToolCallMessagePartComponent,
  type ToolCallMessagePartProps,
  type ToolCallMessagePartStatus,
} from "@assistant-ui/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import type {
  MathDiagnosisToolResult,
  RecommendedNextAction,
} from "@/lib/ai/math-diagnosis-types";
import { cn } from "@/lib/utils";

type ToolStatus = ToolCallMessagePartStatus["type"];
type ActionState = "idle" | "saving" | "saved" | "failed";
type MathDiagnosisSuccessResult = Exclude<
  MathDiagnosisToolResult,
  { error: unknown }
>;

const statusIconMap: Record<ToolStatus, React.ElementType> = {
  running: LoaderIcon,
  complete: CheckIcon,
  incomplete: XCircleIcon,
  "requires-action": AlertCircleIcon,
};

function isDiagnosisResult(value: unknown): value is MathDiagnosisToolResult {
  return Boolean(
    value &&
      typeof value === "object" &&
      ("firstWrongStep" in value ||
        "misconceptionAtoms" in value ||
        "error" in value)
  );
}

function openMathAgentDrawer(
  drawer: "inspector" | "learner-memory" | "history" | "geometry-lab",
  result?: MathDiagnosisToolResult
) {
  window.dispatchEvent(
    new CustomEvent("math-agent-open-drawer", {
      detail: { drawer, result },
    })
  );
}

function ToolFallbackRoot({
  className,
  children,
  defaultOpen = false,
}: ComponentProps<typeof Collapsible> & {
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible
      className={cn("aui-tool-fallback-root w-full", className)}
      onOpenChange={setOpen}
      open={open}
    >
      {children}
    </Collapsible>
  );
}

function ToolFallbackTrigger({
  toolName,
  status,
}: {
  toolName: string;
  status?: ToolCallMessagePartStatus;
}) {
  const statusType = status?.type ?? "complete";
  const isRunning = statusType === "running";
  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  const Icon = statusIconMap[statusType] as ComponentType<{
    className?: string;
  }>;
  const label = isCancelled ? "工具已取消" : "调用工具";

  return (
    <CollapsibleTrigger className="aui-tool-fallback-trigger group/trigger text-muted-foreground hover:text-foreground flex w-fit items-center gap-2 py-1 text-sm transition-colors">
      <Icon
        className={cn(
          "aui-tool-fallback-trigger-icon size-4 shrink-0",
          isRunning && "animate-spin"
        )}
      />
      <span className={cn(isCancelled && "line-through")}>
        {label}: <b>{toolName}</b>
      </span>
      <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=closed]/trigger:-rotate-90" />
    </CollapsibleTrigger>
  );
}

function ToolFallbackContent({ children }: { children: ReactNode }) {
  return (
    <CollapsibleContent className="aui-tool-fallback-content overflow-hidden text-sm data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
      <div className="flex flex-col gap-2 ps-6 pt-1 pb-2">{children}</div>
    </CollapsibleContent>
  );
}

function ToolFallbackArgs({ argsText }: { argsText?: string }) {
  if (!argsText) {
    return null;
  }

  return (
    <pre className="aui-tool-fallback-args-value bg-muted/50 text-muted-foreground rounded-md p-2.5 text-xs whitespace-pre-wrap">
      {argsText}
    </pre>
  );
}

function ToolFallbackResult({ result }: { result?: unknown }) {
  if (result === undefined) {
    return null;
  }

  return (
    <div>
      <p className="text-muted-foreground text-xs font-medium">结果：</p>
      <pre className="bg-muted/50 text-muted-foreground mt-1 rounded-md p-2.5 text-xs whitespace-pre-wrap">
        {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}

function ToolFallbackError({ status }: { status?: ToolCallMessagePartStatus }) {
  if (status?.type !== "incomplete") {
    return null;
  }

  const error = status.error;
  const errorText = error
    ? typeof error === "string"
      ? error
      : JSON.stringify(error)
    : null;

  if (!errorText) {
    return null;
  }

  return (
    <div className="text-muted-foreground">
      <p className="font-semibold">
        {status.reason === "cancelled" ? "取消原因：" : "错误："}
      </p>
      <p>{errorText}</p>
    </div>
  );
}

const APPROVED_RESULT = "Approved by user";
const DENIED_RESULT = "User denied tool execution";

function ToolFallbackApproval({
  addResult,
  resume,
  interrupt,
  approval,
  respondToApproval,
}: Partial<
  Pick<ToolCallMessagePartProps, "addResult" | "resume" | "respondToApproval">
> & {
  interrupt?: ToolCallMessagePart["interrupt"];
  approval?: ToolCallMessagePart["approval"];
}) {
  const [submitted, setSubmitted] = useState(false);

  if (approval != null && approval.approved !== undefined) {
    return null;
  }

  const respond = (approved: boolean) => {
    if (submitted) {
      return;
    }
    if (
      approval != null &&
      approval.approved === undefined &&
      respondToApproval
    ) {
      respondToApproval({ approved });
    } else if (interrupt) {
      resume?.({ approved });
    } else {
      addResult?.(approved ? APPROVED_RESULT : DENIED_RESULT);
    }
    setSubmitted(true);
  };

  return (
    <div className="aui-tool-fallback-approval flex items-center gap-2 pt-1">
      <Button disabled={submitted} onClick={() => respond(true)} size="sm">
        允许
      </Button>
      <Button
        disabled={submitted}
        onClick={() => respond(false)}
        size="sm"
        variant="outline"
      >
        拒绝
      </Button>
    </div>
  );
}

function MathDiagnosisToolCard({ result }: { result: MathDiagnosisToolResult }) {
  const [repairStatus, setRepairStatus] = useState<ActionState>("idle");
  const [variantStatus, setVariantStatus] = useState<ActionState>("idle");
  const [feedbackStatus, setFeedbackStatus] = useState<ActionState>("idle");

  if ("error" in result) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <div className="font-medium text-destructive">诊断暂时不可用</div>
        <p className="mt-1 text-muted-foreground">{result.message}</p>
      </div>
    );
  }

  const diagnosis = result as MathDiagnosisSuccessResult;
  const atoms = diagnosis.misconceptionAtoms?.slice(0, 3) ?? [];
  const traces = diagnosis.verifierTraces?.slice(0, 3) ?? [];
  const solutionMethods = diagnosis.solutionMethods ?? [];
  const solutionComparison = diagnosis.solutionComparison;
  const recommendedMethod = solutionMethods.find(
    (method) => method.id === solutionComparison?.recommendedMethodId
  );
  const fastestMethod = solutionMethods.find(
    (method) => method.id === solutionComparison?.fastestMethodId
  );
  const nextActionLabel = formatNextAction(diagnosis.recommendedNextAction);
  const quality = diagnosis.experienceQuality;

  async function saveCorrection() {
    setRepairStatus("saving");
    const response = await postJson("/api/learning/correction", {
      atomIds: getAtomIds(diagnosis),
      diagnosisSessionId: getDiagnosisSessionId(diagnosis),
      source: "workbench",
    });
    setRepairStatus(response ? "saved" : "failed");
  }

  async function saveVariantResult(transferSuccess: boolean) {
    setVariantStatus("saving");
    const response = await postJson("/api/learning/variant-result", {
      atomIds: getAtomIds(diagnosis),
      diagnosisSessionId: getDiagnosisSessionId(diagnosis),
      variantLevel: getVariantLevel(diagnosis),
      variantText: getVariantText(diagnosis),
      transferSuccess,
      result: transferSuccess ? "student_variant_passed" : "student_variant_failed",
    });
    setVariantStatus(response ? "saved" : "failed");
  }

  async function saveFeedback(firstWrongAccepted: boolean) {
    setFeedbackStatus("saving");
    const response = await postJson("/api/learning/diagnosis-feedback", {
      diagnosisSessionId: getDiagnosisSessionId(diagnosis),
      source: "tool_card",
      firstWrongStepPredicted: diagnosis.firstWrongStep ?? null,
      firstWrongAccepted,
      diagnosisHelpful: firstWrongAccepted,
      payload: {
        confidence: diagnosis.confidence,
        recommendedNextAction: diagnosis.recommendedNextAction ?? null,
        experienceQualityScore: diagnosis.experienceQuality?.overallScore ?? null,
        atomIds: getAtomIds(diagnosis),
      },
    });
    setFeedbackStatus(response ? "saved" : "failed");
  }

  return (
    <div className="rounded-xl border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Math-SEARAG 诊断完成</div>
          <p className="mt-1 text-muted-foreground text-xs">
            已生成第一错步、错因原子、验证链、订正路径和下一步训练。
          </p>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-muted-foreground text-xs">
          confidence {Math.round((result.confidence ?? 0) * 100)}%
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="rounded-lg bg-muted/45 p-2">
          <div className="text-muted-foreground text-xs">第一错步</div>
          <div className="mt-1 line-clamp-2">
            {result.firstWrongStep ?? "需要补充学生步骤后才能判断。"}
          </div>
        </div>
        {atoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {atoms.map((atom) => (
              <span
                className="rounded-full border px-2 py-1 text-muted-foreground text-xs"
                key={atom.id}
              >
                {atom.id} {atom.label}
              </span>
            ))}
          </div>
        )}
        {traces.length > 0 && (
          <div className="text-muted-foreground text-xs">
            验证链：
            {traces.map((trace) => `${trace.verifier}:${trace.status}`).join(" / ")}
          </div>
        )}
        {solutionComparison && (
          <div className="grid gap-2 rounded-lg border border-cyan-200/70 bg-cyan-50/70 p-2 text-cyan-950 text-xs dark:border-cyan-900/70 dark:bg-cyan-950/25 dark:text-cyan-50">
            <div className="font-medium">推荐解法 / 最快解法</div>
            <div>
              推荐解法：
              {recommendedMethod
                ? `${recommendedMethod.title}，约 ${recommendedMethod.estimatedMinutes} 分钟`
                : solutionComparison.recommendedMethodId}
            </div>
            <div>
              最快解法：
              {fastestMethod
                ? `${fastestMethod.title}，约 ${fastestMethod.estimatedMinutes} 分钟`
                : solutionComparison.fastestMethodId}
            </div>
            <div className="text-cyan-950/75 dark:text-cyan-50/75">
              {solutionComparison.reason}
            </div>
          </div>
        )}
        {quality && (
          <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/70 p-2 text-emerald-950 text-xs dark:border-emerald-900/70 dark:bg-emerald-950/25 dark:text-emerald-50">
            <div className="font-medium">
              体验质量自检：{quality.overallScore}/100
            </div>
            <div className="mt-1">{quality.summary}</div>
          </div>
        )}
        {(result.visualExplanation ||
          result.functionVisualExplanation ||
          result.recommendedNextAction) && (
          <div className="rounded-lg border border-violet-200/70 bg-violet-50/70 p-2 text-violet-950 text-xs dark:border-violet-900/70 dark:bg-violet-950/25 dark:text-violet-50">
            <div className="font-medium">图上讲解 / 今日下一步</div>
            {result.visualExplanation && (
              <div className="mt-1">
                已生成条件高亮、错步高亮、正确路径和风险提醒。
              </div>
            )}
            {result.functionVisualExplanation && (
              <div className="mt-1">
                函数图上讲解已生成：定义域、区间、关键点和风险提醒。
              </div>
            )}
            {nextActionLabel && <div className="mt-1">{nextActionLabel}</div>}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          className="h-8 rounded-full"
          onClick={() => openMathAgentDrawer("inspector", result)}
          size="sm"
          type="button"
          variant="outline"
        >
          <PanelRightIcon className="size-4" />
          打开 Inspector
        </Button>
        {(result.visualExplanation || result.functionVisualExplanation) && (
          <Button
            className="h-8 rounded-full"
            onClick={() => openMathAgentDrawer("inspector", result)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ExternalLinkIcon className="size-4" />
            打开图上讲解
          </Button>
        )}
        {result.recommendedGeometryLabs?.length ? (
          <Button
            className="h-8 rounded-full"
            onClick={() => openMathAgentDrawer("geometry-lab", result)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ExternalLinkIcon className="size-4" />
            Geometry Lab
          </Button>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          className="h-8 rounded-full"
          disabled={repairStatus === "saving" || repairStatus === "saved"}
          onClick={saveCorrection}
          size="sm"
          type="button"
          variant="ghost"
        >
          <RotateCcwIcon className="size-4" />
          {repairStatus === "saved" ? "已记录订正" : "我订正完了"}
        </Button>
        <Button
          className="h-8 rounded-full"
          disabled={variantStatus === "saving"}
          onClick={() => saveVariantResult(true)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ThumbsUpIcon className="size-4" />
          变式做对了
        </Button>
        <Button
          className="h-8 rounded-full"
          disabled={variantStatus === "saving"}
          onClick={() => saveVariantResult(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ThumbsDownIcon className="size-4" />
          变式没做对
        </Button>
        <Button
          className="h-8 rounded-full"
          disabled={feedbackStatus === "saving"}
          onClick={() => saveFeedback(true)}
          size="sm"
          type="button"
          variant="ghost"
        >
          首错判断正确
        </Button>
        <Button
          className="h-8 rounded-full"
          disabled={feedbackStatus === "saving"}
          onClick={() => saveFeedback(false)}
          size="sm"
          type="button"
          variant="ghost"
        >
          首错不对
        </Button>
      </div>

      {(repairStatus === "failed" ||
        variantStatus === "failed" ||
        feedbackStatus === "failed") && (
        <div className="mt-2 text-destructive text-xs">
          记录失败，请确认已登录且数据库可用。
        </div>
      )}
    </div>
  );
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  return Boolean(response?.ok);
}

function getAtomIds(result: MathDiagnosisToolResult) {
  if ("error" in result) {
    return [];
  }
  return [...new Set((result.misconceptionAtoms ?? []).map((atom) => atom.id))];
}

function getDiagnosisSessionId(result: MathDiagnosisToolResult) {
  if ("error" in result) {
    return null;
  }
  const value = (result as MathDiagnosisToolResult & {
    diagnosisSessionId?: unknown;
  }).diagnosisSessionId;
  return typeof value === "string" ? value : null;
}

function getVariantLevel(result: MathDiagnosisToolResult) {
  if ("error" in result) {
    return 1;
  }
  const value = (result as MathDiagnosisToolResult & {
    learnerMemoryGuidance?: { variantLevel?: unknown };
  }).learnerMemoryGuidance?.variantLevel;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(4, Math.floor(value)))
    : 1;
}

function getVariantText(result: MathDiagnosisToolResult) {
  if ("error" in result) {
    return "同因变式训练";
  }
  return (
    result.variants?.[0]?.text ||
    result.remediationPlan?.items?.[0]?.prompt ||
    "同因变式训练"
  );
}

function formatNextAction(action?: RecommendedNextAction) {
  const labels: Record<RecommendedNextAction, string> = {
    repair: "今日下一步：先订正第一断点。",
    variant: "今日下一步：进入同因变式训练。",
    geometry_lab: "今日下一步：进入 Geometry Lab 图上重建。",
    review_plan: "今日下一步：先复核证据，避免误判。",
  };
  return action ? labels[action] : null;
}

const ToolFallbackImpl: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
  status,
  addResult,
  resume,
  interrupt,
  approval,
  respondToApproval,
}) => {
  const isRequiresAction = status?.type === "requires-action";

  if (toolName === "diagnoseMathThinking" && isDiagnosisResult(result)) {
    return <MathDiagnosisToolCard result={result} />;
  }

  return (
    <ToolFallbackRoot defaultOpen={isRequiresAction}>
      <ToolFallbackTrigger status={status} toolName={toolName} />
      <ToolFallbackContent>
        <ToolFallbackError status={status} />
        <ToolFallbackArgs argsText={argsText} />
        {isRequiresAction && (
          <ToolFallbackApproval
            addResult={addResult}
            approval={approval}
            interrupt={interrupt}
            respondToApproval={respondToApproval}
            resume={resume}
          />
        )}
        {status?.type !== "incomplete" && <ToolFallbackResult result={result} />}
      </ToolFallbackContent>
    </ToolFallbackRoot>
  );
};

const ToolFallback = memo(
  ToolFallbackImpl
) as unknown as ToolCallMessagePartComponent & {
  Root: typeof ToolFallbackRoot;
  Trigger: typeof ToolFallbackTrigger;
  Content: typeof ToolFallbackContent;
  Args: typeof ToolFallbackArgs;
  Result: typeof ToolFallbackResult;
  Error: typeof ToolFallbackError;
  Approval: typeof ToolFallbackApproval;
};

ToolFallback.displayName = "ToolFallback";
ToolFallback.Root = ToolFallbackRoot;
ToolFallback.Trigger = ToolFallbackTrigger;
ToolFallback.Content = ToolFallbackContent;
ToolFallback.Args = ToolFallbackArgs;
ToolFallback.Result = ToolFallbackResult;
ToolFallback.Error = ToolFallbackError;
ToolFallback.Approval = ToolFallbackApproval;

export {
  ToolFallback,
  ToolFallbackRoot,
  ToolFallbackTrigger,
  ToolFallbackContent,
  ToolFallbackArgs,
  ToolFallbackResult,
  ToolFallbackError,
  ToolFallbackApproval,
};
