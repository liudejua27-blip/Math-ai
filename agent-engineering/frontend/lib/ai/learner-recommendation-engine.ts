import type {
  AtomMemory,
  LearnerMemoryDelta,
  LearnerRecommendation,
  LearnerRecurrenceRisk,
} from "./learner-memory-types";

export type LearnerRecommendationInput = {
  learnerMemoryDelta?: LearnerMemoryDelta;
  targetAtoms: Array<{ id: string; label?: string }>;
  now?: Date;
};

export function buildLearnerRecommendation({
  learnerMemoryDelta,
  targetAtoms,
  now = new Date(),
}: LearnerRecommendationInput): LearnerRecommendation | undefined {
  if (!learnerMemoryDelta) {
    return;
  }

  const atomUpdates = learnerMemoryDelta.atomUpdates;
  const weakest = choosePriorityAtom(atomUpdates);
  if (!weakest) {
    const fallbackAtoms = targetAtoms.slice(0, 2).map((atom) => atom.id);
    return {
      nextProblem: {
        type: "transfer_variant",
        title: "迁移验证题",
        prompt: "换一道同结构题，检查这次订正能不能迁移到新题。",
        targetAtoms: fallbackAtoms,
        difficulty: "transfer",
        reason: "本次没有明显高风险错因，适合用迁移题验证稳定性。",
      },
      adaptiveTeaching: {
        questionDifficulty: "transfer",
        explanationStyle: "variant_first",
        canShowFullSolution: false,
        fullSolutionReason: "先用迁移题验证，不急着看完整解析。",
      },
      reviewPlan: {
        shouldEnter: false,
        cadence: "none",
        predictedRecurrenceRisk: "low",
        reason: "暂未发现需要进入复习计划的复发信号。",
      },
      heartbeat: {
        enabled: false,
        message: "保持当前练习节奏即可。",
      },
      recurrencePrediction: {
        atomId: null,
        risk: "low",
        score: 0.18,
        factors: ["本次没有明显弱错因"],
      },
    };
  }

  const prediction = predictRecurrence(weakest);
  const questionDifficulty = chooseQuestionDifficulty(weakest, prediction.risk);
  const explanationStyle = chooseExplanationStyle(
    learnerMemoryDelta,
    weakest,
    prediction.risk
  );
  const canShowFullSolution =
    prediction.risk === "low" &&
    weakest.selfRepairRate >= 0.55 &&
    weakest.transferRate >= 0.55;
  const reviewPlan = buildReviewPlan(prediction, now);
  const targetAtomIds = [
    weakest.atomId,
    ...atomUpdates
      .filter((atom) => atom.atomId !== weakest.atomId && atom.mastery !== "stable")
      .map((atom) => atom.atomId),
  ].slice(0, 3);

  return {
    nextProblem: {
      type: chooseNextProblemType(weakest, prediction.risk),
      title: buildNextProblemTitle(weakest, prediction.risk),
      prompt: buildNextProblemPrompt(weakest, explanationStyle),
      targetAtoms: targetAtomIds,
      difficulty: questionDifficulty,
      reason: buildNextProblemReason(weakest, prediction.risk),
    },
    adaptiveTeaching: {
      questionDifficulty,
      explanationStyle,
      canShowFullSolution,
      fullSolutionReason: canShowFullSolution
        ? "复发风险较低，迁移和订正表现稳定；学生尝试后可以开放完整解析。"
        : "仍存在复发或迁移风险，先用追问、微脚手架和变式训练推动学生自我修复。",
    },
    reviewPlan,
    heartbeat: {
      enabled: reviewPlan.shouldEnter,
      nextCheckInAt: reviewPlan.nextCheckInAt,
      message: buildHeartbeatMessage(weakest, reviewPlan.predictedRecurrenceRisk),
    },
    recurrencePrediction: prediction,
  };
}

export function predictRecurrence(
  atom: AtomMemory
): LearnerRecommendation["recurrencePrediction"] {
  const factors: string[] = [];
  let score = atom.recurrenceRate30d * 0.45 + atom.recurrenceRateLast10 * 0.25;
  score += (1 - atom.transferRate) * 0.18;
  score += (1 - atom.selfRepairRate) * 0.12;

  if (atom.recurrenceRate30d >= 0.6) {
    factors.push("30 天复发率偏高");
  }
  if (atom.recurrenceRateLast10 >= 0.6) {
    factors.push("最近 10 次仍在反复");
  }
  if (atom.transferRate < 0.45) {
    factors.push("变式迁移率偏低");
  }
  if (atom.selfRepairRate < 0.45) {
    factors.push("订正后自我修复率偏低");
  }
  if (factors.length === 0) {
    factors.push("近期表现相对稳定");
  }

  const boundedScore = roundScore(score);
  return {
    atomId: atom.atomId,
    risk: riskFromScore(boundedScore),
    score: boundedScore,
    factors,
  };
}

function choosePriorityAtom(atoms: AtomMemory[]) {
  return [...atoms].sort((first, second) => {
    const firstPrediction = predictRecurrence(first);
    const secondPrediction = predictRecurrence(second);
    return (
      secondPrediction.score - firstPrediction.score ||
      second.errorCount - first.errorCount ||
      first.atomId.localeCompare(second.atomId)
    );
  })[0];
}

