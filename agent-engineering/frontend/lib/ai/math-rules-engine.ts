import { createHash } from "node:crypto";
import { recommendGeometryLabs } from "../geometry/geometry-misconception-map";
import type { MathDiagnosisRequest } from "./math-diagnosis-types";

type NormalizedRequest = MathDiagnosisRequest & {
  confirmedEvidence: string[];
  teachingStyle: "socratic";
  visualMode: "html_card";
};
type RawDiagnosis = Record<string, any>;

type Atom = {
  id: string;
  label: string;
  description: string;
};

type RequiredCheck = {
  key: string;
  label: string;
  atomIds: string[];
  required: boolean;
};

type TopicProfile = {
  id: string;
  label: string;
  keywords: string[];
  requiredChecks: RequiredCheck[];
};

type StrictCheck = {
  id: string;
  key: string;
  label: string;
  status: "pass" | "fail" | "warn";
  required: boolean;
  reason: string;
  evidence_ids: string[];
  atom_ids: string[];
  score: number;
};

const ATOMS: Record<string, Atom> = {
  A01: {
    id: "A01",
    label: "审题漏条件",
    description: "没有把题干中的范围、存在性、恒成立、最值对象写入推理链。",
  },
  A02: {
    id: "A02",
    label: "公式记错",
    description: "公式、导数、恒等变形或定理条件使用错误。",
  },
  A03: {
    id: "A03",
    label: "代数变形错误",
    description: "移项、化简、因式分解、符号方向或指数对数运算出错。",
  },
  A07: {
    id: "A07",
    label: "定义域意识弱",
    description: "求解前没有确认变量定义域或表达式合法性。",
  },
  A08: {
    id: "A08",
    label: "分类讨论缺失",
    description: "参数或几何位置改变时，没有分情况讨论。",
  },
  A10: {
    id: "A10",
    label: "单调性判断缺失",
    description: "只求临界点，没有用符号、导数或图像证明单调区间。",
  },
  A11: {
    id: "A11",
    label: "结论范围不完整",
    description: "最终答案没有说明适用条件、等号条件或参数范围。",
  },
  A12: {
    id: "A12",
    label: "推导链断裂",
    description: "从局部结论直接跳到最终结论，中间缺少必要论证。",
  },
  A14: {
    id: "A14",
    label: "端点比较遗漏",
    description: "极值、最值或范围题没有检查边界、端点或无穷远趋势。",
  },
  A18: {
    id: "A18",
    label: "参数分析弱",
    description: "把含参问题当作定参问题处理，忽略参数对结构的影响。",
  },
  A21: {
    id: "A21",
    label: "判别式使用不完整",
    description: "二次方程或不等式中没有说明判别式、开口方向和根的位置。",
  },
  A24: {
    id: "A24",
    label: "数列递推边界遗漏",
    description: "数列问题没有处理首项、下标范围或递推适用条件。",
  },
  A27: {
    id: "A27",
    label: "概率事件拆分错误",
    description: "样本空间、互斥独立、条件概率或期望定义不清。",
  },
  A31: {
    id: "A31",
    label: "几何约束遗漏",
    description: "没有把垂直、平行、夹角、长度关系等空间约束写入推理链。",
  },
  A32: {
    id: "A32",
    label: "投影意识薄弱",
    description: "线面角、点面距和高没有先找投影或垂足。",
  },
  A33: {
    id: "A33",
    label: "辅助平面意识薄弱",
    description: "遇到二面角或空间垂直关系时，不会构造可观察的辅助平面。",
  },
  A34: {
    id: "A34",
    label: "二面角转化薄弱",
    description: "没有把二面角转化为垂直于棱的平面角。",
  },
  A35: {
    id: "A35",
    label: "截面想象薄弱",
    description: "不会用共面、延长、平行等规则生成空间截面。",
  },
  A36: {
    id: "A36",
    label: "球心关系薄弱",
    description: "没有利用球心、半径、切面或外接球的核心约束。",
  },
  A37: {
    id: "A37",
    label: "空间坐标建系薄弱",
    description: "坐标系原点、轴方向和点坐标设置不稳定。",
  },
  A38: {
    id: "A38",
    label: "空间到平面迁移薄弱",
    description: "没有把空间关系转化成平面三角形、向量或坐标问题。",
  },
};

