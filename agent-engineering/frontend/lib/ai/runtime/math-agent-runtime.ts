import type {
  MathDiagnosisRequest,
  MathDiagnosisToolResult,
} from "../math-diagnosis-types";
import {
  mathDiagnosisRequestSchema,
  runMathDiagnosisWorkflow,
} from "../math-diagnosis-workflow";
import type { WorkbenchEvent } from "../workbench-events";
import { buildWorkbenchEventsFromDiagnosis } from "../workbench-events";

export { mathDiagnosisRequestSchema };

export type MathAgentRuntimeEvent =
  | {
      type: "runtime_started";
      detail: string;
    }
  | {
      type: "workflow_event";
      event: WorkbenchEvent;
    }
  | {
      type: "runtime_completed";
      result: MathDiagnosisToolResult;
    };

export type MathAgentRuntime = {
  diagnose(request: MathDiagnosisRequest): Promise<MathDiagnosisToolResult>;
  diagnoseEvents(
    request: MathDiagnosisRequest
  ): AsyncGenerator<MathAgentRuntimeEvent>;
};

class InProcessMathAgentRuntime implements MathAgentRuntime {
  async diagnose(request: MathDiagnosisRequest) {
    return runMathDiagnosisWorkflow(request);
  }

  async *diagnoseEvents(
    request: MathDiagnosisRequest
  ): AsyncGenerator<MathAgentRuntimeEvent> {
    yield {
      type: "runtime_started",
      detail: "MathAgentRuntime accepted a diagnosis request.",
    };

    const result = await this.diagnose(request);

    for (const event of buildWorkbenchEventsFromDiagnosis(result)) {
      yield {
        type: "workflow_event",
        event,
      };
    }

    yield {
      type: "runtime_completed",
      result,
    };
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
