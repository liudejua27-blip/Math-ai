"use client";

import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  LoaderIcon,
  PanelRightIcon,
  RotateCcwIcon,
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
      ("firstWrongStep" in value || "misconceptionAtoms" in value || "error" in value)
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

function ToolFallbackContent({
  children,
}: {
  children: ReactNode;
}) {
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
    if (approval != null && approval.approved === undefined && respondToApproval) {
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

function MathDiagnosisToolCard({
  result,
}: {
  result: MathDiagnosisToolResult;
}) {
  if ("error" in result) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
        <div className="font-medium text-destructive">诊断暂不可用</div>
        <p className="mt-1 text-muted-foreground">{result.message}</p>
      </div>
    );
  }

  const atoms = result.misconceptionAtoms?.slice(0, 3) ?? [];
  const traces = result.verifierTraces?.slice(0, 3) ?? [];
  const solutionMethods = result.solutionMethods ?? [];
  const solutionComparison = result.solutionComparison;
  const recommendedMethod = solutionMethods.find(
    (method) => method.id === solutionComparison?.recommendedMethodId
  );
  const fastestMethod = solutionMethods.find(
    (method) => method.id === solutionComparison?.fastestMethodId
  );
  const nextActionLabel = formatNextAction(result.recommendedNextAction);
  const quality = result.experienceQuality;

  return (
    <div className="rounded-xl border bg-card p-3 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">Math-SEARAG 诊断完成</div>
          <p className="mt-1 text-muted-foreground text-xs">
            第一错步、错因原子、验证链和订正路径已经生成。
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
            {result.firstWrongStep ?? "需要学生补充步骤后才能判断。"}
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
            验证链：{traces.map((trace) => `${trace.verifier}:${trace.status}`).join(" / ")}
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
        <Button className="h-8 rounded-full" size="sm" type="button" variant="ghost">
          <RotateCcwIcon className="size-4" />
          我已订正
        </Button>
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
        {(result.visualExplanation || result.functionVisualExplanation) && (
          <Button
            className="h-8 rounded-full"
            onClick={() => openMathAgentDrawer("inspector", result)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <ExternalLinkIcon className="size-4" />
            图上讲解
          </Button>
        )}
      </div>
    </div>
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