const TOPICS: TopicProfile[] = [
  {
    id: "derivative_function",
    label: "导数与函数综合",
    keywords: ["导数", "函数", "极值", "最值", "单调", "f'", "ln", "切线"],
    requiredChecks: [
      check("domain_usage", "定义域约束", ["A07", "A01"]),
      check("derivative_formula", "求导公式", ["A02"]),
      check("critical_point", "关键点/代入点", ["A03"]),
      check("monotonicity", "单调性证明", ["A10", "A12"]),
      check("endpoint_boundary", "端点/边界趋势", ["A14"]),
      check("parameter_discussion", "参数分类", ["A18", "A08"]),
      check("conclusion_scope", "结论范围", ["A11"]),
    ],
  },
  {
    id: "quadratic_function",
    label: "二次函数与不等式",
    keywords: ["二次函数", "抛物线", "判别式", "Δ", "顶点", "开口", "根", "不等式"],
    requiredChecks: [
      check("condition_extract", "条件提取", ["A01"]),
      check("discriminant_or_vertex", "判别式/顶点", ["A21"]),
      check("parameter_discussion", "参数分类", ["A18", "A08"]),
      check("conclusion_scope", "结论范围", ["A11"]),
    ],
  },
  {
    id: "solid_geometry",
    label: "立体几何",
    keywords: [
      "立体几何",
      "空间",
      "垂直",
      "平行",
      "二面角",
      "体积",
      "棱锥",
      "棱柱",
      "正方体",
      "法向量",
      "线面角",
    ],
    requiredChecks: [
      check("condition_extract", "空间关系", ["A31", "A01"]),
      check("equation_setup", "向量/几何建模", ["A31"]),
      check("projection_setup", "投影/垂足", ["A32", "A38"]),
      check("auxiliary_plane", "辅助平面", ["A33", "A38"]),
      check("dihedral_angle", "二面角转化", ["A34", "A33"]),
      check("section_visualization", "截面想象", ["A35", "A38"]),
      check("conclusion_scope", "结论范围", ["A11"]),
    ],
  },
  {
    id: "general_high_school_math",
    label: "高中数学综合",
    keywords: [],
    requiredChecks: [
      check("condition_extract", "条件提取", ["A01"]),
      check("equation_setup", "建模与推导", ["A12", "A03"]),
      check("boundary_check", "边界检查", ["A14", "A24"]),
      check("conclusion_scope", "结论范围", ["A11"]),
    ],
  },
];

export function runTypeScriptMathDiagnosis(
  input: NormalizedRequest,
  pythonVerifier?: RawDiagnosis | null
): RawDiagnosis {
  const steps = splitStudentSteps(input.studentSteps);
  const joinedSteps = steps.join("\n");
  const topic = classifyTopic(input.problemText, joinedSteps);
  const features = inspectFeatures(input.problemText, joinedSteps);
  const verification = mergePythonVerification(
    verifyClaims(topic.id, features),
    pythonVerifier
  );
  const strictChecks = evaluateStrictChecks(topic, features, verification);
  const alignment = buildAlignment(steps, strictChecks);
  const atoms = buildAtomScores(strictChecks);
  const recommendedGeometryLabs = recommendGeometryLabs(
    atoms.map((atom: any) => atom.id)
  );
  const confidence = computeConfidence(strictChecks, verification);
  const qualityGate = buildQualityGate(strictChecks, confidence);
  const jobId = makeJobId(input.problemText, input.studentSteps);
  const variants = buildVariants(topic, atoms);
  const evidenceNodes = buildEvidenceNodes(topic, strictChecks, verification);
  const studentCoach = buildStudentCoach(
    topic,
    alignment,
    strictChecks,
    atoms,
    variants,
    verification
  );

  return {
    job_id: jobId,
    status: "completed",
    backend_version: pythonVerifier
      ? "ts-core-v0.1+python-verifier"
      : "ts-core-v0.1",
    diagnosis_source: pythonVerifier
      ? "typescript_with_python_verifier"
      : "typescript",
    problem_text: input.problemText,
    topic,
    alignment,
    evidence_nodes: evidenceNodes,
    strict_checks: strictChecks,
    quality_gate: qualityGate,
    atoms,
    recommended_geometry_labs: recommendedGeometryLabs,
    variants,
    confidence,
    need_human_review: qualityGate.need_human_review,
    verification,
    student_coach: studentCoach,
  };
}

function check(key: string, label: string, atomIds: string[]): RequiredCheck {
  return { key, label, atomIds, required: true };
}

