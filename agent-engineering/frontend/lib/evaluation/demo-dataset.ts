import type { EvaluationCase } from "./evaluation-types";

export const DEMO_EVALUATION_CASES: EvaluationCase[] = [
  {
    id: "D01",
    topic: "derivative",
    problemText: "已知函数 f(x)=xlnx-ax 在 (0,+∞) 上有极值，求参数 a 的取值范围。",
    studentSteps: "S1: f'(x)=lnx+1-a=0，得到 x=e^(a-1)。\nS2: 所以函数一定有极小值，直接代入求最小值。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A10", "A14", "A18"],
      failedCheckLabels: ["单调性证明", "端点/边界趋势", "参数分类"],
      allowHumanReview: true,
    },
  },
  {
    id: "D02",
    topic: "derivative",
    problemText: "设 f(x)=lnx-a/x，x>0，求 f'(x)。",
    studentSteps: "S1: f'(x)=1/x-a。\nS2: 代入 x=1 得 f'(1)=1-a。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A02"],
      failedCheckLabels: ["求导公式"],
      allowHumanReview: true,
    },
  },
  {
    id: "D03",
    topic: "derivative",
    problemText: "已知 f(x)=x^3-3x，求函数的单调区间。",
    studentSteps: "S1: f'(x)=3x^2-3。\nS2: f'(x)=0 得 x=±1。\nS3: 所以答案是 -1 和 1。",
    expected: {
      firstWrongStep: "S2",
      atomIds: ["A10", "A11"],
      failedCheckLabels: ["单调性证明", "结论范围"],
      allowHumanReview: true,
    },
  },
  {
    id: "D04",
    topic: "derivative",
    problemText: "函数 f(x)=xlnx 在 (0,+∞) 上求最小值。",
    studentSteps: "S1: f'(x)=lnx+1。\nS2: 令 f'(x)=0，x=e^-1。\nS3: 直接说最小值为 -1/e。",
    expected: {
      firstWrongStep: "S2",
      atomIds: ["A10", "A14"],
      failedCheckLabels: ["单调性证明", "端点/边界趋势"],
      allowHumanReview: true,
    },
  },
  {
    id: "D05",
    topic: "derivative",
    problemText: "设 f(x)=xlnx-ax，若 f(x)>=m 对任意 x>0 成立，求 m 的最大值。",
    studentSteps: "S1: f'(x)=lnx+1-a。\nS2: 令 x=e^(a-1)，直接得到 m=f(e^(a-1))。",
    expected: {
      firstWrongStep: "S2",
      atomIds: ["A14", "A18"],
      failedCheckLabels: ["端点/边界趋势", "参数分类"],
      allowHumanReview: true,
    },
  },
  {
    id: "Q01",
    topic: "quadratic",
    problemText: "已知二次函数 y=x^2-2ax+1 恒大于 0，求 a 的范围。",
    studentSteps: "S1: 直接令 Δ<0。\nS2: 4a^2-4<0，所以 -1<a<1。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A01"],
      failedCheckLabels: ["条件提取"],
      allowHumanReview: true,
    },
  },
  {
    id: "Q02",
    topic: "quadratic",
    problemText: "关于 x 的不等式 x^2-2ax+a>0 对任意 x 成立，求 a。",
    studentSteps: "S1: Δ=4a^2-4a。\nS2: 令 Δ<0 得 0<a<1，直接结束。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A01", "A11"],
      failedCheckLabels: ["条件提取", "结论范围"],
      allowHumanReview: true,
    },
  },
  {
    id: "Q03",
    topic: "quadratic",
    problemText: "若抛物线 y=ax^2+2x+1 与 x 轴无交点，求 a 的取值范围。",
    studentSteps: "S1: Δ=4-4a。\nS2: 所以 a>1。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A01", "A18"],
      failedCheckLabels: ["条件提取", "参数分类"],
      allowHumanReview: true,
    },
  },
  {
    id: "G01",
    topic: "solid_geometry",
    problemText: "在正方体 ABCD-A1B1C1D1 中，求 A1C 与底面 ABCD 所成角。",
    studentSteps: "S1: 连接 A1C。\nS2: 直接把 A1C 和 AB 的夹角当成线面角，所以答案是 45 度。",
    expected: {
      firstWrongStep: "S2",
      atomIds: ["A32", "A38"],
      failedCheckLabels: [],
      allowHumanReview: true,
    },
  },
  {
    id: "G02",
    topic: "solid_geometry",
    problemText: "三棱锥 P-ABC 中，PA 垂直底面 ABC，求二面角 P-BC-A。",
    studentSteps: "S1: 直接看角 PCA。\nS2: 因为 PA 垂直底面，所以二面角就是这个角。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A34", "A33"],
      failedCheckLabels: [],
      allowHumanReview: true,
    },
  },
];
