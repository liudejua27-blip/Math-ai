import type { MathDiagnosisToolResult } from "./math-diagnosis-types";

export type WorkbenchEventType =
  | "diagnosis_started"
  | "input_normalized"
  | "python_verifier_started"
  | "python_verifier_completed"
  | "python_verifier_failed"
  | "typescript_rules_started"
  | "typescript_rules_completed"
  | "student_steps_aligned"
  | "step_verifier_completed"
  | "layered_verifier_completed"
  | "strict_gate_checked"
  | "verifier_trace_added"
  | "policy_decided"
  | "correction_card_ready"
  | "learner_memory_delta_ready"
  | "remediation_plan_ready"
  | "geometry_lab_recommended"
  | "persistence_started"
  | "persistence_completed"
  | "runtime_interrupted"
  | "runtime_resumed"
  | "runtime_retry_requested"
  | "runtime_approval_recorded"
  | "trace_replay_requested"
  | "diagnosis_completed";

export type WorkbenchEventStatus =
  | "queued"
  | "running"
  | "completed"
  | "warn"
  | "blocked"
  | "failed";

export type WorkbenchEventPhase =
  | "runtime"
  | "workflow"
  | "tool"
  | "verification"
  | "memory"
  | "persistence"
  | "control";

export type WorkbenchEvent = {
  id: string;
  type: WorkbenchEventType;
  title: string;
  status: WorkbenchEventStatus;
  detail: string;
  phase?: WorkbenchEventPhase;
  toolName?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  replayable?: boolean;
};

export function buildWorkbenchEventsFromDiagnosis(
  result: MathDiagnosisToolResult | null | undefined
): WorkbenchEvent[] {
  if (!result) {
    return [];
  }

  if ("error" in result) {
    return [
      event("diagnosis_started", "已接收题目", "completed", "等待学生补充自己的解题步骤。", {
        phase: "workflow",
      }),
      event("policy_decided", "教学策略已决定", "warn", result.message, {
        phase: "workflow",
      }),
    ];
  }

  const failedChecks = result.strictChecks.filter(
    (check) => check.status === "fail"
  );

  const events: WorkbenchEvent[] = [
    event("diagnosis_started", "诊断开始", "completed", `job ${result.jobId}`, {
      phase: "runtime",
    }),
    event(
      "student_steps_aligned",
      "步骤已对齐",
      result.firstWrongStep ? "warn" : "completed",
      result.firstWrongStep
        ? `第一断点定位到：${result.firstWrongStep}`
        : "暂未发现明确第一断点",
      { phase: "verification", replayable: true }
    ),
    event(
      "step_verifier_completed",
      "Step verifier 已完成",
      result.stepVerifierDecision?.reliability === "high" ? "completed" : "warn",
      result.stepVerifierDecision
        ? `${result.stepVerifierDecision.candidates.length} 个候选首错，校准置信度 ${Math.round(
            result.stepVerifierDecision.calibratedConfidence * 100
          )}%`
        : "未生成 step verifier decision",
      { phase: "verification", replayable: true }
    ),
    event(
      "layered_verifier_completed",
      "三层 verifier 已完成",
      result.layeredVerifierReport?.overallStatus === "fail"
        ? "failed"
        : result.layeredVerifierReport?.overallStatus === "warn"
          ? "warn"
          : "completed",
      result.layeredVerifierReport
        ? `formal 候选 ${result.layeredVerifierReport.formalReviewPlan.candidateClaims.length} 个`
        : "未生成三层 verifier 报告",
      { phase: "verification", replayable: true }
    ),
    event(
      "strict_gate_checked",
      "严格门禁已检查",
      failedChecks.length > 0 ? "warn" : "completed",
      failedChecks.length > 0
        ? `${failedChecks.length} 个门禁未通过`
        : "关键门禁已通过",
      { phase: "verification", replayable: true }
    ),
    event(
      "verifier_trace_added",
      "验证链已生成",
      result.verifierTraces.some((trace) => trace.status === "not_checked")
        ? "warn"
        : "completed",
      `${result.verifierTraces.length} 条 verifier trace`,
      { phase: "verification", replayable: true }
    ),
    event(
      "policy_decided",
      "教学策略已决定",
      result.policyDecision.allowedContent.canShowFullSolution
        ? "completed"
        : "warn",
      result.policyDecision.reason,
      { phase: "workflow" }
    ),
    event(
      "correction_card_ready",
      "订正卡已生成",
      "completed",
      `${result.correctionCard.blocks.length} 个讲解 block`,
      { phase: "workflow" }
    ),
  ];

  if (result.learnerMemoryDelta) {
    events.push(
      event(
        "learner_memory_delta_ready",
        "学习画像更新已生成",
        "completed",
        `${result.learnerMemoryDelta.atomUpdates.length} 个错因画像变化`,
        { phase: "memory" }
      )
    );
  }

  if (result.remediationPlan) {
    events.push(
      event(
        "remediation_plan_ready",
        "训练计划已生成",
        "completed",
        `${result.remediationPlan.items.length} 个同因训练项`,
        { phase: "workflow" }
      )
    );
  }

  if (result.recommendedGeometryLabs?.length) {
    events.push(
      event(
        "geometry_lab_recommended",
        "几何实验已推荐",
        "completed",
        `${result.recommendedGeometryLabs.length} 个 Geometry Lab`,
        { phase: "workflow" }
      )
    );
  }

  events.push(
    event(
      "diagnosis_completed",
      "诊断完成",
      result.needHumanReview ? "warn" : "completed",
      result.needHumanReview ? "需要人工复核" : "可进入追问和订正",
      { phase: "runtime" }
    )
  );

  return events;
}

export function event(
  type: WorkbenchEventType,
  title: string,
  status: WorkbenchEventStatus,
  detail: string,
  options: Partial<
    Pick<
      WorkbenchEvent,
      | "phase"
      | "toolName"
      | "startedAt"
      | "completedAt"
      | "durationMs"
      | "replayable"
    >
  > = {}
): WorkbenchEvent {
  return {
    id: `${type}-${options.startedAt ?? options.completedAt ?? "static"}`,
    type,
    title,
    status,
    detail,
    ...options,
  };
}
