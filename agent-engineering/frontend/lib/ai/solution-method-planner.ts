import type {
  LearnerMemoryGuidance,
  MathDiagnosisResult,
  MathSolutionComparison,
  MathSolutionMethod,
} from "./math-diagnosis-types";
import type { VerifierTrace } from "./verifier-trace-types";

type SolutionMethodPlannerInput = {
  problemText: string;
  studentSteps: string;
  topic?: {
    id?: string;
    label?: string;
  };
  strictChecks: MathDiagnosisResult["strictChecks"];
  misconceptionAtoms: MathDiagnosisResult["misconceptionAtoms"];
  verifierTraces: VerifierTrace[];
  learnerMemoryGuidance?: LearnerMemoryGuidance;
  needHumanReview?: boolean;
};

export type SolutionMethodPlan = {
  solutionMethods: MathSolutionMethod[];
  solutionComparison: MathSolutionComparison;
};

export function buildSolutionMethodPlan({
  problemText,
  studentSteps,
  topic,
  strictChecks,
  misconceptionAtoms,
  verifierTraces,
  learnerMemoryGuidance,
  needHumanReview = false,
}: SolutionMethodPlannerInput): SolutionMethodPlan {
  const context = buildPlannerContext({
    problemText,
    studentSteps,
    topic,
    strictChecks,
    misconceptionAtoms,
    verifierTraces,
    learnerMemoryGuidance,
    needHumanReview,
  });
  const methods = normalizeMethods(selectTemplateMethods(context), context);
  const recommended = methods.find((method) => method.isRecommended) ?? methods[0];
  const fastest = methods.find((method) => method.isFastest) ?? fastestByMinutes(methods);

  return {
    solutionMethods: methods.map((method) => ({
      ...method,
      isRecommended: method.id === recommended.id,
      isFastest: method.id === fastest.id,
    })),
    solutionComparison: {
      recommendedMethodId: recommended.id,
      fastestMethodId: fastest.id,
      reason:
        recommended.id === fastest.id
          ? `${recommended.title} 同时兼顾稳定性和速度，适合当前题目的诊断结果。`
          : `${fastest.title} 做题最快，但更容易遗漏 ${context.mainRiskLabel}；因此推荐先用 ${recommended.title} 稳定修正当前错因。`,
      examTip:
        recommended.id === fastest.id
          ? "考场上先写必要条件和验证点，再压缩中间计算。"
          : "平时优先练推荐解法，考试时在确认条件不漏的前提下使用最快解法。",
    },
  };
}

function buildPlannerContext(input: SolutionMethodPlannerInput) {
  const atomIds = input.misconceptionAtoms.map((atom) => atom.id);
  const failedChecks = input.strictChecks.filter(
    (check) => check.status !== "pass"
  );
  const traceIds = input.verifierTraces
    .filter((trace) => trace.status !== "pass")
    .slice(0, 4)
    .map((trace) => trace.id);
  const text = `${input.problemText}\n${input.studentSteps}`;
  const topicId = input.topic?.id ?? inferTopicId(text);
  const mainRiskLabel =
    input.misconceptionAtoms[0]?.label ??
    failedChecks[0]?.label ??
    "关键条件";

  return {
    ...input,
    atomIds,
    failedChecks,
    traceIds,
    topicId,
    mainRiskLabel,
    needHumanReview: input.needHumanReview,
    prefersVisual:
      input.learnerMemoryGuidance?.explanationStyle === "visual_first" ||
      atomIds.some((atomId) => /^A3|A47/.test(atomId)),
  };
}

function selectTemplateMethods(
  context: ReturnType<typeof buildPlannerContext>
): MathSolutionMethod[] {
  if (context.topicId === "derivative_function") {
    return derivativeMethods(context);
  }
  if (context.topicId === "quadratic_function") {
    return quadraticMethods(context);
  }
  if (context.topicId === "solid_geometry") {
    return geometryMethods(context);
  }
  return genericMethods(context);
}

