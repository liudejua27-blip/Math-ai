"use client";

import { useAuiState } from "@assistant-ui/react";
import {
  CheckCircle2Icon,
  CircleDashedIcon,
  EyeIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  WorkflowIcon,
} from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const processSteps = [
  { id: "diagnosis_started", label: "启动诊断" },
  { id: "step_aligned", label: "步骤对齐" },
  { id: "verifier_checked", label: "验证链" },
  { id: "policy_decided", label: "教学策略" },
  { id: "memory_updated", label: "画像更新" },
];

export function AgentProcessRibbon({
  onOpenInspector,
}: {
  onOpenInspector?: () => void;
}) {
  const isRunning = useAuiState((state) => state.thread.isRunning);
  const messageCount = useAuiState((state) => state.thread.messages.length);
  const activeStep = useMemo(() => {
    if (messageCount === 0) {
      return 0;
    }
    return isRunning ? 2 : 4;
  }, [isRunning, messageCount]);

  return (
    <div className="border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-muted-foreground text-xs">
            <WorkflowIcon className="size-3.5" />
            Agent trace
          </span>
          {processSteps.map((step, index) => (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                index <= activeStep
                  ? "bg-muted text-foreground"
                  : "bg-background text-muted-foreground"
              )}
              key={step.id}
            >
              {index <= activeStep ? (
                <CheckCircle2Icon className="size-3.5" />
              ) : (
                <CircleDashedIcon className="size-3.5" />
              )}
              {step.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            className="h-7 rounded-full px-2.5 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <ShieldCheckIcon className="size-3.5" />
            确认证据
          </Button>
          <Button
            className="h-7 rounded-full px-2.5 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcwIcon className="size-3.5" />
            要求复核
          </Button>
          <Button
            className="h-7 rounded-full px-2.5 text-xs"
            onClick={onOpenInspector}
            size="sm"
            type="button"
            variant="outline"
          >
            <EyeIcon className="size-3.5" />
            过程
          </Button>
        </div>
      </div>
    </div>
  );
}