function chooseQuestionDifficulty(
  atom: AtomMemory,
  risk: LearnerRecurrenceRisk
): LearnerRecommendation["adaptiveTeaching"]["questionDifficulty"] {
  if (risk === "high" || atom.selfRepairRate < 0.35) {
    return "micro";
  }
  if (atom.transferRate < 0.45) {
    return "standard";
  }
  if (atom.transferRate >= 0.7 && atom.selfRepairRate >= 0.6) {
    return "challenge";
  }
  return "transfer";
}

function chooseExplanationStyle(
  delta: LearnerMemoryDelta,
  atom: AtomMemory,
  risk: LearnerRecurrenceRisk
): LearnerRecommendation["adaptiveTeaching"]["explanationStyle"] {
  if (hasGeometryAtom(delta.summary.updatedAtoms)) {
    return "visual_first";
  }
  if (risk === "high" || atom.selfRepairRate < 0.4) {
    return "micro_scaffold";
  }
  if (atom.transferRate >= 0.6) {
    return "variant_first";
  }
  return "socratic_standard";
}

function chooseNextProblemType(
  atom: AtomMemory,
  risk: LearnerRecurrenceRisk
): LearnerRecommendation["nextProblem"]["type"] {
  if (hasGeometryAtom([atom.atomId])) {
    return "geometry_lab";
  }
  if (risk === "high" || atom.selfRepairRate < 0.4) {
    return "surface_variant";
  }
  if (atom.transferRate < 0.5) {
    return "structure_variant";
  }
  if (risk === "medium") {
    return "transfer_variant";
  }
  return "review_mix";
}

function buildReviewPlan(
  prediction: LearnerRecommendation["recurrencePrediction"],
  now: Date
): LearnerRecommendation["reviewPlan"] {
  if (prediction.risk === "high") {
    return {
      shouldEnter: true,
      cadence: "tomorrow",
      nextCheckInAt: addDays(now, 1),
      predictedRecurrenceRisk: "high",
      reason: "高复发风险错因需要明天主动复查，避免订正后很快反弹。",
    };
  }
  if (prediction.risk === "medium") {
    return {
      shouldEnter: true,
      cadence: "three_day",
      nextCheckInAt: addDays(now, 3),
      predictedRecurrenceRisk: "medium",
      reason: "中等复发风险适合 3 天后用同因变式复查。",
    };
  }
  return {
    shouldEnter: false,
    cadence: "weekly",
    nextCheckInAt: addDays(now, 7),
    predictedRecurrenceRisk: "low",
    reason: "低复发风险暂不强制复习，纳入每周综合复盘即可。",
  };
}

function buildNextProblemTitle(atom: AtomMemory, risk: LearnerRecurrenceRisk) {
  if (hasGeometryAtom([atom.atomId])) {
    return `${atom.label}：Geometry Lab 可视化复盘`;
  }
  if (risk === "high") {
    return `${atom.label}：表层同因修复题`;
  }
  if (atom.transferRate < 0.5) {
    return `${atom.label}：结构变式迁移题`;
  }
  return `${atom.label}：综合复查题`;
}

function buildNextProblemPrompt(
  atom: AtomMemory,
  style: LearnerRecommendation["adaptiveTeaching"]["explanationStyle"]
) {
  if (style === "visual_first") {
    return "先进入 Geometry Lab 选择关键对象，再回到题目步骤说明几何依据。";
  }
  if (style === "micro_scaffold") {
    return `下一题先只写出和“${atom.label}”有关的第一条必要条件，再继续计算。`;
  }
  if (style === "variant_first") {
    return `直接做一道“${atom.label}”同因变式，检查换题后是否还能避开旧错误。`;
  }
  return `做一道围绕“${atom.label}”的标准变式题，先写思路再求答案。`;
}

function buildNextProblemReason(atom: AtomMemory, risk: LearnerRecurrenceRisk) {
  if (risk === "high") {
    return `${atom.label} 已出现高复发信号，下一题应降低跨度，先修复最小错误环节。`;
  }
  if (atom.transferRate < 0.5) {
    return `${atom.label} 的迁移率偏低，下一题要验证能否换情境继续做对。`;
  }
  return `${atom.label} 已有一定修复迹象，适合用综合复查巩固。`;
}

function buildHeartbeatMessage(atom: AtomMemory, risk: LearnerRecurrenceRisk) {
  if (risk === "high") {
    return `明天主动提醒复盘“${atom.label}”：先做 1 道表层同因题，再决定是否进入结构变式。`;
  }
  if (risk === "medium") {
    return `3 天后提醒复查“${atom.label}”：重点看能不能独立写出关键条件。`;
  }
  return `本周复盘时抽查“${atom.label}”，确认订正没有反弹。`;
}

function hasGeometryAtom(atomIds: string[]) {
  const geometryAtoms = new Set([
    "A31",
    "A32",
    "A33",
    "A34",
    "A35",
    "A37",
    "A38",
    "A47",
  ]);
  return atomIds.some((atomId) => geometryAtoms.has(atomId));
}

function riskFromScore(score: number): LearnerRecurrenceRisk {
  if (score >= 0.68) {
    return "high";
  }
  if (score >= 0.4) {
    return "medium";
  }
  return "low";
}

function roundScore(value: number) {
  return Math.max(0, Math.min(1, Math.round(value * 100) / 100));
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}
