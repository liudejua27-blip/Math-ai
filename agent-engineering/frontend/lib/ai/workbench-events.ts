import type { MathDiagnosisToolResult } from "./math-diagnosis-types";

export type WorkbenchEventType =
  | "diagnosis_started"
  | "student_steps_aligned"
  | "strict_gate_checked"
  | "verifier_trace_added"
  | "policy_decided"
  | "correction_card_ready"
  | "learner_memory_delta_ready"
  | "remediation_plan_ready"
  | "geometry_lab_recommended"
  | "diagnosis_completed";

export type WorkbenchEvent = {
  id: string;
  type: WorkbenchEventType;
  title: string;
  status: "completed" | "warn" | "blocked";
  detail: string;
};

export function buildWorkbenchEventsFromDiagnosis(
  result: MathDiagnosisToolResult | null | undefined
): WorkbenchEvent[] {
  if (!result) {
    return [];
  }

  if ("error" in result) {
    return [
      event("diagnosis_started", "已接收题目", "completed", "等待学生补充自己的解题步骤。"),
      event("policy_decided", "教学策略已决定", "warn", result.message),
    ];
  }

  const failedChecks = result.strictChecks.filter(
    (check) => check.status === "fail"
  );

  const events: WorkbenchEvent[] = [
    event("diagnosis_started", "诊断开始", "completed", `job ${result.jobId}`),
    event(
      "student_steps_aligned",
      "步骤已对齐",
      result.firstWrongStep ? "warn" : "completed",
      result.firstWrongStep
        ? `第一断点定位到 ${result.firstWrongStep}`
        : "暂未发现明确第一断点"
    ),
    event(
      "strict_gate_checked",
      "严格门禁已检查",
      failedChecks.length > 0 ? "warn" : "completed",
      failedChecks.length > 0
        ? `${failedChecks.length} 个门禁未通过`
        : "关键门禁已通过"
    ),
    event(
      "verifier_trace_added",
      "验证链已生成",
      result.verifierTraces.some((trace) => trace.status === "not_checked")
        ? "warn"
        : "completed",
      `${result.verifierTraces.length} 条 verifier trace`
    ),
    event(
      "policy_decided",
      "教学策略已决定",
      result.policyDecision.allowedContent.canShowFullSolution
        ? "completed"
        : "warn",
      result.policyDecision.reason
    ),
    event(
      "correction_card_ready",
      "订正卡已生成",
      "completed",
      `${result.correctionCard.blocks.length} 个讲解 block`
    ),
  ];

  if (result.learnerMemoryDelta) {
    events.push(
      event(
        "learner_memory_delta_ready",
        "画像更新已生成",
        "completed",
        `${result.learnerMemoryDelta.atomUpdates.length} 个错因画像变化`
      )
    );
  }

  if (result.remediationPlan) {
    events.push(
      event(
        "remediation_plan_ready",
        "训练计划已生成",
        "completed",
        `${result.remediationPlan.items.length} 个同因训练项`
      )
    );
  }

  if (result.recommendedGeometryLabs?.length) {
    events.push(
      event(
        "geometry_lab_recommended",
        "几何实验已推荐",
        "completed",
        `${result.recommendedGeometryLabs.length} 个 Geometry Lab`
      )
    );
  }

  events.push(
    event(
      "diagnosis_completed",
      "诊断完成",
      result.needHumanReview ? "warn" : "completed",
      result.needHumanReview ? "需要人工复核" : "可进入追问和订正"
    )
  );

  return events;
}

function event(
  type: WorkbenchEventType,
  title: string,
  status: WorkbenchEvent["status"],
  detail: string
): WorkbenchEvent {
  return {
    id: type,
    type,
    title,
    status,
    detail,
  };
}

