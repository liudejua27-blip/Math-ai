import type { MathDiagnosisRequest, MathDiagnosisResult } from "./math-diagnosis-types";

export type SocraticMode =
  | "request_steps"
  | "confirm_evidence"
  | "first_wrong_step"
  | "socratic_hint"
  | "micro_scaffold"
  | "show_correction_card"
  | "generate_variant"
  | "enter_geometry_lab"
  | "human_review";

export type SocraticPolicyInput = {
  problemText: string;
  studentSteps?: string;
  diagnosis?: Pick<
    MathDiagnosisResult,
    | "firstWrongStep"
    | "needHumanReview"
    | "misconceptionAtoms"
    | "recommendedGeometryLabs"
  >;
  confirmedEvidence?: string[];
  hasLowConfidenceEvidence?: boolean;
  attemptContext?: MathDiagnosisRequest["attemptContext"];
  userIntent?:
    | "ask_answer"
    | "ask_hint"
    | "submit_steps"
    | "ask_explanation"
    | "request_variant"
    | "request_full_solution";
};

export type SocraticPolicyDecision = {
  mode: SocraticMode;
  allowedContent: {
    canShowFinalAnswer: boolean;
    canShowFullSolution: boolean;
    canShowFirstWrongStep: boolean;
    canShowHint: boolean;
    canAskQuestion: boolean;
  };
  nextPrompts: string[];
  reason: string;
  targetAtoms?: string[];
  recommendedAction?: string;
};

const NO_ANSWER_POLICY = {
  canShowFinalAnswer: false,
  canShowFullSolution: false,
  canShowFirstWrongStep: false,
  canShowHint: true,
  canAskQuestion: true,
};

export function decideSocraticPolicy(
  input: SocraticPolicyInput
): SocraticPolicyDecision {
  const hasSteps = Boolean(input.studentSteps?.trim());

  if (!hasSteps) {
    return {
      mode: "request_steps",
      allowedContent: NO_ANSWER_POLICY,
      nextPrompts: [
        "请先写出你自己的第一步或前两步解法，我会帮你找第一处思维断点。",
        "不用完整也可以，至少告诉我你是怎么开始想的。",
      ],
      reason: "没有学生步骤，不能做错因诊断，也不能编造第一错步。",
      recommendedAction: "request_student_steps",
    };
  }

  if (input.hasLowConfidenceEvidence) {
    return {
      mode: "confirm_evidence",
      allowedContent: NO_ANSWER_POLICY,
      nextPrompts: [
        "我发现题干、公式或图形证据还有低置信度信息，请先确认关键条件再做硬诊断。",
      ],
      reason: "低置信度证据会影响首错定位，必须先确认。",
      recommendedAction: "confirm_evidence",
    };
  }

  if (input.diagnosis?.needHumanReview) {
    return {
      mode: "human_review",
      allowedContent: {
        ...NO_ANSWER_POLICY,
        canShowFirstWrongStep: Boolean(input.diagnosis.firstWrongStep),
      },
      nextPrompts: [
        "这题存在低置信度或严格门禁未通过，我先给出可复核诊断，并建议确认关键步骤。",
      ],
      reason: "诊断置信度不足或严格门禁未通过，需要人工复核风险提示。",
      targetAtoms: input.diagnosis.misconceptionAtoms.map((atom) => atom.id),
      recommendedAction: "human_review",
    };
  }

  if ((input.attemptContext?.consecutiveFailures ?? 0) >= 2) {
    return {
      mode: "micro_scaffold",
      allowedContent: NO_ANSWER_POLICY,
      nextPrompts: [
        "我们先降一个小台阶：只判断这一步用了哪个条件，不急着继续推导。",
        "请把题干里的限制条件圈出来，再回到当前步骤。",
      ],
      reason: "学生连续修正失败，应进入更小粒度脚手架。",
      targetAtoms: input.diagnosis?.misconceptionAtoms.map((atom) => atom.id),
      recommendedAction: "micro_scaffold",
    };
  }

  if (input.attemptContext?.correctionCompleted) {
    return {
      mode: "generate_variant",
      allowedContent: {
        canShowFinalAnswer: false,
        canShowFullSolution: false,
        canShowFirstWrongStep: true,
        canShowHint: true,
        canAskQuestion: true,
      },
      nextPrompts: [
        "你已经完成订正。下一步用同因变式检查是否真的迁移。",
      ],
      reason: "订正完成后，需要用同因变式检测迁移。",
      targetAtoms: input.diagnosis?.misconceptionAtoms.map((atom) => atom.id),
      recommendedAction: "generate_variant",
    };
  }

  if (input.diagnosis?.firstWrongStep) {
    const hasGeometryLab =
      (input.diagnosis.recommendedGeometryLabs?.length ?? 0) > 0;
    return {
      mode: "first_wrong_step",
      allowedContent: {
        canShowFinalAnswer: false,
        canShowFullSolution: false,
        canShowFirstWrongStep: true,
        canShowHint: true,
        canAskQuestion: true,
      },
      nextPrompts: [
        "先不要看完整答案。请判断：这一处为什么不能直接成立？",
        "这一步有没有漏掉定义域、端点、分类讨论或几何约束？",
      ],
      reason: "已有学生步骤，优先定位第一断点并通过追问纠偏。",
      targetAtoms: input.diagnosis.misconceptionAtoms.map((atom) => atom.id),
      recommendedAction: hasGeometryLab
        ? "enter_geometry_lab_after_first_wrong_step"
        : "repair_first_wrong_step",
    };
  }

  return {
    mode: "socratic_hint",
    allowedContent: NO_ANSWER_POLICY,
    nextPrompts: [
      "这一步目前没有明显硬错误。下一步你打算检查哪个条件？",
    ],
    reason: "未发现明确首错，继续用追问引导学生自查。",
    targetAtoms: input.diagnosis?.misconceptionAtoms.map((atom) => atom.id),
    recommendedAction: "continue_socratic_hint",
  };
}