function splitStudentSteps(studentSteps: string) {
  return studentSteps
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^\s*(S?\d+[:：]|[（(]?\d+[)）.、])\s*/i, "").trim());
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/＋/g, "+")
    .replace(/－/g, "-")
    .replace(/×/g, "*");
}

function containsAny(text: string, keywords: string[]) {
  const normalized = normalize(text);
  return keywords.some((keyword) => normalized.includes(normalize(keyword)));
}

function classifyTopic(problemText: string, studentSteps: string) {
  const text = `${problemText}\n${studentSteps}`;
  let best = TOPICS[TOPICS.length - 1];
  let bestScore = 0;

  for (const topic of TOPICS) {
    if (topic.id === "general_high_school_math") {
      continue;
    }
    const score = topic.keywords.filter((keyword) =>
      containsAny(text, [keyword])
    ).length;
    if (score > bestScore) {
      best = topic;
      bestScore = score;
    }
  }

  return {
    id: best.id,
    label: best.label,
    score: bestScore,
    required_checks: best.requiredChecks.map((item) => ({
      key: item.key,
      label: item.label,
      atom_ids: item.atomIds,
      required: item.required,
    })),
  };
}

function inspectFeatures(problemText: string, stepsText: string) {
  return {
    problemHasDomain: containsAny(problemText, [
      "定义域",
      "区间",
      "x>0",
      "(0,+∞)",
      "任意x",
    ]),
    problemHasParameter: containsAny(problemText, [
      "参数",
      "取值范围",
      "恒成立",
      "任意",
      "a",
    ]),
    problemAsksDerivativeAtPoint: /f'\s*\(\s*[-\d.]+\s*\)/i.test(
      normalize(problemText)
    ),
    studentUsesDomain: containsAny(stepsText, ["定义域", "x>0", "区间"]),
    studentHasDerivative: containsAny(stepsText, [
      "f'",
      "导数",
      "lnx+1-a",
      "ln(x)+1-a",
      "2x",
    ]),
    studentHasCriticalPoint: containsAny(stepsText, [
      "f'(x)=0",
      "临界点",
      "驻点",
      "代入",
      "f'(1)",
      "x=1",
    ]),
    studentHasMonotonicity: containsAny(stepsText, [
      "单调",
      "递增",
      "递减",
      "f'>0",
      "f'<0",
      "符号",
    ]),
    studentHasEndpoint: containsAny(stepsText, [
      "端点",
      "边界",
      "极限",
      "x->0",
      "x→",
      "+∞",
    ]),
    studentHasParameterDiscussion: containsAny(stepsText, [
      "分类",
      "参数",
      "范围",
      "讨论",
      "当a",
      "分情况",
      "分类边界",
    ]),
    studentHasConclusionScope: containsAny(stepsText, [
      "当",
      "时",
      "范围",
      "所以",
      "因此",
      "综上",
      "答案",
      "取值",
    ]),
    studentHasConditionExtract: containsAny(stepsText, [
      "已知",
      "由题",
      "条件",
      "因为",
      "根据",
      "定义域",
      "范围",
    ]),
    studentHasEquationSetup: containsAny(stepsText, [
      "设",
      "令",
      "方程",
      "表达式",
      "建立",
      "=",
      "Δ",
    ]),
    studentHasBoundaryCheck: containsAny(stepsText, [
      "端点",
      "边界",
      "n=1",
      "首项",
      "下标",
      "等号",
      "极限",
    ]),
    studentDirectJump: containsAny(stepsText, [
      "一定有",
      "直接代入",
      "直接求",
      "所以",
      "答案",
      "直接结束",
      "显然",
      "易得",
    ]),
    derivativeLooksWrong: containsAny(stepsText, ["1/x-a", "lnx-a", "ln(x)-a"]),
    studentHasProjection: containsAny(stepsText, [
      "投影",
      "射影",
      "垂足",
      "高",
      "projection",
      "foot",
    ]),
    studentHasAuxiliaryPlane: containsAny(stepsText, [
      "辅助平面",
      "作平面",
      "截面",
      "过",
      "垂直于棱",
    ]),
    studentHasDihedralAngle: containsAny(stepsText, [
      "平面角",
      "垂直于棱",
      "法向量",
    ]),
    studentHasSectionReasoning: containsAny(stepsText, [
      "截面",
      "共面",
      "延长",
      "交线",
      "平行截",
    ]),
    stepsText,
  };
}

