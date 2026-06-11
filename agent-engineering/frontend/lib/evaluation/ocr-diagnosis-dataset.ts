export type OCRDiagnosisCase = {
  id: string;
  topic: "derivative" | "quadratic" | "solid_geometry";
  imageFixtureId: string;
  ocrLines: string[];
  confirmedProblemText: string;
  confirmedStudentSteps: string;
  expected: {
    firstWrongStep: string;
    atomIds: string[];
  };
  notes: string;
};

export const OCR_DIAGNOSIS_CASES: OCRDiagnosisCase[] = [
  {
    id: "OCR-D01",
    topic: "derivative",
    imageFixtureId: "draft-real-sample-placeholder/derivative-lnx-01.jpg",
    ocrLines: [
      "题：设 f(x)=l n x-a/x，x＞0，求 f’(x)",
      "① f’ ( x ) ＝ 1 / x － a",
      "② 代入 x＝1，得到 f’(1)=1-a",
    ],
    confirmedProblemText: "设 f(x)=ln x-a/x，x>0，求 f'(x)。",
    confirmedStudentSteps:
      "S1: f'(x)=1/x-a。\nS2: 代入 x=1 得 f'(1)=1-a。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A48"],
    },
    notes:
      "真实草稿纸样本接入前的 OCR 噪声 fixture：ln x、全角符号、手写撇号和步骤编号均需容错。",
  },
  {
    id: "OCR-Q01",
    topic: "quadratic",
    imageFixtureId: "draft-real-sample-placeholder/quadratic-parameter-01.jpg",
    ocrLines: [
      "已知 y=x²-2ax+1 恒大于 0, 求 a 范围",
      "1 直接令 △＜0",
      "2 4a²-4＜0，所以 -1＜a＜1",
    ],
    confirmedProblemText: "已知二次函数 y=x^2-2ax+1 恒大于 0，求 a 的范围。",
    confirmedStudentSteps: "S1: 直接令 Δ<0。\nS2: 4a^2-4<0，所以 -1<a<1。",
    expected: {
      firstWrongStep: "S1",
      atomIds: ["A18", "A49"],
    },
    notes:
      "参数恒成立题的草稿 OCR 常把 Δ、全角不等号和步骤编号识别不稳定。",
  },
  {
    id: "OCR-G01",
    topic: "solid_geometry",
    imageFixtureId: "draft-real-sample-placeholder/cube-line-plane-angle-01.jpg",
    ocrLines: [
      "正方体 ABCD-A1B1C1D1 求 A1C 与底面 ABCD 所成角",
      "S1 连 A1C",
      "S2 把 A1C 和 AB 的夹角当线面角，所以 45°",
    ],
    confirmedProblemText:
      "在正方体 ABCD-A1B1C1D1 中，求 A1C 与底面 ABCD 所成角。",
    confirmedStudentSteps:
      "S1: 连接 A1C。\nS2: 直接把 A1C 和 AB 的夹角当成线面角，所以答案是 45 度。",
    expected: {
      firstWrongStep: "S2",
      atomIds: ["A47"],
    },
    notes:
      "几何草稿识别要能保留关键线段、面名和角的对象，避免把普通夹角误当线面角。",
  },
];
