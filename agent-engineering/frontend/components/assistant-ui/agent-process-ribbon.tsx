"use client";

import { useAuiState } from "@assistant-ui/react";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  CircleDashedIcon,
  ClipboardCheckIcon,
  EyeIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  WorkflowIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const processSteps = [
  {
    id: "step-alignment",
    label: "Step Alignment",
    description: "逐句对齐学生步骤，拆成可验证 claim。",
  },
  {
    id: "tool-check",
    label: "Tool Calls",
    description: "接入 OCR、Python verifier、几何 solver 等工具结果。",
  },
  {
    id: "verifier-trace",
    label: "VerifierTrace",
    description: "只展示证据、门禁和状态，不展示隐藏思维链。",
  },
  {
    id: "human-review",
    label: "Review / Resume",
    description: "低置信或关键证据需要学生确认后继续。",
  },
];

export function AgentProcessRibbon() {
  const [open, setOpen] = useState(false);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const messageCount = useAuiState((s) => s.thread.messages.length);
  const hasMessages = messageCount > 0;
  const activeStep = useMemo(() => {
    if (!hasMessages) return 0;
    if (isRunning) return 1;
    return 2;
  }, [hasMessages, isRunning]);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-b bg-background/95 backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-muted-foreground text-xs">
            <WorkflowIcon className="size-3.5" />
            Agent trace
          </span>
          {processSteps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                index <= activeStep
                  ? "bg-muted text-foreground"
                  : "bg-background text-muted-foreground"
              )}
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
            <ClipboardCheckIcon className="size-3.5" />
            确认证据
          </Button>
          <Button
            className="h-7 rounded-full px-2.5 text-xs"
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcwIcon className="size-3.5" />
            请求复核
          </Button>
          <CollapsibleTrigger asChild>
            <Button
              aria-label="展开运行过程"
              className="h-7 rounded-full px-2.5 text-xs"
              size="sm"
              type="button"
              variant="outline"
            >
              <EyeIcon className="size-3.5" />
              过程
              <ChevronDownIcon
                className={cn(
                  "size-3.5 transition-transform",
                  open && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="mx-auto grid max-w-5xl gap-2 px-4 pb-3 md:grid-cols-2">
          {processSteps.map((step) => (
            <div
              className="rounded-xl border bg-background p-3 text-sm"
              key={step.id}
            >
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheckIcon className="size-4 text-muted-foreground" />
                {step.label}
              </div>
              <p className="mt-1 text-muted-foreground text-xs leading-5">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