function verifyClaims(topicId: string, features: ReturnType<typeof inspectFeatures>) {
  const checks =
    topicId === "derivative_function"
      ? [
          {
            name: "student_derivative_claim",
            passed: features.studentHasDerivative && !features.derivativeLooksWrong,
          },
          {
            name: "critical_point_or_target_value",
            passed:
              features.studentHasCriticalPoint ||
              features.problemAsksDerivativeAtPoint,
          },
          {
            name: "domain_required",
            passed: !features.problemHasDomain || features.studentUsesDomain,
          },
          {
            name: "monotonicity_required",
            passed:
              features.problemAsksDerivativeAtPoint || features.studentHasMonotonicity,
          },
          {
            name: "endpoint_required",
            passed: !features.problemHasDomain || features.studentHasEndpoint,
          },
          {
            name: "parameter_required",
            passed:
              !features.problemHasParameter || features.studentHasParameterDiscussion,
          },
          {
            name: "conclusion_scope",
            passed:
              features.problemAsksDerivativeAtPoint ||
              (features.studentHasConclusionScope && !features.studentDirectJump),
          },
        ]
      : [
          { name: "condition_extract", passed: features.studentHasConditionExtract },
          { name: "equation_setup", passed: features.studentHasEquationSetup },
          { name: "boundary_check", passed: features.studentHasBoundaryCheck },
          { name: "conclusion_scope", passed: features.studentHasConclusionScope },
        ];

  const passedCount = checks.filter((item) => item.passed).length;
  return {
    engine: "typescript-rules",
    passed: passedCount === checks.length,
    passed_count: passedCount,
    total_count: checks.length,
    checks,
    missing: checks.filter((item) => !item.passed).map((item) => item.name),
    message:
      passedCount === checks.length
        ? "TypeScript 规则门禁通过。"
        : `TypeScript 规则门禁未完全通过：${checks
            .filter((item) => !item.passed)
            .map((item) => item.name)
            .join("、")}。`,
  };
}

function mergePythonVerification(
  localVerification: any,
  pythonResult?: RawDiagnosis | null
) {
  if (!pythonResult?.verification) {
    return localVerification;
  }

  return {
    ...localVerification,
    engine: "typescript-rules+python-verifier",
    python_verifier: {
      engine: pythonResult.verification.engine,
      passed: pythonResult.verification.passed,
      passed_count: pythonResult.verification.passed_count,
      total_count: pythonResult.verification.total_count,
      message: pythonResult.verification.message,
    },
    message: `${localVerification.message} Python 验证器返回：${pythonResult.verification.message}`,
  };
}

function evaluateStrictChecks(
  topic: ReturnType<typeof classifyTopic>,
  features: ReturnType<typeof inspectFeatures>,
  verification: any
): StrictCheck[] {
  return topic.required_checks.map((item: any, index: number) => {
    const [status, reason, score] = evaluateCheckKey(
      item.key,
      features,
      verification
    );
    return {
      id: `Q${index + 1}`,
      key: item.key,
      label: item.label,
      status,
      required: item.required,
      reason,
      evidence_ids: [`Q${index + 1}`, "V1"],
      atom_ids: item.atom_ids,
      score,
    };
  });
}

