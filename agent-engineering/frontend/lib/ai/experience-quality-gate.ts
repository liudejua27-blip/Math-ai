import type {
  ExperienceQualityReport,
  MathDiagnosisResult,
} from "./math-diagnosis-types";

type QualityInput = Pick<
  MathDiagnosisResult,
  | "firstWrongStep"
  | "confidence"
  | "needHumanReview"
  | "misconceptionAtoms"
  | "verifierTraces"
  | "claimTraces"
  | "solutionMethods"
  | "solutionComparison"
  | "visualExplanation"
  | "functionVisualExplanation"
  | "recommendedNextAction"
  | "studentReadableTrace"
  | "learnerMemoryDelta"
  | "remediationPlan"
  | "recommendedGeometryLabs"
>;

type QualityCheck = ExperienceQualityReport["checks"][number];

export function buildExperienceQualityReport(
  diagnosis: QualityInput
): ExperienceQualityReport {
  const checks: QualityCheck[] = [
    checkFirstWrongStep(diagnosis),
    checkClaimLevelTrace(diagnosis),
    checkVerifierCoverage(diagnosis),
    checkSolutionMethods(diagnosis),
    checkVisualExplanation(diagnosis),
    checkLearningLoop(diagnosis),
    checkGeometryExperience(diagnosis),
    checkStudentReadableTrace(diagnosis),
  ];
  const overallScore = Math.round(
    checks.reduce((sum, check) => sum + check.score, 0) / checks.length
  );

  return {
    overallScore,
    level: qualityLevel(overallScore, checks),
    summary: buildSummary(overallScore, checks),
    checks,
  };
}

function checkFirstWrongStep(diagnosis: QualityInput): QualityCheck {
  if (!diagnosis.firstWrongStep) {
    return fail(
      "first_wrong_step",
      "首错定位",
      "没有定位到第一错步，不能称为思维诊断。",
      "要求学生补充步骤，或进入人工复核。"
    );
  }
  if (diagnosis.confidence < 0.55 || diagnosis.needHumanReview) {
    return warn(
      "first_wrong_step",
      "首错定位",
      `已定位 ${diagnosis.firstWrongStep}，但置信度偏低。`,
      "展示复核提示，不要直接给确定性结论。"
    );
  }
  return pass(
    "first_wrong_step",
    "首错定位",
    `已定位 ${diagnosis.firstWrongStep}，可进入订正。`
  );
}

function checkClaimLevelTrace(diagnosis: QualityInput): QualityCheck {
  const traceCount = diagnosis.claimTraces?.length ?? 0;
  if (traceCount >= 3) {
    return pass("claim_trace", "Claim 级追踪", `${traceCount} 个 claim 已拆解。`);
  }
  if (traceCount > 0) {
    return warn(
      "claim_trace",
      "Claim 级追踪",
      `${traceCount} 个 claim 已拆解，但还不够细。`,
      "把同一步里的多个表达式继续拆成 claim-level trace。"
    );
  }
  return fail(
    "claim_trace",
    "Claim 级追踪",
    "没有 claim-level trace，容易只做整体门禁判断。",
    "补强 Step Alignment，把每一句、每个表达式拆开验证。"
  );
}

function checkVerifierCoverage(diagnosis: QualityInput): QualityCheck {
  const traces = diagnosis.verifierTraces ?? [];
  const checked = traces.filter((trace) => trace.status !== "not_checked");
  const coverage = traces.length ? checked.length / traces.length : 0;
  if (coverage >= 0.75 && traces.length >= 3) {
    return pass(
      "verifier_coverage",
      "验证链覆盖",
      `${checked.length}/${traces.length} 条验证链已检查。`
    );
  }
  if (traces.length > 0) {
    return warn(
      "verifier_coverage",
      "验证链覆盖",
      `${checked.length}/${traces.length} 条验证链已检查。`,
      "增加 domain verifier 或 Python/SymPy/几何验证覆盖。"
    );
  }
  return fail(
    "verifier_coverage",
    "验证链覆盖",
    "没有 verifier trace，诊断缺少可验证证据。",
    "至少生成 strict gate trace 和 claim trace。"
  );
}

function checkSolutionMethods(diagnosis: QualityInput): QualityCheck {
  const count = diagnosis.solutionMethods?.length ?? 0;
  const hasRecommended = diagnosis.solutionMethods.some(
    (method) => method.id === diagnosis.solutionComparison?.recommendedMethodId
  );
  const hasFastest = diagnosis.solutionMethods.some(
    (method) => method.id === diagnosis.solutionComparison?.fastestMethodId
  );
  if (count >= 2 && count <= 3 && hasRecommended && hasFastest) {
    return pass("solution_methods", "多解法对比", "已生成 2-3 种解法，并标注推荐/最快。");
  }
  return warn(
    "solution_methods",
    "多解法对比",
    `当前生成 ${count} 种解法，推荐/最快标注不完整。`,
    "确保每次成功诊断都有 2-3 种可检查解法。"
  );
}