function derivativeMethods(
  context: ReturnType<typeof buildPlannerContext>
): MathSolutionMethod[] {
  return [
    method({
      id: "M1",
      title: "常规导数表法",
      strategyType: "derivative_table",
      isRecommended: true,
      estimatedMinutes: 6,
      difficulty: "standard",
      bestFor: "适合你当前错因：先把定义域、导数、单调性和边界全部锁住。",
      riskWarnings: context.needHumanReview
        ? ["当前诊断置信度需要复核，导数式和定义域要逐行确认。"]
        : [],
      keySteps: [
        "先写定义域和题目目标，明确是求极值、最值还是参数范围。",
        "求导并列出 f'(x)=0 的候选点。",
        "用导数符号表判断单调区间，而不是只代入临界点。",
        "检查端点、开区间边界或无穷远趋势。",
        "写出带条件的最终结论。",
      ],
      verificationFocus: ["定义域是否先写", "求导式是否正确", "单调性与边界是否闭合"],
    }),
    method({
      id: "M2",
      title: "考场关键点速解法",
      strategyType: "exam_shortcut",
      isFastest: true,
      estimatedMinutes: 3,
      difficulty: "easy",
      bestFor: "适合计算结构清楚、题目只问局部导数值或单一极值候选时快速得分。",
      riskWarnings: ["速度最快，但容易漏定义域、端点或参数分类。"],
      keySteps: [
        "快速识别目标：导数值、切线斜率、极值点或参数边界。",
        "直接写关键导数式和候选点。",
        "只保留必要验证：定义域、符号变化、等号条件。",
        "用一句话补结论范围。",
      ],
      verificationFocus: ["是否漏定义域", "是否把临界点误当最值", "结论范围是否完整"],
    }),
    method({
      id: "M3",
      title: "参数转最值法",
      strategyType: "parameter_extremum",
      estimatedMinutes: 8,
      difficulty: "hard",
      bestFor: "适合恒成立、任意、存在性和参数范围题。",
      riskWarnings: ["含参题需要分类边界，不能把参数当常数草草结束。"],
      keySteps: [
        "把恒成立或存在性条件转成函数最值、判别式或范围包含关系。",
        "固定参数后研究函数结构。",
        "找出参数改变时的临界边界。",
        "分情况写出结论并检查等号成立。",
      ],
      verificationFocus: ["量词是否转化正确", "参数分类是否完整", "等号条件是否说明"],
    }),
  ];
}

function quadraticMethods(
  context: ReturnType<typeof buildPlannerContext>
): MathSolutionMethod[] {
  return [
    method({
      id: "M1",
      title: "判别式与根分布法",
      strategyType: "discriminant_vertex",
      isRecommended: true,
      estimatedMinutes: 5,
      difficulty: "standard",
      bestFor: "适合二次函数、不等式恒成立、根的个数和参数范围题。",
      riskWarnings: context.needHumanReview ? ["根的位置和参数范围需要复核。"] : [],
      keySteps: [
        "整理成标准二次式，确认开口方向。",
        "根据题目目标选择判别式、根分布或顶点。",
        "含参时列出分类边界。",
        "检查端点、等号和参数范围。",
      ],
      verificationFocus: ["开口方向", "判别式条件", "根的位置和参数范围"],
    }),
    method({
      id: "M2",
      title: "顶点图像速解法",
      strategyType: "exam_shortcut",
      isFastest: true,
      estimatedMinutes: 3,
      difficulty: "easy",
      bestFor: "适合图像关系明显、只需判断最值或区间符号的题。",
      riskWarnings: ["最快但容易漏端点、定义域和参数边界。"],
      keySteps: [
        "写出对称轴和顶点。",
        "结合开口方向判断最值或区间符号。",
        "补充端点和等号条件。",
      ],
      verificationFocus: ["对称轴是否在目标区间", "端点是否检查", "等号条件是否成立"],
    }),
  ];
}

function geometryMethods(
  context: ReturnType<typeof buildPlannerContext>
): MathSolutionMethod[] {
  return [
    method({
      id: "M1",
      title: "传统几何辅助线法",
      strategyType: "synthetic_geometry",
      isRecommended: !context.prefersVisual,
      estimatedMinutes: 7,
      difficulty: "standard",
      bestFor: "适合训练空间想象：先找投影、垂足、辅助面或截面。",
      riskWarnings: ["辅助线没有证据链时，容易把空间角误看成平面角。"],
      keySteps: [
        "标出题目给定的点、线、面关系。",
        "构造投影、垂足、辅助平面或截面。",
        "把空间角或距离转化为可计算的平面对象。",
        "在平面图中计算并回到原几何对象说明结论。",
      ],
      verificationFocus: ["投影对象", "辅助面是否垂直公共棱", "空间到平面转化是否等价"],
    }),
    method({
      id: "M2",
      title: "空间向量法",
      strategyType: "vector_geometry",
      isFastest: true,
      estimatedMinutes: 4,
      difficulty: "standard",
      bestFor: "适合坐标容易建立、角度或距离可用向量公式直接计算的题。",
      riskWarnings: ["速度最快，但建系方向、法向量和角的定义容易混用。"],
      keySteps: [
        "建立空间直角坐标系并写出关键点坐标。",
        "写出方向向量或平面法向量。",
        "套用线面角、二面角或距离公式。",
        "检查结果对应的是目标角还是其余角。",
      ],
      verificationFocus: ["坐标建系", "法向量方向", "角度定义"],
    }),
    method({
      id: "M3",
      title: "Geometry Lab 可视化法",
      strategyType: "geometry_lab_visual",
      isRecommended: context.prefersVisual,
      estimatedMinutes: 8,
      difficulty: "easy",
      bestFor: "适合你当前几何错因：先在图上确认对象，再写代数或几何证明。",
      riskWarnings: ["可视化帮助理解，但最终答案仍要落到可验证的几何关系。"],
      keySteps: [
        "进入 Geometry Lab，旋转模型确认目标对象。",
        "选择投影、辅助面、截面或关键线段。",
        "根据即时反馈修正误选对象。",
        "把图上对象写成正式证明步骤。",
      ],
      verificationFocus: ["对象选择是否正确", "图上高亮是否对应题目条件", "能否转成文字证明"],
    }),
  ];
}