function evaluateCheckKey(
  key: string,
  features: ReturnType<typeof inspectFeatures>,
  verification: any
): ["pass" | "fail" | "warn", string, number] {
  if (key === "domain_usage") {
    if (!features.problemHasDomain || features.studentUsesDomain) {
      return ["pass", "定义域或变量约束已满足当前题目要求。", 1];
    }
    return ["fail", "题干存在定义域或区间约束，但学生步骤没有先写入推理链。", 0];
  }

  if (key === "derivative_formula") {
    if (findVerificationCheck(verification, "student_derivative_claim")) {
      return ["pass", "学生写出了可检查的求导式。", 1];
    }
    return ["fail", "未能验证学生求导式；导数题不能跳过这一项。", 0];
  }

  if (key === "critical_point") {
    if (
      features.problemAsksDerivativeAtPoint ||
      findVerificationCheck(verification, "critical_point_or_target_value")
    ) {
      return ["pass", "学生处理了关键点、代入点或临界点。", 1];
    }
    return ["fail", "没有处理关键点或临界点，后续结论缺少落点。", 0];
  }

  if (key === "monotonicity") {
    if (features.problemAsksDerivativeAtPoint || features.studentHasMonotonicity) {
      return ["pass", "学生已讨论单调性，或本题不需要完整单调性讨论。", 1];
    }
    return ["fail", "只求临界点不足以证明极值或最值，必须说明单调性变化。", 0];
  }

  if (key === "endpoint_boundary") {
    if (!features.problemHasDomain || features.studentHasEndpoint) {
      return ["pass", "当前题目无明显边界要求，或学生已检查边界。", 1];
    }
    return ["fail", "开区间或无界区间最值题必须检查边界趋势。", 0];
  }

  if (key === "parameter_discussion") {
    if (!features.problemHasParameter || features.studentHasParameterDiscussion) {
      return ["pass", "参数条件已满足当前题目要求。", 1];
    }
    return ["fail", "题目含参，但学生把参数当成定值处理。", 0];
  }

  if (key === "conclusion_scope") {
    if (features.studentDirectJump) {
      return ["fail", "出现跳步结论，缺少适用范围或必要论证。", 0];
    }
    if (features.studentHasConclusionScope || features.problemAsksDerivativeAtPoint) {
      return ["pass", "最终结论包含范围、条件或明确目标值。", 1];
    }
    return ["fail", "最终结论没有绑定条件、范围或等号成立情形。", 0];
  }

  if (key === "condition_extract") {
    if (features.studentHasConditionExtract) {
      return ["pass", "学生显式提取了题干条件。", 1];
    }
    return ["fail", "学生步骤没有显式提取题干条件。", 0];
  }

  if (key === "equation_setup") {
    if (features.studentHasEquationSetup) {
      return ["pass", "学生建立了可检查的方程、表达式或模型。", 1];
    }
    return ["fail", "缺少可检查的方程建模或推导表达式。", 0];
  }

  if (key === "projection_setup") {
    if (features.studentHasProjection) {
      return ["pass", "学生已经尝试寻找投影、垂足或空间高。", 1];
    }
    return [
      "warn",
      "立体几何题建议先确认投影、垂足或高，否则线面角和距离容易断链。",
      0.4,
    ];
  }

  if (key === "auxiliary_plane") {
    if (features.studentHasAuxiliaryPlane) {
      return ["pass", "学生已经尝试构造辅助平面或截面。", 1];
    }
    return [
      "warn",
      "涉及空间角、垂直或二面角时，通常需要辅助平面把关系转成平面图。",
      0.42,
    ];
  }

  if (key === "dihedral_angle") {
    if (!containsAny(features.stepsText, ["二面角"])) {
      return [
        "warn",
        "当前步骤未明显涉及二面角；如果题目包含二面角，需要继续确认。",
        0.55,
      ];
    }
    if (features.studentHasDihedralAngle) {
      return ["pass", "学生完成了平面角、垂直于棱或法向量转化。", 1];
    }
    return [
      "fail",
      "二面角不能直接看空间夹角，需要转化为垂直于棱的平面角。",
      0,
    ];
  }

  if (key === "section_visualization") {
    if (!containsAny(features.stepsText, ["截面"])) {
      return [
        "warn",
        "当前步骤未明显涉及截面；如果题目包含截面，需要继续确认。",
        0.55,
      ];
    }
    if (features.studentHasSectionReasoning) {
      return ["pass", "学生已经使用截面、共面、延长或交线推理。", 1];
    }
    return [
      "fail",
      "截面题需要按共面、延长、平行或交线逐步生成，不能只凭直觉画图。",
      0,
    ];
  }

  if (key === "boundary_check") {
    if (features.studentHasBoundaryCheck) {
      return ["pass", "学生检查了边界或特殊下标。", 1];
    }
    return ["warn", "暂未看到边界检查；若本题无边界要求可忽略。", 0.55];
  }

  if (key === "discriminant_or_vertex") {
    if (containsAny(features.stepsText, ["Δ", "判别式", "顶点", "开口", "对称轴"])) {
      return ["pass", "学生使用了判别式、顶点或二次函数结构。", 1];
    }
    return ["fail", "二次函数问题需要检查判别式、顶点或开口方向。", 0];
  }

  return ["warn", `${key} 暂无专用 TypeScript 规则。`, 0.45];
}

function findVerificationCheck(verification: any, name: string) {
  return verification.checks?.some(
    (item: any) => item.name === name && item.passed
  );
}

