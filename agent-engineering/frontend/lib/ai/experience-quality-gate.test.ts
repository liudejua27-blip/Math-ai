import assert from "node:assert/strict";
import { buildExperienceQualityReport } from "./experience-quality-gate";
import type { MathDiagnosisResult } from "./math-diagnosis-types";

const strongDiagnosis: Pick<
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
  | "recommendedNextAction"
  | "studentReadableTrace"
  | "learnerMemoryDelta"
  | "remediationPlan"
  | "recommendedGeometryLabs"
> = {
  firstWrongStep: "S1",
  confidence: 0.86,
  needHumanReview: false,
  misconceptionAtoms: [
    {
      id: "A07",
      label: "定义域意识弱",
      level: "high",
      description: "求解前没有先确认变量范围。",
    },
  ],
  verifierTraces: [
    {
      id: "vt-1",
      claim: "S1 domain",
      claimType: "domain",
      verifier: "typescript_strict_gate",
      status: "fail",
      evidenceIds: ["E1"],
      failureReason: "缺少定义域检查。",
      confidence: 0.8,
    },
    {
      id: "vt-2",
      claim: "S1 derivative",
      claimType: "derivative",
      verifier: "typescript_strict_gate",
      status: "pass",
      evidenceIds: ["E2"],
      confidence: 0.82,
    },
    {
      id: "vt-3",
      claim: "S2 extremum",
      claimType: "monotonicity",
      verifier: "high_school_domain_verifier",
      status: "warn",
      evidenceIds: ["E3"],
      confidence: 0.7,
    },
  ],
  claimTraces: [
    {
      id: "c1",
      stepId: "S1",
      sentence: "求导",
      expression: "f'(x)",
      claimType: "domain",
      status: "fail",
      atomIds: ["A07"],
      strictCheckIds: ["Q1"],
      reason: "漏定义域。",
      confidence: 0.8,
    },
    {
      id: "c2",
      stepId: "S1",
      sentence: "令导数为 0",
      expression: "f'(x)=0",
      claimType: "equivalence_transform",
      status: "pass",
      atomIds: [],
      strictCheckIds: [],
      reason: "变形通过。",
      confidence: 0.8,
    },
    {
      id: "c3",
      stepId: "S2",
      sentence: "判断极值",
      expression: null,
      claimType: "monotonicity_extremum",
      status: "warn",
      atomIds: ["A18"],
      strictCheckIds: ["Q2"],
      reason: "需要单调性表。",
      confidence: 0.7,
    },
  ],
  solutionMethods: [
    {
      id: "M1",
      title: "常规导数表法",
      strategyType: "derivative_table",
      isRecommended: true,
      isFastest: false,
      estimatedMinutes: 5,
      difficulty: "standard",
      bestFor: "稳健修复定义域和单调性问题。",
      riskWarnings: [],
      keySteps: ["写定义域", "求导", "列表"],
      verificationFocus: ["定义域", "单调区间"],
      relatedAtomIds: ["A07"],
      verifierTraceIds: ["vt-1"],
    },
    {
      id: "M2",
      title: "考场快速法",
      strategyType: "exam_shortcut",
      isRecommended: false,
      isFastest: true,
      estimatedMinutes: 3,
      difficulty: "hard",
      bestFor: "熟练后提速。",
      riskWarnings: ["容易漏定义域。"],
      keySteps: ["识别结构", "快速求临界点"],
      verificationFocus: ["定义域"],
      relatedAtomIds: ["A07"],
      verifierTraceIds: ["vt-1"],
    },
  ],
  solutionComparison: {
    recommendedMethodId: "M1",
    fastestMethodId: "M2",
    reason: "M1 更稳，M2 更快。",
    examTip: "先稳后快。",
  },
  visualExplanation: {
    type: "visual_explanation",
    title: "图上讲解",
    blocks: [
      { kind: "condition_highlight", text: "标出定义域", evidenceIds: ["E1"] },
      {
        kind: "wrong_step_highlight",
        stepId: "S1",
        text: "漏定义域",
        evidenceIds: ["E1"],
      },
      { kind: "correct_path", title: "正确路径", steps: ["写定义域", "求导"] },
    ],
  },
  recommendedNextAction: "repair",
  studentReadableTrace: [
    { title: "读取", status: "completed", message: "完成" },
    { title: "首错", status: "warn", message: "S1" },
    { title: "验证", status: "completed", message: "完成" },
    { title: "下一步", status: "completed", message: "订正" },
  ],
  learnerMemoryDelta: {
    studentId: "student-1",
    atomUpdates: [],
    topicUpdate: {} as any,
    strategyUpdate: {} as any,
    summary: {
      updatedAtoms: ["A07"],
      weakAtoms: [],
      improvingAtoms: ["A07"],
      recommendedPlan: ["定义域变式"],
    },
  } as any,
  remediationPlan: {
    sourceAtoms: ["A07"],
    nextStep: "repair_first_wrong_step",
    items: [
      {
        atomId: "A07",
        atomLabel: "定义域意识弱",
        level: 1,
        title: "定义域变式",
        prompt: "先写定义域。",
        purpose: "修复定义域意识。",
      },
    ],
    masteryImpact: "medium",
  },
  recommendedGeometryLabs: [],
};

const strongReport = buildExperienceQualityReport(strongDiagnosis);
assert.ok(strongReport.overallScore >= 90);
assert.equal(strongReport.level, "world_class_candidate");
assert.ok(strongReport.checks.every((check) => check.status === "pass"));

const weakReport = buildExperienceQualityReport({
  ...strongDiagnosis,
  firstWrongStep: null,
  claimTraces: [],
  verifierTraces: [],
  solutionMethods: [],
  recommendedNextAction: undefined,
  remediationPlan: undefined,
});
assert.ok(weakReport.overallScore < strongReport.overallScore);
assert.ok(["blocked", "needs_review"].includes(weakReport.level));
assert.ok(weakReport.checks.some((check) => check.status === "fail"));

console.log("experience-quality-gate tests passed");
