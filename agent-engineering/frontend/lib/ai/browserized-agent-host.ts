import type { MathDiagnosisToolResult } from "./math-diagnosis-types";
import type { MathAgentRunStatus } from "./runtime/math-agent-runtime";
import type { WorkbenchEvent } from "./workbench-events";

export type BrowserizedHostCapabilityStatus =
  | "ready"
  | "active"
  | "partial"
  | "planned";

export type BrowserizedHostCapability = {
  id:
    | "browser_console"
    | "controlled_runtime"
    | "event_stream"
    | "trace_replay"
    | "persistent_history"
    | "human_approval"
    | "tool_bridge";
  label: string;
  status: BrowserizedHostCapabilityStatus;
  detail: string;
};

export type BrowserizedAgentHostSnapshot = {
  mode: "browserized_control_plane";
  hostLabel: string;
  sessionState: MathAgentRunStatus;
  reconnectLabel: string;
  securityBoundary: string;
  activeTransport: "sse" | "result_replay" | "idle";
  capabilities: BrowserizedHostCapability[];
};

export function buildBrowserizedAgentHostSnapshot({
  events,
  result,
  runtimeStatus,
}: {
  events: WorkbenchEvent[];
  result: MathDiagnosisToolResult | null;
  runtimeStatus: MathAgentRunStatus;
}): BrowserizedAgentHostSnapshot {
  const hasLiveEvents = events.length > 0;
  const hasResult = Boolean(result);
  const hasPersistentTrace = events.some(
    (event) => event.phase === "persistence" || event.replayable
  );
  const hasToolBridge = events.some((event) => event.phase === "tool");
  const hasControl = events.some((event) => event.phase === "control");

  return {
    mode: "browserized_control_plane",
    hostLabel: "Browser Console + MathAgentRuntime Host",
    sessionState: runtimeStatus,
    reconnectLabel:
      hasPersistentTrace || hasResult
        ? "可通过诊断历史和 trace 回放恢复上下文"
        : hasLiveEvents
          ? "当前浏览器会话可继续观察运行"
          : "等待首个诊断会话",
    securityBoundary:
      "浏览器只发送学习指令；数学验证、画像更新和持久化运行在受控后端。",
    activeTransport: hasLiveEvents ? "sse" : hasResult ? "result_replay" : "idle",
    capabilities: [
      {
        id: "browser_console",
        label: "Browser console",
        status: "ready",
        detail: "学生端通过浏览器控制学习会话，不依赖桌面窗口常驻。",
      },
      {
        id: "controlled_runtime",
        label: "Controlled runtime",
        status: runtimeStatus === "running" ? "active" : "ready",
        detail: "MathAgentRuntime 负责诊断、验证、策略和学习画像更新。",
      },
      {
        id: "event_stream",
        label: "SSE events",
        status: hasLiveEvents ? "active" : "ready",
        detail: "诊断过程通过事件流进入 Inspector 和运行条。",
      },
      {
        id: "trace_replay",
        label: "Trace replay",
        status: hasPersistentTrace ? "ready" : "partial",
        detail: "可回放 replayable 事件；后续可扩展为完整 run 恢复。",
      },
      {
        id: "persistent_history",
        label: "History",
        status: hasResult ? "ready" : "partial",
        detail: "正式诊断结果会写入学习历史；实时预览不重复写库。",
      },
      {
        id: "human_approval",
        label: "Approval",
        status: hasControl ? "active" : "ready",
        detail: "支持要求复核、确认证据、拒绝诊断等控制动作。",
      },
      {
        id: "tool_bridge",
        label: "Tool bridge",
        status: hasToolBridge ? "active" : "ready",
        detail: "Python verifier 等工具通过受控 adapter 接入。",
      },
    ],
  };
}