function buildAlignment(steps: string[], strictChecks: StrictCheck[]) {
  const failedChecks = strictChecks.filter((item) => item.status === "fail");
  if (failedChecks.length === 0) {
    return steps.slice(0, 3).map((step, index) => ({
      id: `S${index + 1}`,
      status: "matched",
      student: step,
      correct: "该步暂未触发硬错误。",
      evidence: ["V1"],
      note: "可继续进入变式训练或更高难度复核。",
    }));
  }

  const alignmentTarget = locateFirstWrongStep(steps, failedChecks);
  const firstFailed = alignmentTarget.primaryCheck;
  const warningSteps = steps
    .slice(0, 3)
    .map((step, index) => ({
      id: `S${index + 1}`,
      status: "warning",
      student: step,
      correct:
        index === alignmentTarget.index
          ? "该步已经被标记为第一断点，需要优先修正。"
          : "该步需要回到证据链中复核。",
      evidence: index === alignmentTarget.index ? firstFailed.evidence_ids : ["V1"],
      note:
        index === alignmentTarget.index
          ? alignmentTarget.reason
          : "该步位于当前第一断点附近，建议重新写出依据。",
    }))
    .filter((item) => item.id !== `S${alignmentTarget.index + 1}`);

  return [
    {
      id: `S${alignmentTarget.index + 1}`,
      status: "error",
      student: steps[alignmentTarget.index] ?? steps[0],
      correct: `先补齐严格门禁：${firstFailed.label}。`,
      evidence: firstFailed.evidence_ids,
      note: alignmentTarget.reason,
    },
    ...warningSteps,
  ];
}

function locateFirstWrongStep(steps: string[], failedChecks: StrictCheck[]) {
  const scored = steps.map((step, index) => {
    const stepScores = failedChecks.map((check) =>
      scoreStepAgainstFailedCheck(step, index, check)
    );
    const best = stepScores.reduce((current, next) =>
      next.score > current.score ? next : current
    );
    return {
      index,
      score: best.score,
      primaryCheck: best.check,
      reason: best.reason,
    };
  });
  const selected = scored.reduce((current, next) => {
    if (next.score > current.score) {
      return next;
    }
    if (next.score === current.score && next.index < current.index) {
      return next;
    }
    return current;
  });

  if (selected.score > 0) {
    return selected;
  }

  return {
    index: Math.min(1, Math.max(0, steps.length - 1)),
    score: 0,
    primaryCheck: failedChecks[0],
    reason: failedChecks[0].reason,
  };
}

