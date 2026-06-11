import { generateUUID } from "@/lib/utils";
import {
  appendMathAgentRunEvent,
  saveMathAgentRunRecord,
  updateMathAgentRunRecord,
} from "@/lib/db/queries";
import type {
  MathDiagnosisRequest,
  MathDiagnosisToolResult,
} from "../math-diagnosis-types";
import {
  mathDiagnosisRequestSchema,
  runMathDiagnosisWorkflow,
} from "../math-diagnosis-workflow";
import type { WorkbenchEvent } from "../workbench-events";
import { buildWorkbenchEventsFromDiagnosis, event } from "../workbench-events";
import {
  createPythonVerifierAdapter,
  type RuntimeVerifierAdapter,
} from "./verifier-adapter";

export { mathDiagnosisRequestSchema };

export type MathAgentRunStatus =
  | "idle"
  | "running"
  | "waiting_approval"
  | "interrupted"
  | "failed"
  | "completed";

export type MathAgentRuntimeControlAction =
  | "interrupt"
  | "resume"
  | "approve_evidence"
  | "reject_diagnosis"
  | "request_human_review"
  | "retry"
  | "replay_trace";

export type MathAgentRuntimeEvent =
  | {
      type: "runtime_started";
      runId: string;
      status: MathAgentRunStatus;
      event: WorkbenchEvent;
    }
  | {
      type: "workflow_event";
      runId: string;
      status: MathAgentRunStatus;
      event: WorkbenchEvent;
    }
  | {
      type: "runtime_control";
      runId: string;
      status: MathAgentRunStatus;
      event: WorkbenchEvent;
    }
  | {
      type: "runtime_completed";
      runId: string;
      status: MathAgentRunStatus;
      result: MathDiagnosisToolResult;
      events: WorkbenchEvent[];
    }
  | {
      type: "runtime_failed";
      runId: string;
      status: MathAgentRunStatus;
      error: string;
      events: WorkbenchEvent[];
    };

