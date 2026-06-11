import { buildBrowserizedAgentHostSnapshot } from "./browserized-agent-host";
import { event } from "./workbench-events";

const snapshot = buildBrowserizedAgentHostSnapshot({
  events: [
    event("diagnosis_started", "诊断开始", "running", "started", {
      phase: "runtime",
    }),
    event("python_verifier_started", "Python verifier 开始", "running", "tool", {
      phase: "tool",
      toolName: "python_verifier",
    }),
    event("verifier_trace_added", "验证链已生成", "warn", "trace", {
      phase: "verification",
      replayable: true,
    }),
  ],
  result: null,
  runtimeStatus: "running",
});

if (snapshot.activeTransport !== "sse") {
  throw new Error("Expected browserized host to use SSE while live events exist.");
}

if (!snapshot.capabilities.some((item) => item.id === "tool_bridge" && item.status === "active")) {
  throw new Error("Expected active tool bridge capability.");
}

if (!snapshot.reconnectLabel.includes("trace")) {
  throw new Error("Expected trace-aware reconnect label.");
}

console.log("browserized-agent-host tests passed");
