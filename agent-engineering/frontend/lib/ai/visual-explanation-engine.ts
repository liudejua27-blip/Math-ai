import type {
  MathDiagnosisResult,
  RecommendedNextAction,
  StudentReadableTraceItem,
  VisualExplanationSpec,
} from "./math-diagnosis-types";

type VisualExplanationInput = {
  problemText: string;
  diagnosis: Pick<
    MathDiagnosisResult,
    | "firstWrongStep"
    | "firstWrongReason"
    | "confidence"
    | "needHumanReview"
    | "misconceptionAtoms"
    | "evidenceNodes"
    | "strictChecks"
    | "solutionMethods"
    | "solutionComparison"
    | "recommendedGeometryLabs"
  >;
};

export function buildVisualExplanationSpec({
  problemText,
  diagnosis,
}: VisualExplanationInput): VisualExplanationSpec {
  const failedCheck = diagnosis.strictChecks.find(
    (check) => check.status === "fail"
  );
  const recommendedMethod = diagnosis.solutionMethods.find(
    (method) => method.id === diagnosis.solutionComparison.recommendedMethodId
  );
  const linkedGeometryLabLevelId = diagnosis.recommendedGeometryLabs?.[0]?.levelId;

  return {
    type: "visual_explanation",
    title: diagnosis.firstWrongStep
      ? `图上讲解：定位 ${diagnosis.firstWrongStep}`
      : "图上讲解：先核对题干条件",
    linkedGeometryLabLevelId,
    blocks: [
      {
        kind: "condition_highlight",
        text: `先标出题干里的限制条件：${trimForCard(problemText, 96)}`,
        evidenceIds: diagnosis.evidenceNodes.slice(0, 3).map((node) => node.id),
      },
      ...(diagnosis.firstWrongStep
        ? [
            {
              kind: "wrong_step_highlight" as const,
              stepId: diagnosis.firstWrongStep,
              text:
                diagnosis.firstWrongReason ??
                failedCheck?.reason ??
                "这一句需要重新核对等价变形、定义域或分类讨论条件。",
              evidenceIds: diagnosis.evidenceNodes
                .slice(0, 3)
                .map((node) => node.id),
            },
          ]
        : []),
      {
        kind: "correct_path",
        title: recommendedMethod
          ? `推荐路径：${recommendedMethod.title}`
          : "推荐路径：条件 -> 变形 -> 验证",
        methodId: recommendedMethod?.id,
        steps:
          recommendedMethod?.keySteps.slice(0, 4) ??
          [
            "把题干条件逐条写成可检查的数学 claim。",
            "每一步变形后检查是否仍与原条件等价。",
            "把最终结论代回关键限制条件中验证。",
          ],
      },
      ...(diagnosis.misconceptionAtoms.length
        ? [
            {
              kind: "risk_warning" as const,
              text: `高风险错因：${diagnosis.misconceptionAtoms
                .slice(0, 3)
                .map((atom) => atom.label || atom.id)
                .join("、")}。订正时先修复这些判断习惯。`,
              atomIds: diagnosis.misconceptionAtoms
                .slice(0, 3)
                .map((atom) => atom.id),
            },
          ]
        : []),
    ],
  };
}

export function chooseRecommendedNextAction(
  diagnosis: Pick<
    MathDiagnosisResult,
    | "firstWrongStep"
    | "needHumanReview"
    | "recommendedGeometryLabs"
    | "remediationPlan"
  >
): RecommendedNextAction {
  if (diagnosis.recommendedGeometryLabs?.length) {
    return "geometry_lab";
  }
  if (diagnosis.needHumanReview) {
    return "review_plan";
  }
  if (diagnosis.firstWrongStep) {
    return "repair";
  }
  if (diagnosis.remediationPlan?.items.length) {
    return "variant";
  }
  return "repair";
}

export function buildStudentReadableTrace(
  diagnosis: Pick<
    MathDiagnosisResult,
    | "firstWrongStep"
    | "needHumanReview"
    | "misconceptionAtoms"
    | "verifierTraces"
    | "solutionMethods"
    | "recommendedGeometryLabs"
    | "recommendedNextAction"
  >
): StudentReadableTraceItem[] {
  return [
    {
      title: "已读取你的题目和步骤",
      status: "completed",
      message: "系统先把题干、学生步骤和可验证证据整理成统一结构。",
    },
    {
      title: "已定位第一断点",
      status: diagnosis.firstWrongStep ? "warn" : "completed",
      message: diagnosis.firstWrongStep
        ? `第一处需要停下来的位置是 ${diagnosis.firstWrongStep}。`
        : "暂未发现明确首错，建议继续补充更完整的步骤。",
    },
    {
      title: "已检查错因和验证链",
      status: diagnosis.verifierTraces.some((trace) => trace.status === "fail")
        ? "warn"
        : "completed",
      message: `${diagnosis.misconceptionAtoms.length} 个错因原子、${diagnosis.verifierTraces.length} 条验证链已生成。`,
    },
    {
      title: "已生成多解法对比",
      status: diagnosis.solutionMethods.length >= 2 ? "completed" : "warn",
      message: `已给出 ${diagnosis.solutionMethods.length} 种可检查解法，并标注推荐解法和最快解法。`,
    },
    {
      title: "已决定今日下一步",
      status: diagnosis.needHumanReview ? "warn" : "completed",
      message: formatNextAction(diagnosis.recommendedNextAction),
    },
  ];
}

function formatNextAction(action?: RecommendedNextAction) {
  const labels: Record<RecommendedNextAction, string> = {
    repair: "先完成订正，把第一断点修复清楚。",
    variant: "进入同因变式训练，检查是否真的迁移成功。",
    geometry_lab: "进入 Geometry Lab，在图上重建关键对象关系。",
    review_plan: "当前置信度偏低，建议先复核证据再继续。",
  };
  return action ? labels[action] : "继续完成订正和同因变式。";
}

function trimForCard(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}...`
    : normalized;
}
