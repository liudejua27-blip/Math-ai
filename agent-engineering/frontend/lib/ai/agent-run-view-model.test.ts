import { buildAgentRunViewModel } from "./agent-run-view-model";
import { event } from "./workbench-events";

const events = [
  event("diagnosis_started", "诊断开始", "running", "runtime started", {
    phase: "runtime",
  }),
  event("python_verifier_completed", "Python verifier 完成", "completed", "ok", {
    durationMs: 42,
    phase: "tool",
    toolName: "python_verifier",
  }),
  event("verifier_trace_added", "验证链已生成", "warn", "one warn", {
    phase: "verification",
    replayable: true,
  }),
];

const viewModel = buildAgentRunViewModel({
  events,
  result: null,
  status: "running",
});

if (viewModel.headline !== "验证链已生成") {
  throw new Error("Expected latest event headline.");
}

if (!viewModel.canReplayTrace) {
  throw new Error("Expected replay trace to be available.");
}

if (viewModel.toolReceipts[0]?.name !== "python_verifier") {
  throw new Error("Expected python verifier tool receipt.");
}

if (
  !viewModel.phaseStates.some(
    (phase) => phase.phase === "verification" && phase.status === "warn"
  )
) {
  throw new Error("Expected warning verification phase.");
}

console.log("agent-run-view-model tests passed");
