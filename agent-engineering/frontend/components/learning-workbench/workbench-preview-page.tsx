"use client";

import { useState } from "react";
import type { MathDiagnosisResult } from "@/lib/ai/math-diagnosis-types";
import { AgentInspector } from "./agent-inspector";
import { CorrectionCardPanel } from "./math-diagnosis-panels";
import { LearningWorkbenchSidebar } from "./workbench-sidebar";

export function WorkbenchPreviewPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="flex h-dvh w-full overflow-hidden bg-background">
      <LearningWorkbenchSidebar
        latestDiagnosis={sampleDiagnosis}
        recentDiagnoses={[]}
        workbenchSummary={null}
      />
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-border/60 border-b px-4">
          <div>
            <div className="font-semibold text-sm">
              Math-SEARAG Learning Agent
            </div>
            <div className="text-muted-foreground text-xs">
              预览：DeepSeek GUI 式数学学习工作台
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs md:flex">
            <span className="rounded-md bg-blue-500/10 px-2 py-1 text-blue-700 dark:text-blue-300">
              deepseek/deepseek-v4-flash
            </span>
            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-700 dark:text-emerald-300">
              TypeScript workflow
            </span>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
          <div className="mx-auto grid max-w-4xl gap-4">
            <div className="rounded-lg border border-border/70 bg-card p-4">
              <div className="font-medium text-sm">题目</div>
              <p className="mt-2 text-sm leading-6">
                已知函数 f(x)=x^3-3ax 在区间 [-2,2] 上有最大值，求参数 a
                的讨论范围。
              </p>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-4">
              <div className="font-medium text-sm">学生步骤</div>
              <div className="mt-2 grid gap-2 text-sm leading-6">
                <div className="rounded-md bg-muted/50 px-3 py-2">
                  S1：f'(x)=3x^2-3a，所以令 x^2=a。
                </div>
                <div className="rounded-md bg-red-50 px-3 py-2 text-red-800 dark:bg-red-950/30 dark:text-red-100">
                  S2：所以 a 一定大于 0，答案就是 a&gt;0。
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-card p-4">
              <div className="font-medium text-sm">苏格拉底追问</div>
              <div className="mt-3 rounded-md border border-amber-200/70 bg-amber-50 px-3 py-2 text-amber-900 text-sm leading-6 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
                你先停在 S2：题目含参数时，为什么只说 a&gt;0 还不够？临界点是否一定落在 [-2,2]？
              </div>
            </div>

            <CorrectionCardPanel card={sampleDiagnosis.correctionCard} />
          </div>
        </div>
      </section>
      <AgentInspector
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        result={sampleDiagnosis}
      />
    </main>
  );
}

