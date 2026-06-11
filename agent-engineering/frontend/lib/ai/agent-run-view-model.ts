import type { MathDiagnosisToolResult } from "./math-diagnosis-types";
import type {
  MathAgentRunStatus,
} from "./runtime/math-agent-runtime";
import type { WorkbenchEvent, WorkbenchEventPhase } from "./workbench-events";

export type AgentRunPhaseState = {
  phase: WorkbenchEventPhase;
  label: string;
  status: "idle" | "running" | "completed" | "warn" | "failed";
  eventCount: number;
};

export type AgentRunToolReceipt = {
  id: string;
  name: string;
  status: WorkbenchEvent["status"];
  detail: string;
  durationMs?: number;
};

export type AgentRunViewModel = {
  status: MathAgentRunStatus;
  headline: string;
  detail: string;
  activePhase: WorkbenchEventPhase | "result" | "idle";
  progressPercent: number;
  phaseStates: AgentRunPhaseState[];
  toolReceipts: AgentRunToolReceipt[];
  canRequestReview: boolean;
  canReplayTrace: boolean;
};

const phaseOrder: WorkbenchEventPhase[] = [
  "runtime",
  "workflow",
  "tool",
  "verification",
  "memory",
  "persistence",
  "control",
];

const phaseLabels: Record<WorkbenchEventPhase, string> = {
  runtime: "Runtime",
  workflow: "Workflow",
  tool: "Tools",
  verification: "Verifier",
  memory: "Memory",
  persistence: "Save",
  control: "Control",
};

export function buildAgentRunViewModel({
  events,
  result,
  status,
}: {
  events: WorkbenchEvent[];
  result: MathDiagnosisToolResult | null;
  status: MathAgentRunStatus;
}): AgentRunViewModel {
  const lastEvent = events.at(-1);
  const phaseStates = buildPhaseStates(events, status);
  const completedPhaseCount = phaseStates.filter(
    (phase) => phase.status === "completed" || phase.status === "warn"
  ).length;
  const progressPercent =
    status === "completed"
      ? 100
      : Math.max(8, Math.round((completedPhaseCount / phaseStates.length) * 100));

  return {
    status,
    headline: buildHeadline({ event: lastEvent, result, status }),
    detail: buildDetail({ event: lastEvent, result, status }),
    activePhase: lastEvent?.phase ?? (result ? "result" : "idle"),
    progressPercent,
    phaseStates,
    toolReceipts: buildToolReceipts(events),
    canRequestReview: Boolean(result && !("error" in result)),
    canReplayTrace: events.some((event) => event.replayable),
  };
}

function buildPhaseStates(
  events: WorkbenchEvent[],
  status: MathAgentRunStatus
): AgentRunPhaseState[] {
  return phaseOrder.map((phase) => {
    const phaseEvents = events.filter((event) => event.phase === phase);
    const latest = phaseEvents.at(-1);
    const hasFailure = phaseEvents.some((event) => event.status === "failed");
    const hasWarn = phaseEvents.some(
      (event) => event.status === "warn" || event.status === "blocked"
    );

    return {
      phase,
      label: phaseLabels[phase],
      status: hasFailure
        ? "failed"
        : latest?.status === "running" && status === "running"
          ? "running"
          : hasWarn
            ? "warn"
            : phaseEvents.length > 0
              ? "completed"
              : "idle",
      eventCount: phaseEvents.length,
    };
  });
}

function buildToolReceipts(events: WorkbenchEvent[]): AgentRunToolReceipt[] {
  return events
    .filter((event) => event.toolName)
    .slice(-4)
    .map((event) => ({
      id: event.id,
      name: event.toolName ?? "tool",
      status: event.status,
      detail: event.detail,
      durationMs: event.durationMs,
    }));
}

function buildHeadline({
  event,
  result,
  status,
}: {
  event?: WorkbenchEvent;
  result: MathDiagnosisToolResult | null;
  status: MathAgentRunStatus;
}) {
  if (event) {
    return event.title;
  }

  if (result && !("error" in result)) {
    return result.firstWrongStep
      ? `第一断点：${result.firstWrongStep}`
      : "诊断已完成";
  }

  if (result && "error" in result) {
    return "等待补充步骤";
  }

  if (status === "running") {
    return "诊断运行中";
  }

  return "等待数学诊断";
}

function buildDetail({
  event,
  result,
  status,
}: {
  event?: WorkbenchEvent;
  result: MathDiagnosisToolResult | null;
  status: MathAgentRunStatus;
}) {
  if (event) {
    return event.detail;
  }

  if (result && !("error" in result)) {
    return result.firstWrongReason ?? "验证链、画像更新和训练计划已生成。";
  }

  if (result && "error" in result) {
    return result.message;
  }

  if (status === "running") {
    return "Runtime 正在等待 workflow 事件。";
  }

  return "输入题目和学生步骤后，运行条会展示 agent 的工具调用、验证和策略决策。";
}