function checkVisualExplanation(diagnosis: QualityInput): QualityCheck {
  const blocks = diagnosis.visualExplanation?.blocks.length ?? 0;
  const functionVisual = diagnosis.functionVisualExplanation;
  const hasFunctionVisual =
    Boolean(functionVisual) &&
    (functionVisual?.domainHighlights.length ?? 0) > 0 &&
    (functionVisual?.intervals.length ?? 0) > 0 &&
    (functionVisual?.riskWarnings.length ?? 0) > 0;
  if (blocks >= 3 && hasFunctionVisual) {
    return pass(
      "visual_explanation",
      "图上讲解",
      "已生成通用订正高亮和函数专题图上讲解。"
    );
  }
  if (blocks >= 3) {
    return pass(
      "visual_explanation",
      "图上讲解",
      "已生成条件、错步、正确路径和风险提醒。"
    );
  }
  if (hasFunctionVisual) {
    return pass(
      "visual_explanation",
      "函数图上讲解",
      "已生成定义域、区间、关键点和风险提醒。"
    );
  }
  return warn(
    "visual_explanation",
    "图上讲解",
    "图上讲解信息不足。",
    "补齐条件高亮、错步高亮、正确转化路径和函数专题视觉块。"
  );
}

function checkLearningLoop(diagnosis: QualityInput): QualityCheck {
  const hasLoop =
    Boolean(diagnosis.recommendedNextAction) &&
    Boolean(diagnosis.remediationPlan?.items.length);
  if (hasLoop && diagnosis.learnerMemoryDelta) {
    return pass("learning_loop", "学习闭环", "已生成下一步训练并写入学习画像 delta。");
  }
  if (hasLoop) {
    return warn(
      "learning_loop",
      "学习闭环",
      "已生成下一步训练，但本次没有画像 delta。",
      "登录用户应写入 AtomMemory、订正和变式记录。"
    );
  }
  return fail(
    "learning_loop",
    "学习闭环",
    "没有形成订正/变式/复习计划。",
    "诊断后必须给出今日下一步。"
  );
}

function checkGeometryExperience(diagnosis: QualityInput): QualityCheck {
  const geometryAtoms = new Set(["A32", "A33", "A34", "A35", "A38"]);
  const needsGeometry = diagnosis.misconceptionAtoms.some((atom) =>
    geometryAtoms.has(atom.id)
  );
  if (!needsGeometry) {
    return pass("geometry_experience", "几何体验", "本题不需要 Geometry Lab。");
  }
  if (diagnosis.recommendedGeometryLabs?.length) {
    return pass("geometry_experience", "几何体验", "几何错因已推荐对应 Geometry Lab。");
  }
  return warn(
    "geometry_experience",
    "几何体验",
    "命中几何错因，但未推荐 Geometry Lab。",
    "为线面角、二面角、截面构造补专门场景。"
  );
}

function checkStudentReadableTrace(diagnosis: QualityInput): QualityCheck {
  const count = diagnosis.studentReadableTrace?.length ?? 0;
  if (count >= 4) {
    return pass("student_trace", "学生可读过程", "已生成学生能看懂的诊断过程。");
  }
  return warn(
    "student_trace",
    "学生可读过程",
    "学生可读过程不完整。",
    "把工程 trace 翻译成学生、家长、老师能理解的话。"
  );
}

function pass(id: string, label: string, message: string): QualityCheck {
  return { id, label, status: "pass", score: 100, message };
}

function warn(
  id: string,
  label: string,
  message: string,
  nextAction: string
): QualityCheck {
  return { id, label, status: "warn", score: 65, message, nextAction };
}

function fail(
  id: string,
  label: string,
  message: string,
  nextAction: string
): QualityCheck {
  return { id, label, status: "fail", score: 20, message, nextAction };
}

function qualityLevel(
  score: number,
  checks: QualityCheck[]
): ExperienceQualityReport["level"] {
  if (checks.some((check) => check.status === "fail")) {
    return score >= 70 ? "needs_review" : "blocked";
  }
  if (score >= 92) {
    return "world_class_candidate";
  }
  if (score >= 78) {
    return "mvp_strong";
  }
  return "needs_review";
}

function buildSummary(score: number, checks: QualityCheck[]) {
  const failed = checks.filter((check) => check.status === "fail").length;
  const warned = checks.filter((check) => check.status === "warn").length;
  if (score >= 92 && failed === 0 && warned === 0) {
    return "本次诊断已达到体验版顶级闭环：可定位、可验证、可讲解、可训练。";
  }
  if (failed > 0) {
    return `本次诊断还有 ${failed} 个关键缺口，需要复核后再作为强结论展示。`;
  }
  return `本次诊断已可用，但还有 ${warned} 个体验增强点可以继续打磨。`;
}