const sampleDiagnosis: MathDiagnosisResult = {
  jobId: "preview-d03",
  firstWrongStep: "S2",
  firstWrongReason: "学生直接给出 a>0，缺少参数分类、临界点范围和端点比较。",
  confidence: 0.88,
  needHumanReview: false,
  misconceptionAtoms: [
    {
      id: "A18",
      label: "参数分类缺失",
      level: "topic",
      description: "含参题需要按临界点是否进入区间分类讨论。",
    },
    {
      id: "A11",
      label: "跳步结论",
      level: "strategy",
      description: "从局部条件直接跳到最终范围。",
    },
    {
      id: "A07",
      label: "定义域/区间意识",
      level: "foundation",
      description: "没有把结论绑定到题设区间。",
    },
  ],
  evidenceNodes: [
    {
      id: "E1",
      type: "student_step",
      text: "S2：所以 a 一定大于 0，答案就是 a>0。",
      confidence: 0.94,
    },
  ],
  strictChecks: [
    {
      id: "gate-parameter-classification",
      label: "参数分类",
      status: "fail",
      reason: "题目含参，但学生把参数当成单一定值处理。",
    },
    {
      id: "gate-conclusion-scope",
      label: "结论范围",
      status: "fail",
      reason: "最终结论没有绑定临界点进入区间的条件。",
    },
  ],
  socraticQuestions: [
    "S2 中的 a>0 是否已经保证临界点落在 [-2,2]？",
    "如果 a=9，x^2=a 的临界点还在区间内吗？",
    "端点值和驻点值分别应该在什么条件下比较？",
  ],
  policyDecision: {
    mode: "first_wrong_step",
    allowedContent: {
      canShowFinalAnswer: false,
      canShowFullSolution: false,
      canShowFirstWrongStep: true,
      canShowHint: true,
      canAskQuestion: true,
    },
    nextPrompts: [
      "你先不要看完整答案。请先判断：S2 为什么不能直接成立？",
    ],
    reason: "已有学生步骤，优先定位第一断点并追问。",
  },
  verifierTraces: [
    {
      id: "trace-parameter-classification",
      claim: "含参题需要讨论临界点是否进入区间",
      claimType: "classification",
      verifier: "typescript_strict_gate",
      status: "fail",
      evidenceIds: ["E1"],
      failureReason: "未发现分类讨论、范围讨论或端点比较。",
      confidence: 0.9,
    },
    {
      id: "trace-python",
      claim: "Python verifier 当前未参与预览",
      claimType: "proof_step",
      verifier: "not_checked",
      status: "not_checked",
      evidenceIds: ["E1"],
      confidence: 0.5,
    },
  ],
  learnerMemoryDelta: {
    studentId: "preview-student",
    atomUpdates: [
      {
        atomId: "A18",
        label: "参数分类缺失",
        exposureCount: 3,
        errorCount: 2,
        recurrenceRate30d: 0.67,
        recurrenceRateLast10: 0.6,
        transferRate: 0.25,
        selfRepairRate: 0.2,
        lastWrongProblemIds: ["preview-d03"],
        lastSuccessfulVariantIds: [],
        mastery: "weak",
      },
    ],
    topicUpdate: {
      topicId: "derivative",
      problemCount: 8,
      correctCount: 4,
      commonAtoms: ["A18", "A11"],
      currentLevel: "standard",
    },
    strategyUpdate: {
      tendsToSkipDomainCheck: true,
      tendsToAvoidClassification: true,
      tendsToUseAnswerFirstReasoning: true,
      tendsToIgnoreEndpointComparison: false,
      tendsToMisreadGeometricConstraints: false,
      tendsToUseFormulaWithoutCondition: true,
      notes: ["预览样例：含参题跳步到答案。"],
    },
    summary: {
      updatedAtoms: ["A18"],
      weakAtoms: ["A18"],
      improvingAtoms: [],
      recommendedPlan: ["先完成 A18 的 1 级和 3 级变式。"],
    },
  },
  remediationPlan: {
    sourceAtoms: ["A18", "A11"],
    nextStep: "practice_variants",
    items: [
      {
        atomId: "A18",
        atomLabel: "参数分类缺失",
        level: 1,
        title: "表层变式：临界点范围",
        prompt: "换一个三次函数，先判断临界点是否进入区间。",
        purpose: "让学生先形成分类边界意识。",
      },
      {
        atomId: "A18",
        atomLabel: "参数分类缺失",
        level: 3,
        title: "迁移变式：参数与端点比较",
        prompt: "在不同区间上比较端点值和驻点值。",
        purpose: "训练把最终结论绑定到参数范围。",
      },
    ],
    masteryImpact: "medium",
  },
  thinkingGraph: {
    type: "math_thinking_graph",
    title: "预览思维图谱",
    nodes: [
      { id: "P", label: "题目", kind: "problem", status: "neutral" },
      { id: "S2", label: "S2 跳步结论", kind: "step", status: "fail" },
      { id: "A18", label: "A18 参数分类", kind: "atom", status: "fail" },
    ],
    edges: [{ from: "S2", to: "A18", kind: "causes", label: "触发" }],
  },
  correctionCard: {
    type: "html_card",
    title: "订正卡：含参题先找分类边界",
    blocks: [
      {
        kind: "problem",
        text: "含参函数最值题不能只从 f'(x)=0 得到 a>0，还要检查临界点是否在题设区间内。",
      },
      {
        kind: "wrong_step",
        stepId: "S2",
        text: "S2 的问题是把“存在临界点”直接当成了“最终答案”。",
        evidenceIds: ["E1"],
      },
      {
        kind: "socratic_question",
        text: "如果临界点不在 [-2,2]，最大值还会由驻点决定吗？",
      },
      {
        kind: "correction_step",
        text: "先写出分类边界，再分别比较端点和驻点。",
        latex: "x^2=a, x\\in[-2,2] \\Rightarrow 0\\le a\\le 4",
        evidenceIds: ["E1"],
      },
      {
        kind: "variant",
        title: "同因变式",
        text: "把区间换成 [-1,3]，重新判断临界点进入区间的参数范围。",
      },
    ],
  },
  recommendedGeometryLabs: [
    {
      levelId: "G2-2",
      title: "三棱锥二面角",
      reason: "如果出现 A34，可进入立体几何转换训练。",
      targetAtoms: ["A34"],
      sceneSpecId: "scene_g2_2",
    },
  ],
  variants: [
    {
      title: "参数分类变式",
      tag: "A18",
      text: "把区间换成 [-1,3]，重新判断临界点进入区间的参数范围。",
    },
  ],
};
