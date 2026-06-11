"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActiveChat } from "@/hooks/use-active-chat";
import {
  initialArtifactData,
  useArtifact,
  useArtifactSelector,
} from "@/hooks/use-artifact";
import { AgentInspector } from "@/components/learning-workbench/agent-inspector";
import { AgentRunRibbon } from "@/components/learning-workbench/agent-run-ribbon";
import { LearningWorkbenchSidebar } from "@/components/learning-workbench/workbench-sidebar";
import type { MathDiagnosisToolResult } from "@/lib/ai/math-diagnosis-types";
import type { MathDiagnosisRequest } from "@/lib/ai/math-diagnosis-types";
import type {
  MathAgentRunStatus,
  MathAgentRuntimeControlAction,
} from "@/lib/ai/runtime/math-agent-runtime";
import type { StudentWorkbenchSummary } from "@/lib/ai/student-workbench-types";
import type { WorkbenchEvent } from "@/lib/ai/workbench-events";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Artifact } from "./artifact";
import { ChatHeader } from "./chat-header";
import { DataStreamHandler } from "./data-stream-handler";
import { submitEditedMessage } from "./message-editor";
import { Messages } from "./messages";
import { MultimodalInput } from "./multimodal-input";
import { clamp, useWorkbenchLayoutState } from "./use-workbench-layout-state";