export type MathAgentRunRecord = {
  runId: string;
  status: MathAgentRunStatus;
  request: MathDiagnosisRequest;
  events: WorkbenchEvent[];
  result?: MathDiagnosisToolResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type MathAgentRuntime = {
  diagnose(request: MathDiagnosisRequest): Promise<MathDiagnosisToolResult>;
  diagnoseEvents(
    request: MathDiagnosisRequest,
    options?: { runId?: string }
  ): AsyncGenerator<MathAgentRuntimeEvent>;
  controlRun(
    runId: string,
    action: MathAgentRuntimeControlAction,
    payload?: Record<string, unknown>
  ): MathAgentRunRecord;
  getRun(runId: string): MathAgentRunRecord | null;
  replayTrace(runId: string): WorkbenchEvent[];
};

class InProcessMathAgentRuntime implements MathAgentRuntime {
  private runs = new Map<string, MathAgentRunRecord>();
  private abortControllers = new Map<string, AbortController>();

  constructor(
    private readonly verifierAdapter: RuntimeVerifierAdapter =
      createPythonVerifierAdapter()
  ) {}

  async diagnose(request: MathDiagnosisRequest) {
    const runId = generateUUID();
    const controller = new AbortController();
    this.abortControllers.set(runId, controller);
    const record = this.createRunRecord(runId, request);

    try {
      const result = await runMathDiagnosisWorkflow(request, {
        verifierAdapter: this.verifierAdapter,
        hooks: {
          signal: controller.signal,
          onEvent: (item) => this.pushEvent(record.runId, item),
        },
      });
      this.completeRun(runId, result);
      return result;
    } catch (error) {
      this.failRun(runId, error);
      throw error;
    } finally {
      this.abortControllers.delete(runId);
    }
  }

  async *diagnoseEvents(
    request: MathDiagnosisRequest,
    options: { runId?: string } = {}
  ): AsyncGenerator<MathAgentRuntimeEvent> {
    const runId = options.runId ?? generateUUID();
    const controller = new AbortController();
    const queue = createRuntimeQueue<MathAgentRuntimeEvent>();
    const record = this.createRunRecord(runId, request);
    this.abortControllers.set(runId, controller);

    const started = event(
      "diagnosis_started",
      "Runtime 已启动",
      "running",
      "MathAgentRuntime 正在执行可观察诊断 run。",
      { phase: "runtime", startedAt: new Date().toISOString() }
    );
    this.pushEvent(runId, started);
    queue.push({
      type: "runtime_started",
      runId,
      status: "running",
      event: started,
    });

    const task = runMathDiagnosisWorkflow(request, {
      verifierAdapter: this.verifierAdapter,
      hooks: {
        signal: controller.signal,
        onEvent: (item) => {
          this.pushEvent(runId, item);
          queue.push({
            type: "workflow_event",
            runId,
            status: this.runs.get(runId)?.status ?? "running",
            event: item,
          });
        },
      },
    })
      .then((result) => {
        const completed = this.completeRun(runId, result);
        queue.push({
          type: "runtime_completed",
          runId,
          status: completed.status,
          result,
          events: completed.events,
        });
      })
      .catch((error) => {
        const failed = this.failRun(runId, error);
        queue.push({
          type: "runtime_failed",
          runId,
          status: failed.status,
          error: failed.error ?? "Unknown runtime failure.",
          events: failed.events,
        });
      })
      .finally(() => {
        this.abortControllers.delete(runId);
        queue.close();
      });

    for await (const item of queue) {
      yield item;
    }
    await task;
  }

  controlRun(
    runId: string,
    action: MathAgentRuntimeControlAction,
    payload: Record<string, unknown> = {}
  ) {
    const record = this.getExistingRun(runId);
    const now = new Date().toISOString();
    const controlEvent = event(
      controlEventType(action),
      controlEventTitle(action),
      action === "interrupt" ? "blocked" : "completed",
      controlEventDetail(action, payload),
      { phase: "control", completedAt: now, replayable: action === "replay_trace" }
    );

    if (action === "interrupt") {
      this.abortControllers.get(runId)?.abort();
      record.status = "interrupted";
    } else if (action === "resume") {
      record.status = "running";
    } else if (action === "approve_evidence") {
      record.status = "running";
    } else if (action === "reject_diagnosis" || action === "request_human_review") {
      record.status = "waiting_approval";
    } else if (action === "retry") {
      record.status = "running";
    }

    record.events.push(controlEvent);
    record.updatedAt = now;
    persistRun(record);
    return record;
  }

  getRun(runId: string) {
    return this.runs.get(runId) ?? null;
  }

  replayTrace(runId: string) {
    return this.getExistingRun(runId).events;
  }

  private createRunRecord(runId: string, request: MathDiagnosisRequest) {
    const now = new Date().toISOString();
    const record: MathAgentRunRecord = {
      runId,
      status: "running",
      request,
      events: [],
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(runId, record);
    persistRun(record);
    return record;
  }

  private pushEvent(runId: string, item: WorkbenchEvent) {
    const record = this.getExistingRun(runId);
    record.events.push(item);
    record.updatedAt = new Date().toISOString();
    persistRunEvent(record);
  }

  private completeRun(runId: string, result: MathDiagnosisToolResult) {
    const record = this.getExistingRun(runId);
    record.status = "completed";
    record.result = result;
    record.events = mergeRuntimeEvents(record.events, buildWorkbenchEventsFromDiagnosis(result));
    record.updatedAt = new Date().toISOString();
    persistRun(record);
    return record;
  }

  private failRun(runId: string, error: unknown) {
    const record = this.getExistingRun(runId);
    record.status =
      error instanceof DOMException && error.name === "AbortError"
        ? "interrupted"
        : "failed";
    record.error =
      error instanceof Error ? error.message : "Unknown runtime failure.";
    record.events.push(
      event(
        record.status === "interrupted" ? "runtime_interrupted" : "python_verifier_failed",
        record.status === "interrupted" ? "Runtime 已中断" : "Runtime 执行失败",
        record.status === "interrupted" ? "blocked" : "failed",
        record.error,
        { phase: "runtime", completedAt: new Date().toISOString() }
      )
    );
    record.updatedAt = new Date().toISOString();
    persistRun(record);
    return record;
  }

  private getExistingRun(runId: string) {
    const record = this.runs.get(runId);
    if (!record) {
      throw new Error(`MathAgentRuntime run not found: ${runId}`);
    }
    return record;
  }
}

let singleton: MathAgentRuntime | null = null;

export function getMathAgentRuntime(): MathAgentRuntime {
  if (!singleton) {
    singleton = new InProcessMathAgentRuntime();
  }

  return singleton;
}

export function runMathAgentDiagnosis(request: MathDiagnosisRequest) {
  const runtime = getMathAgentRuntime();
  return runtime.diagnose(request);
}

function persistRun(record: MathAgentRunRecord) {
  void updateMathAgentRunRecord({
    runId: record.runId,
    status: record.status,
    request: record.request,
    events: record.events,
    result: record.result,
    error: record.error,
    updatedAt: record.updatedAt,
  }).then((updated) => {
    if (updated) {
      return;
    }
    return saveMathAgentRunRecord(record);
  });
}

function persistRunEvent(record: MathAgentRunRecord) {
  void appendMathAgentRunEvent({
    runId: record.runId,
    request: record.request,
    events: record.events,
    status: record.status,
    updatedAt: record.updatedAt,
  });
}

function createRuntimeQueue<T>() {
  const values: T[] = [];
  const resolvers: Array<(value: IteratorResult<T>) => void> = [];
  let closed = false;

  return {
    push(value: T) {
      const resolver = resolvers.shift();
      if (resolver) {
        resolver({ value, done: false });
        return;
      }
      values.push(value);
    },
    close() {
      closed = true;
      while (resolvers.length > 0) {
        resolvers.shift()?.({ value: undefined, done: true });
      }
    },
    async *[Symbol.asyncIterator]() {
      while (!closed || values.length > 0) {
        const value = values.shift();
        if (value) {
          yield value;
          continue;
        }

        const next = await new Promise<IteratorResult<T>>((resolve) => {
          resolvers.push(resolve);
        });
        if (next.done) {
          return;
        }
        yield next.value;
      }
    },
  };
}

function mergeRuntimeEvents(
  liveEvents: WorkbenchEvent[],
  replayEvents: WorkbenchEvent[]
) {
  const seen = new Set(liveEvents.map((item) => item.type));
  return [...liveEvents, ...replayEvents.filter((item) => !seen.has(item.type))];
}

function controlEventType(action: MathAgentRuntimeControlAction) {
  const map: Record<MathAgentRuntimeControlAction, WorkbenchEvent["type"]> = {
    interrupt: "runtime_interrupted",
    resume: "runtime_resumed",
    approve_evidence: "runtime_approval_recorded",
    reject_diagnosis: "runtime_approval_recorded",
    request_human_review: "runtime_approval_recorded",
    retry: "runtime_retry_requested",
    replay_trace: "trace_replay_requested",
  };
  return map[action];
}

function controlEventTitle(action: MathAgentRuntimeControlAction) {
  const map: Record<MathAgentRuntimeControlAction, string> = {
    interrupt: "用户中断运行",
    resume: "用户继续运行",
    approve_evidence: "证据已确认",
    reject_diagnosis: "诊断已拒绝",
    request_human_review: "已要求复核",
    retry: "用户要求重试",
    replay_trace: "用户回放 trace",
  };
  return map[action];
}

function controlEventDetail(
  action: MathAgentRuntimeControlAction,
  payload: Record<string, unknown>
) {
  if (action === "approve_evidence") {
    return `确认的证据：${JSON.stringify(payload.confirmedEvidence ?? [])}`;
  }
  if (action === "request_human_review") {
    return "学生要求人工复核当前诊断。";
  }
  if (action === "reject_diagnosis") {
    return "学生拒绝当前诊断，后续需要重新对齐证据。";
  }
  if (action === "replay_trace") {
    return "正在回放本次诊断的事件和验证链。";
  }
  return "Runtime control action accepted.";
}