function genericMethods(
  context: ReturnType<typeof buildPlannerContext>
): MathSolutionMethod[] {
  return [
    method({
      id: "M1",
      title: "条件-建模-验证标准法",
      strategyType: "generic_structured",
      isRecommended: true,
      estimatedMinutes: 6,
      difficulty: "standard",
      bestFor: "适合大多数高中数学题，尤其适合修复条件遗漏和跳步结论。",
      riskWarnings: context.needHumanReview ? ["当前诊断需要复核，先不要压缩步骤。"] : [],
      keySteps: [
        "列出题干条件、隐含范围和目标。",
        "建立方程、函数、图形关系或概率事件。",
        "逐步推导，每个等价变形都说明依据。",
        "检查边界、特殊值和等号条件。",
        "写出完整结论。",
      ],
      verificationFocus: ["条件是否完整", "等价变形是否成立", "结论范围是否完整"],
    }),
    method({
      id: "M2",
      title: "考场压缩法",
      strategyType: "generic_fast",
      isFastest: true,
      estimatedMinutes: 3,
      difficulty: "easy",
      bestFor: "适合题型熟练、计算路线明确时快速完成。",
      riskWarnings: ["最快但容易漏条件、边界和等号成立情形。"],
      keySteps: [
        "只写最关键条件和核心公式。",
        "跳过重复说明，但保留关键验证点。",
        "最后补一句范围或等号条件。",
      ],
      verificationFocus: ["是否保留关键验证点", "是否漏边界", "最终结论是否有条件"],
    }),
  ];
}

function method(
  input: Omit<
    MathSolutionMethod,
    "relatedAtomIds" | "verifierTraceIds" | "isRecommended" | "isFastest"
  > &
    Partial<
      Pick<
        MathSolutionMethod,
        "relatedAtomIds" | "verifierTraceIds" | "isRecommended" | "isFastest"
      >
    >
): MathSolutionMethod {
  return {
    relatedAtomIds: [],
    verifierTraceIds: [],
    isRecommended: false,
    isFastest: false,
    ...input,
  };
}

function normalizeMethods(
  methods: MathSolutionMethod[],
  context: ReturnType<typeof buildPlannerContext>
) {
  const recommended =
    methods.find((item) => item.isRecommended) ??
    methods.find((item) => item.strategyType !== "exam_shortcut") ??
    methods[0];
  const fastest = methods.find((item) => item.isFastest) ?? fastestByMinutes(methods);

  return methods.slice(0, 3).map((item) => {
    const riskWarnings = [
      ...item.riskWarnings,
      ...(context.needHumanReview ? ["本次诊断置信度偏低，完整步骤需要老师或学生二次确认。"] : []),
    ];
    return {
      ...item,
      isRecommended: item.id === recommended.id,
      isFastest: item.id === fastest.id,
      relatedAtomIds: unique([...item.relatedAtomIds, ...context.atomIds.slice(0, 4)]),
      verifierTraceIds: unique([
        ...item.verifierTraceIds,
        ...context.traceIds.slice(0, 3),
      ]),
      riskWarnings: unique(riskWarnings),
      verificationFocus: item.verificationFocus.length
        ? item.verificationFocus
        : ["关键条件", "变形依据", "结论范围"],
    };
  });
}

function fastestByMinutes(methods: MathSolutionMethod[]) {
  return methods.reduce((current, next) =>
    next.estimatedMinutes < current.estimatedMinutes ? next : current
  );
}

function inferTopicId(text: string) {
  if (/导数|函数|极值|最值|单调|f'|ln/i.test(text)) {
    return "derivative_function";
  }
  if (/二次函数|抛物线|判别式|Δ|顶点|开口|根|不等式/.test(text)) {
    return "quadratic_function";
  }
  if (/立体几何|空间|二面角|线面角|正方体|棱锥|法向量|垂直|平行/.test(text)) {
    return "solid_geometry";
  }
  return "general_high_school_math";
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}