export function ChatShell({
  initialWorkbenchSummary = null,
}: {
  initialWorkbenchSummary?: StudentWorkbenchSummary | null;
}) {
  const {
    chatId,
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    addToolApprovalResponse,
    input,
    setInput,
    visibilityType,
    isReadonly,
    isLoading,
    votes,
    currentModelId,
    setCurrentModelId,
    showCreditCardAlert,
    setShowCreditCardAlert,
  } = useActiveChat();

  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(
    null
  );
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isMobileInspectorOpen, setIsMobileInspectorOpen] = useState(false);
  const [workbenchLayout, setWorkbenchLayout] = useWorkbenchLayoutState();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);
  const { setArtifact } = useArtifact();
  const latestDiagnosis = getLatestMathDiagnosisResult(messages);
  const latestDiagnosisToolRequest = getLatestMathDiagnosisToolRequest(messages);
  const activeTaskLabel = buildActiveTaskLabel(latestDiagnosis);
  const [liveEvents, setLiveEvents] = useState<WorkbenchEvent[]>([]);
  const [liveRuntimeStatus, setLiveRuntimeStatus] =
    useState<MathAgentRunStatus>("idle");
  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const liveAbortRef = useRef<AbortController | null>(null);
  const liveRequestKeyRef = useRef<string | null>(null);

  const stopRef = useRef(stop);
  stopRef.current = stop;

  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      liveAbortRef.current?.abort();
      liveAbortRef.current = null;
      liveRequestKeyRef.current = null;
      setLiveEvents([]);
      setLiveRunId(null);
      setLiveRuntimeStatus("idle");
      stopRef.current();
      setArtifact(initialArtifactData);
      setEditingMessage(null);
      setAttachments([]);
    }
  }, [chatId, setArtifact]);

  useEffect(() => {
    setWorkbenchLayout((current) =>
      current.activeTaskLabel === activeTaskLabel
        ? current
        : { ...current, activeTaskLabel }
    );
  }, [activeTaskLabel, setWorkbenchLayout]);

  function startSidebarResize(event: ReactPointerEvent<HTMLDivElement>) {
    const startX = event.clientX;
    const startWidth = workbenchLayout.leftWidth;
    startColumnResize(event, (clientX) => {
      setWorkbenchLayout((current) => ({
        ...current,
        leftWidth: clamp(startWidth + clientX - startX, 240, 420),
      }));
    });
  }

  function startInspectorResize(event: ReactPointerEvent<HTMLDivElement>) {
    const startX = event.clientX;
    const startWidth = workbenchLayout.rightWidth;
    startColumnResize(event, (clientX) => {
      setWorkbenchLayout((current) => ({
        ...current,
        rightWidth: clamp(startWidth - (clientX - startX), 300, 760),
      }));
    });
  }

  const startLiveDiagnosisRuntime = useCallback(
    async (request: MathDiagnosisRequest, requestKey: string) => {
      if (liveRequestKeyRef.current === requestKey) {
        return;
      }

      liveAbortRef.current?.abort();
      const controller = new AbortController();
      liveAbortRef.current = controller;
      liveRequestKeyRef.current = requestKey;
      setLiveEvents([]);
      setLiveRunId(null);
      setLiveRuntimeStatus("running");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/math-diagnosis/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            ...request,
            chatId,
            persist: false,
            teachingStyle: request.teachingStyle ?? "socratic",
            visualMode: request.visualMode ?? "html_card",
          }),
        }
      ).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return null;
        }
        throw error;
      });

      if (!response?.body) {
        if (!controller.signal.aborted) {
          setLiveRuntimeStatus("failed");
        }
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const payload = parseRuntimeSseBlock(block);
            if (!payload) {
              continue;
            }

            if (payload.runId) {
              setLiveRunId(payload.runId);
            }
            if (payload.status) {
              setLiveRuntimeStatus(payload.status);
            }
            if (payload.event) {
              setLiveEvents((current) => [...current, payload.event as WorkbenchEvent]);
            }
            if (payload.type === "runtime_completed") {
              setLiveRuntimeStatus("completed");
            }
            if (payload.type === "runtime_failed") {
              setLiveRuntimeStatus("failed");
            }
          }
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setLiveRuntimeStatus("failed");
        }
      } finally {
        if (liveAbortRef.current === controller) {
          liveAbortRef.current = null;
        }
      }
    },
    [chatId]
  );

  useEffect(() => {
    if (!latestDiagnosisToolRequest) {
      return;
    }

    void startLiveDiagnosisRuntime(
      latestDiagnosisToolRequest.request,
      latestDiagnosisToolRequest.key
    );
  }, [latestDiagnosisToolRequest?.key, startLiveDiagnosisRuntime]);

  useEffect(() => {
    if (latestDiagnosis && liveEvents.length > 0) {
      setLiveRuntimeStatus((current) =>
        current === "running" ? "completed" : current
      );
    }
  }, [latestDiagnosis, liveEvents.length]);

  async function recordRuntimeControl(action: MathAgentRuntimeControlAction) {
    if (!liveRunId) {
      return;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/math-runtime/control`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: liveRunId, action }),
      }
    ).catch(() => null);

    if (!response?.ok) {
      return;
    }

    const payload = (await response.json().catch(() => null)) as {
      status?: MathAgentRunStatus;
      events?: WorkbenchEvent[];
    } | null;
    if (payload?.status) {
      setLiveRuntimeStatus(payload.status);
    }
    if (payload?.events?.length) {
      setLiveEvents((current) => mergeWorkbenchEvents(current, payload.events ?? []));
    }
  }

  function handleInspectorControl(action: MathAgentRuntimeControlAction) {
    void recordRuntimeControl(action);

    if (action === "interrupt") {
      liveAbortRef.current?.abort();
      setLiveRuntimeStatus("interrupted");
      stop();
      return;
    }

    if (action === "retry") {
      regenerate();
      return;
    }

    const text = buildInspectorControlMessage(action, latestDiagnosis);
    if (!text) {
      return;
    }

    sendMessage({
      role: "user" as const,
      parts: [{ type: "text", text }],
    });
  }

  return (
    <>
      <div className="ms-workbench-shell flex h-dvh w-full flex-row overflow-hidden">
        <LearningWorkbenchSidebar
          activeTaskLabel={workbenchLayout.activeTaskLabel}
          latestDiagnosis={latestDiagnosis}
          recentDiagnoses={initialWorkbenchSummary?.recentDiagnoses ?? []}
          width={workbenchLayout.leftWidth}
          workbenchSummary={initialWorkbenchSummary}
        />
        <WorkbenchResizeHandle
          label="调整左侧画像栏宽度"
          onPointerDown={startSidebarResize}
        />

        <div className="flex min-w-0 flex-1 flex-row overflow-hidden">
          <div
            className={cn(
              "ms-canvas flex min-w-0 flex-col transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isArtifactVisible ? "w-[40%]" : "w-full"
            )}
          >
            <ChatHeader
              chatId={chatId}
              isReadonly={isReadonly}
              selectedVisibilityType={visibilityType}
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background md:rounded-tl-[12px] md:border-t md:border-l md:border-border/40">
              <AgentRunRibbon
                liveEvents={liveEvents}
                onControlAction={handleInspectorControl}
                onOpenInspector={() => {
                  setIsMobileInspectorOpen(true);
                  setWorkbenchLayout((current) => ({
                    ...current,
                    inspectorCollapsed: false,
                  }));
                }}
                result={latestDiagnosis}
                runtimeStatus={getVisibleRuntimeStatus(
                  liveRuntimeStatus,
                  status,
                  latestDiagnosis
                )}
              />
              <Messages
                addToolApprovalResponse={addToolApprovalResponse}
                chatId={chatId}
                isArtifactVisible={isArtifactVisible}
                isLoading={isLoading}
                isReadonly={isReadonly}
                messages={messages}
                onEditMessage={(msg) => {
                  const text = msg.parts
                    ?.filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("");
                  setInput(text ?? "");
                  setEditingMessage(msg);
                }}
                regenerate={regenerate}
                selectedModelId={currentModelId}
                setMessages={setMessages}
                status={status}
                votes={votes}
              />

              <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
                <button
                  className="absolute right-3 bottom-[calc(100%+8px)] rounded-md border border-border/60 bg-card px-3 py-1.5 font-medium text-xs shadow-sm xl:hidden"
                  onClick={() => setIsMobileInspectorOpen(true)}
                  type="button"
                >
                  Agent Inspector
                </button>
                {!isReadonly && (
                  <MultimodalInput
                    attachments={attachments}
                    chatId={chatId}
                    editingMessage={editingMessage}
                    input={input}
                    isLoading={isLoading}
                    messages={messages}
                    onCancelEdit={() => {
                      setEditingMessage(null);
                      setInput("");
                    }}
                    onModelChange={setCurrentModelId}
                    selectedModelId={currentModelId}
                    selectedVisibilityType={visibilityType}
                    sendMessage={
                      editingMessage
                        ? async () => {
                            const msg = editingMessage;
                            setEditingMessage(null);
                            await submitEditedMessage({
                              message: msg,
                              text: input,
                              setMessages,
                              regenerate,
                            });
                            setInput("");
                          }
                        : sendMessage
                    }
                    setAttachments={setAttachments}
                    setInput={setInput}
                    setMessages={setMessages}
                    status={status}
                    stop={stop}
                  />
                )}
              </div>
            </div>
          </div>

          <Artifact
            addToolApprovalResponse={addToolApprovalResponse}
            attachments={attachments}
            chatId={chatId}
            input={input}
            isReadonly={isReadonly}
            messages={messages}
            regenerate={regenerate}
            selectedModelId={currentModelId}
            selectedVisibilityType={visibilityType}
            sendMessage={sendMessage}
            setAttachments={setAttachments}
            setInput={setInput}
            setMessages={setMessages}
            status={status}
            stop={stop}
            votes={votes}
          />
        </div>

        {!workbenchLayout.inspectorCollapsed && (
          <WorkbenchResizeHandle
            label="调整右侧 Inspector 宽度"
            onPointerDown={startInspectorResize}
          />
        )}
        <AgentInspector
          collapsed={workbenchLayout.inspectorCollapsed}
          exportable
          liveEvents={liveEvents}
          mobileMode="sidebar"
          onControlAction={handleInspectorControl}
          onToggle={() =>
            setWorkbenchLayout((current) => ({
              ...current,
              inspectorCollapsed: !current.inspectorCollapsed,
            }))
          }
          result={latestDiagnosis}
          runtimeStatus={getVisibleRuntimeStatus(
            liveRuntimeStatus,
            status,
            latestDiagnosis
          )}
          width={workbenchLayout.rightWidth}
        />
        {isMobileInspectorOpen && (
          <AgentInspector
            collapsed={false}
            exportable
            liveEvents={liveEvents}
            mobileMode="drawer"
            onControlAction={handleInspectorControl}
            onToggle={() => setIsMobileInspectorOpen(false)}
            result={latestDiagnosis}
            runtimeStatus={getVisibleRuntimeStatus(
              liveRuntimeStatus,
              status,
              latestDiagnosis
            )}
          />
        )}
      </div>

      <DataStreamHandler />

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/`;
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function WorkbenchResizeHandle({
  label,
  onPointerDown,
}: {
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      aria-label={label}
      className="ms-resize-handle hidden h-dvh w-1 shrink-0 cursor-col-resize touch-none xl:block"
      onPointerDown={onPointerDown}
      role="separator"
      tabIndex={0}
    />
  );
}

function startColumnResize(
  event: ReactPointerEvent<HTMLDivElement>,
  onMove: (clientX: number) => void
) {
  event.preventDefault();
  event.currentTarget.setPointerCapture(event.pointerId);

  const move = (pointerEvent: PointerEvent) => {
    onMove(pointerEvent.clientX);
  };
  const stop = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
  };

  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

function buildActiveTaskLabel(result: MathDiagnosisToolResult | null) {
  if (!result) {
    return "等待诊断";
  }

  if ("error" in result) {
    return result.error === "missing_student_steps"
      ? "等待学生补充步骤"
      : "诊断服务需检查";
  }

  if (result.firstWrongStep) {
    return `订正第一错步：${truncate(result.firstWrongStep, 18)}`;
  }

  if (result.remediationPlan?.items.length) {
    return "进行同因变式训练";
  }

  return "继续苏格拉底追问";
}

function mapChatStatusToRuntimeStatus(
  status: string,
  result: MathDiagnosisToolResult | null
): MathAgentRunStatus {
  if (status === "submitted" || status === "streaming") {
    return "running";
  }

  if (status === "error") {
    return "failed";
  }

  return result ? "completed" : "idle";
}

function getVisibleRuntimeStatus(
  liveStatus: MathAgentRunStatus,
  chatStatus: string,
  result: MathDiagnosisToolResult | null
) {
  if (liveStatus !== "idle") {
    return liveStatus;
  }

  return mapChatStatusToRuntimeStatus(chatStatus, result);
}

function buildInspectorControlMessage(
  action: MathAgentRuntimeControlAction,
  result: MathDiagnosisToolResult | null
) {
  const diagnosisId = result && !("error" in result) ? result.jobId : "当前诊断";
  const firstWrongStep =
    result && !("error" in result) ? result.firstWrongStep : null;

  const messages: Record<MathAgentRuntimeControlAction, string> = {
    interrupt: "",
    resume: "继续刚才的数学诊断流程，请从上一步的证据链继续，不要重新编造结论。",
    approve_evidence: `我确认 ${diagnosisId} 的证据链基本可信。请基于第一错步${firstWrongStep ? `「${firstWrongStep}」` : ""}继续追问和订正。`,
    reject_diagnosis:
      "我不认可当前诊断。请重新对齐我的每一步、每个表达式和 claim，再给出新的第一错步判断。",
    request_human_review:
      "我要求人工复核当前数学诊断。请列出需要老师重点检查的证据、门禁和不确定点。",
    retry:
      "请基于当前错因继续生成下一道同因变式，并保持苏格拉底追问，不要直接给完整答案。",
    replay_trace:
      "请回放本次诊断 trace：按工具调用、Step Alignment、Strict Gate、VerifierTrace、Policy、LearnerMemory 的顺序解释每一步为什么发生。",
  };

  return messages[action];
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function getLatestMathDiagnosisResult(
  messages: ChatMessage[]
): MathDiagnosisToolResult | null {
  for (const message of [...messages].reverse()) {
    for (const part of [...(message.parts ?? [])].reverse()) {
      if (
        part.type === "tool-diagnoseMathThinking" &&
        part.state === "output-available"
      ) {
        return part.output as MathDiagnosisToolResult;
      }
    }
  }

  return null;
}

function getLatestMathDiagnosisToolRequest(messages: ChatMessage[]) {
  for (const message of [...messages].reverse()) {
    for (const part of [...(message.parts ?? [])].reverse()) {
      if (part.type !== "tool-diagnoseMathThinking") {
        continue;
      }

      const state = (part as { state?: string }).state;
      if (state !== "input-streaming" && state !== "input-available") {
        continue;
      }

      const request = normalizeMathDiagnosisToolInput(
        (part as { input?: unknown }).input
      );
      if (!request) {
        continue;
      }

      return {
        key: JSON.stringify({
          problemText: request.problemText,
          studentSteps: request.studentSteps,
          confirmedEvidence: request.confirmedEvidence ?? [],
        }),
        request,
      };
    }
  }

  return null;
}

function normalizeMathDiagnosisToolInput(
  input: unknown
): MathDiagnosisRequest | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<MathDiagnosisRequest>;
  if (
    typeof candidate.problemText !== "string" ||
    typeof candidate.studentSteps !== "string" ||
    !candidate.problemText.trim()
  ) {
    return null;
  }

  return {
    problemText: candidate.problemText,
    studentSteps: candidate.studentSteps,
    confirmedEvidence: Array.isArray(candidate.confirmedEvidence)
      ? candidate.confirmedEvidence.filter(
          (item): item is string => typeof item === "string"
        )
      : [],
    teachingStyle: "socratic",
    visualMode: "html_card",
  };
}

function parseRuntimeSseBlock(block: string) {
  const dataLine = block
    .split("\n")
    .find((line) => line.startsWith("data:"));
  if (!dataLine) {
    return null;
  }

  try {
    return JSON.parse(dataLine.slice("data:".length).trim()) as {
      type?: string;
      runId?: string;
      status?: MathAgentRunStatus;
      event?: WorkbenchEvent;
    };
  } catch {
    return null;
  }
}

function mergeWorkbenchEvents(
  current: WorkbenchEvent[],
  next: WorkbenchEvent[]
) {
  const seen = new Set(current.map((item) => item.id));
  return [
    ...current,
    ...next.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }
      seen.add(item.id);
      return true;
    }),
  ];
}
