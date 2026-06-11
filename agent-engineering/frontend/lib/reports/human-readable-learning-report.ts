import type {
  AtomMemoryView,
  DiagnosisHistoryItem,
  StudentWorkbenchSummary,
} from "@/lib/ai/student-workbench-types";

export type AudienceLearningReport = {
  audience: "parent" | "teacher";
  title: string;
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendedActions: string[];
  recentExamples: string[];
  nextCheckIn: string;
};

export type HumanReadableLearningReports = {
  parent: AudienceLearningReport;
  teacher: AudienceLearningReport;
};

export function buildHumanReadableLearningReports(
  summary: StudentWorkbenchSummary
): HumanReadableLearningReports {
  const topAtoms = summary.topAtoms.slice(0, 5);
  const recentDiagnoses = summary.recentDiagnoses.slice(0, 4);
  const weakAtoms = topAtoms.filter((atom) => atom.mastery !== "stable");
  const improvingAtoms = topAtoms.filter(
    (atom) => atom.mastery === "improving" || atom.masteryLabel === "正在修复"
  );
  const stableAtoms = topAtoms.filter(
    (atom) => atom.mastery === "stable" || atom.masteryLabel === "趋于稳定"
  );
  const plan = summary.recommendedPlan.length
    ? summary.recommendedPlan
    : buildFallbackPlan(weakAtoms);

  return {
    parent: {
      audience: "parent",
      title: "本周数学思维观察",
      summary: buildParentSummary({
        recentDiagnoses,
        weakAtoms,
        improvingAtoms,
      }),
      strengths:
        stableAtoms.length > 0
          ? stableAtoms.map((atom) => `${humanAtomLabel(atom)} 已经趋于稳定。`)
          : ["已经开始留下解题步骤，后续可以更准确地发现第一处卡点。"],
      concerns:
        weakAtoms.length > 0
          ? weakAtoms.map(
              (atom) =>
                `${humanAtomLabel(atom)} 近期还会反复出现，需要用同类变式巩固。`
            )
          : ["暂时没有明显反复问题，建议保持每周复盘节奏。"],
      recommendedActions: plan.map(toParentAction).slice(0, 4),
      recentExamples: recentDiagnoses.map(toHumanDiagnosisExample),
      nextCheckIn:
        "下次重点看：订正后换一道同类题，是否还能独立完成。",
    },
    teacher: {
      audience: "teacher",
      title: "学生数学思维教学建议",
      summary: buildTeacherSummary({ recentDiagnoses, weakAtoms }),
      strengths:
        improvingAtoms.length > 0
          ? improvingAtoms.map((atom) => `${humanAtomLabel(atom)} 正在修复，可继续用追问巩固。`)
          : ["学生已经具备按步骤提交思路的基础，可进入更细的过程诊断。"],
      concerns:
        weakAtoms.length > 0
          ? weakAtoms.map(
              (atom) =>
                `${humanAtomLabel(atom)} 是当前优先干预点，建议用 2-3 道同因变式观察迁移。`
            )
          : ["暂未发现高频复发点，可提高综合题比例。"],
      recommendedActions: plan.map(toTeacherAction).slice(0, 4),
      recentExamples: recentDiagnoses.map(toHumanDiagnosisExample),
      nextCheckIn:
        "下一次课堂或答疑时，先让学生口头说明关键条件，再检查计算。",
    },
  };
}

export function assertNoTechnicalTrace(report: HumanReadableLearningReports) {
  const text = JSON.stringify(report).toLowerCase();
  const banned = [
    "trace",
    "verifier",
    "strictcheck",
    "strict check",
    "atomid",
    "evidenceid",
    "json",
    "runtime",
  ];
  return banned.filter((word) => text.includes(word));
}

function buildParentSummary({
  recentDiagnoses,
  weakAtoms,
  improvingAtoms,
}: {
  recentDiagnoses: DiagnosisHistoryItem[];
  weakAtoms: AtomMemoryView[];
  improvingAtoms: AtomMemoryView[];
}) {
  if (recentDiagnoses.length === 0) {
    return "完成一次诊断后，这里会用家长能看懂的话说明孩子哪里在进步、哪里还需要巩固。";
  }

  const weakText = weakAtoms[0]
    ? `目前最需要关注的是 ${humanAtomLabel(weakAtoms[0])}`
    : "目前没有明显反复问题";
  const improvingText = improvingAtoms[0]
    ? `，同时 ${humanAtomLabel(improvingAtoms[0])} 已经有修复迹象`
    : "";
  return `本周共记录 ${recentDiagnoses.length} 次诊断。${weakText}${improvingText}。`;
}

function buildTeacherSummary({
  recentDiagnoses,
  weakAtoms,
}: {
  recentDiagnoses: DiagnosisHistoryItem[];
  weakAtoms: AtomMemoryView[];
}) {
  if (recentDiagnoses.length === 0) {
    return "暂无诊断记录。建议先收集 1-2 道学生原始解题步骤，再判断教学干预点。";
  }

  const priority = weakAtoms
    .slice(0, 2)
    .map(humanAtomLabel)
    .join("、");
  return priority
    ? `最近 ${recentDiagnoses.length} 次诊断显示，优先教学干预点是 ${priority}。`
    : `最近 ${recentDiagnoses.length} 次诊断未出现稳定复发点，可提高综合题比例。`;
}

function buildFallbackPlan(atoms: AtomMemoryView[]) {
  if (atoms.length === 0) {
    return ["保持每周 2 次综合复盘，优先做迁移变式。"];
  }

  return atoms.slice(0, 3).map((atom) => {
    if (atom.selfRepairRate < 0.45) {
      return `先复盘 ${humanAtomLabel(atom)}，再做 1 道基础同类题。`;
    }
    if (atom.transferRate < 0.45) {
      return `围绕 ${humanAtomLabel(atom)} 做 2 道换情境变式题。`;
    }
    return `用 1 道综合题确认 ${humanAtomLabel(atom)} 是否稳定。`;
  });
}

function toParentAction(action: string) {
  return action
    .replace(/[A-Z]\d{2}/g, "相关薄弱点")
    .replace(/Boss/g, "综合")
    .replace(/mastery/gi, "掌握情况");
}

function toTeacherAction(action: string) {
  return action
    .replace(/[A-Z]\d{2}/g, "对应薄弱点")
    .replace(/Boss/g, "综合")
    .replace(/mastery/gi, "掌握情况");
}

function toHumanDiagnosisExample(item: DiagnosisHistoryItem) {
  const atoms = item.atomLabels.length
    ? `主要问题：${item.atomLabels.slice(0, 2).join("、")}`
    : "主要问题：需要继续观察";
  const review = item.needHumanReview ? "，建议老师复核一次" : "";
  return `${item.problemPreview || "一道练习题"}：${atoms}${review}。`;
}

function humanAtomLabel(atom: AtomMemoryView) {
  return atom.atomLabel.replace(/^A\d+\s*[:：]?\s*/, "");
}