function scoreStepAgainstFailedCheck(
  step: string,
  index: number,
  check: StrictCheck
) {
  const text = normalize(step);
  let score = 0;
  const reasons: string[] = [];

  const add = (value: number, reason: string) => {
    score += value;
    reasons.push(reason);
  };

  if (check.key === "condition_extract") {
    if (index === 0) {
      add(2, "第一步没有先把题干条件写入推理链。");
    }
    if (/(直接|令|设|Δ|判别式|f'|=|<0|>0)/i.test(step)) {
      add(5, "这一步在未列条件时直接进入公式或判别式。");
    }
  }

  if (check.key === "domain_usage") {
    if (/(f'|导数|ln|log|分式|=0|代入)/i.test(step)) {
      add(4, "这一步在使用函数表达式前没有先确认定义域。");
    }
  }

  if (check.key === "derivative_formula") {
    if (/(f'|导数|求导|ln|1\/x)/i.test(step)) {
      add(7, "这一步出现可疑求导式，是公式错误的最早候选。");
    }
    if (/(1\/x-a|lnx-a|ln\(x\)-a)/i.test(text)) {
      add(4, "求导表达式命中已知错误模式。");
    }
  }

  if (check.key === "critical_point") {
    if (/(f'\(x\)=0|临界点|驻点|x=|e\^|代入)/i.test(step)) {
      add(5, "这一步处理关键点但缺少后续验证落点。");
    }
  }

  if (check.key === "monotonicity") {
    if (/(f'\(x\)=0|令\s*f'|临界点|驻点|x=|e\^)/i.test(step)) {
      add(6, "只找到临界点，还没有证明单调性变化。");
    }
    if (/(一定有|直接|所以|答案|最小值|最大值|极小值|极大值)/i.test(step)) {
      add(5, "这一步从局部点直接跳到极值或答案。");
    }
  }

  if (check.key === "endpoint_boundary") {
    if (/(f'\(x\)=0|令\s*f'|临界点|x=|e\^)/i.test(step)) {
      add(4, "找到候选点时还没有检查端点或边界趋势。");
    }
    if (/(直接|所以|答案|最小值|最大值|极值)/i.test(step)) {
      add(5, "这一步在未检查边界时直接下结论。");
    }
  }

  if (check.key === "parameter_discussion") {
    if (/(直接|所以|答案|范围|a>|a<|m=|取值)/i.test(step)) {
      add(5, "这一步在含参结构下直接给结论，缺少分类边界。");
    }
  }

  if (check.key === "conclusion_scope") {
    if (/(直接|所以|答案|结束|一定|显然|易得|最小值|最大值|范围)/i.test(step)) {
      add(6, "这一步是跳步结论，缺少适用范围或等号条件。");
    }
  }

  if (check.key === "discriminant_or_vertex") {
    if (/(Δ|判别式|顶点|开口|对称轴)/i.test(step)) {
      add(6, "这一步使用二次函数结构但没有补齐判别式/顶点门禁。");
    }
  }

  if (check.key === "equation_setup") {
    if (/(直接|看角|夹角|答案|45|pca)/i.test(step)) {
      add(5, "这一步直接读图或读角，没有建立可检查的几何关系。");
    }
    if (/(a1c|ab|连接|连结)/i.test(step)) {
      add(1, "这一步只给出图形连线，还没有形成可验证的几何建模。");
    }
  }

  if (check.key === "projection_setup") {
    if (/(直接|线面角|点面距|高|夹角|投影|垂足|a1c|ab)/i.test(step)) {
      add(6, "这一步涉及线面关系，但没有先确认投影或垂足。");
    }
  }

  if (check.key === "dihedral_angle") {
    if (/(直接|二面角|看角|pca|平面角|垂直于棱)/i.test(step)) {
      add(7, "这一步把二面角直接看成空间角，缺少平面角转化。");
    }
  }

  if (check.key === "auxiliary_plane" || check.key === "section_visualization") {
    if (/(直接|看角|截面|平面|夹角|二面角)/i.test(step)) {
      add(3, "这一步需要辅助面或截面支撑。");
    }
  }

  return {
    score,
    check,
    reason: reasons.length
      ? `${check.reason} step-alignment：${reasons.join(" ")}`
      : check.reason,
  };
}

function buildAtomScores(strictChecks: StrictCheck[]) {
  const counts = new Map<string, number>();
  for (const checkItem of strictChecks) {
    if (checkItem.status === "pass") {
      continue;
    }
    for (const atomId of checkItem.atom_ids) {
      counts.set(
        atomId,
        (counts.get(atomId) ?? 0) + (checkItem.status === "fail" ? 2 : 1)
      );
    }
  }

  return [...counts.entries()]
    .sort((first, second) => second[1] - first[1])
    .slice(0, 8)
    .map(([atomId, count]) => {
      const atom = ATOMS[atomId] ?? {
        id: atomId,
        label: atomId,
        description: "",
      };
      const value = Math.min(92, 48 + count * 14);
      return {
        id: atom.id,
        label: atom.label,
        value,
        level: value >= 70 ? "高风险" : "需关注",
        description: atom.description,
      };
    });
}

function computeConfidence(strictChecks: StrictCheck[], verification: any) {
  const required = strictChecks.filter((item) => item.required);
  const passRatio =
    required.filter((item) => item.status === "pass").length /
    Math.max(1, required.length);
  const verificationRatio =
    Number(verification.passed_count ?? 0) /
    Math.max(1, Number(verification.total_count ?? 1));
  const raw = 0.38 + passRatio * 0.42 + verificationRatio * 0.12;
  const capped = required.some((item) => item.status === "fail")
    ? Math.min(raw, 0.74)
    : raw;
  return Number(Math.max(0.24, Math.min(0.93, capped)).toFixed(2));
}

function buildQualityGate(strictChecks: StrictCheck[], confidence: number) {
  const failed = strictChecks.filter(
    (item) => item.required && item.status === "fail"
  );
  const warning = strictChecks.filter(
    (item) => item.required && item.status === "warn"
  );
  const strictPass = failed.length === 0 && confidence >= 0.78;
  return {
    strict_pass: strictPass,
    need_human_review: failed.length > 0 || confidence < 0.72,
    failed_required: failed.map((item) => item.label),
    warning_required: warning.map((item) => item.label),
    confidence_floor: 0.78,
    confidence,
    message: strictPass
      ? "TypeScript 核心门禁通过，可进入变式训练。"
      : "TypeScript 核心门禁未通过，需要先补齐失败项。",
  };
}

function buildEvidenceNodes(
  topic: any,
  strictChecks: StrictCheck[],
  verification: any
) {
  return [
    {
      id: "C1",
      type: "条件",
      text: `题型识别：${topic.label}。`,
      confidence: 0.86,
    },
    {
      id: "V1",
      type: "验证",
      text: verification.message,
      confidence: verification.python_verifier ? 0.82 : 0.68,
    },
    ...strictChecks.flatMap((item) => [
      {
        id: item.id,
        type: "严格门禁",
        text: `${item.label}：${item.reason}`,
        confidence: item.status === "pass" ? 0.9 : 0.64,
      },
      ...item.atom_ids.map((atomId) => ({
        id: atomId,
        type: "错因原子",
        text: ATOMS[atomId]?.description ?? atomId,
        confidence: item.status === "fail" ? 0.66 : 0.52,
      })),
    ]),
  ];
}

function buildVariants(topic: any, atoms: any[]) {
  const topAtom = atoms[0]?.label ?? "条件提取";
  if (topic.id === "derivative_function") {
    return [
      {
        title: "基础同原子题",
        tag: topAtom,
        text: "已知 f(x)=x^2-2x，写出 f'(x)，并求 f'(1)，每一步说明代入依据。",
      },
      {
        title: "中等综合题",
        tag: "单调性与边界",
        text: "已知 f(x)=xlnx-ax，先写定义域，再讨论极值是否存在。",
      },
      {
        title: "压轴风格题",
        tag: "参数分类",
        text: "设 f(x)=xlnx-ax，若 f(x)>=m 对任意 x>0 成立，求 m 的最大值并讨论 a。",
      },
    ];
  }

  return [
    {
      title: "基础门禁题",
      tag: topAtom,
      text: `围绕“${topic.label}”补写条件提取、建模和结论范围。`,
    },
    {
      title: "中等综合题",
      tag: "边界检查",
      text: "在原题结构上增加一个边界或参数条件，并要求完整说明适用范围。",
    },
    {
      title: "复核挑战题",
      tag: "证据链",
      text: "把每一步推导标注为条件、公式、验证或结论，再给出最终答案。",
    },
  ];
}

function buildStudentCoach(
  topic: any,
  alignment: any[],
  strictChecks: StrictCheck[],
  atoms: any[],
  variants: any[],
  verification: any
) {
  const firstError = alignment.find((item) => item.status === "error");
  const failed = strictChecks.filter((item) => item.status === "fail");
  const correctionTemplate = buildCorrectionTemplate(topic.id, failed);
  return {
    mode: "ts_core",
    headline: firstError
      ? "先修正第一处断点，再做变式训练。"
      : "当前步骤未触发硬错误，可进入复核与变式。",
    topic: topic.label,
    thought_judgement: {
      verdict: firstError ? "思路可继续，但必须先补关键条件。" : "思路基本成立。",
      score: Math.round(
        (strictChecks.filter((item) => item.status === "pass").length /
          Math.max(1, strictChecks.length)) *
          100
      ),
      first_wrong_step: firstError?.id ?? null,
      first_wrong_reason: firstError?.note ?? null,
      failed_requirements: failed.map((item) => item.label),
      verification: verification.message,
    },
    better_approach: correctionTemplate,
    correction_template: correctionTemplate,
    error_causes: atoms.slice(0, 4).map((atom) => ({
      label: atom.label,
      level: atom.level,
      description: atom.description,
    })),
    variants,
  };
}

function buildCorrectionTemplate(topicId: string, failedChecks: StrictCheck[]) {
  const prefix = failedChecks.length
    ? [`本次订正重点：${failedChecks.slice(0, 3).map((item) => item.label).join("、")}。`]
    : [];
  if (topicId === "derivative_function") {
    return [
      ...prefix,
      "1. 先写清题目目标：是求导数值、极值、最值，还是参数范围。",
      "2. 写出可检查的求导式或关键代入式。",
      "3. 如果涉及极值或最值，补单调性、端点和参数范围。",
      "4. 最后用一句话写清结论适用条件。",
    ];
  }
  return [
    ...prefix,
    "1. 列出题干条件和隐含限制。",
    "2. 建立可检查的方程、图形关系或概率事件。",
    "3. 检查边界、特殊值、等号成立条件。",
    "4. 写出带条件的完整结论。",
  ];
}

function makeJobId(problemText: string, studentSteps: string) {
  const digest = createHash("sha256")
    .update(`${problemText}\n${studentSteps}`)
    .digest("hex")
    .slice(0, 10);
  return `diag_${digest}`;
}
