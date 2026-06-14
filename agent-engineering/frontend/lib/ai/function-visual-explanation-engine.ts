import type {
  FunctionVisualExplanationSpec,
  MathDiagnosisResult,
} from "./math-diagnosis-types";

type FunctionVisualInput = {
  problemText: string;
  studentSteps: string;
  diagnosis: Pick<
    MathDiagnosisResult,
    | "firstWrongStep"
    | "misconceptionAtoms"
    | "evidenceNodes"
    | "strictChecks"
    | "claimTraces"
  >;
};

const FORBIDDEN_SPEC_KEYS = new Set(["script", "code", "javascript"]);

export function buildFunctionVisualExplanationSpec({
  problemText,
  studentSteps,
  diagnosis,
}: FunctionVisualInput): FunctionVisualExplanationSpec | undefined {
  const text = `${problemText}\n${studentSteps}`;
  if (!looksLikeFunctionProblem(text, diagnosis)) {
    return undefined;
  }

  const topic = detectFunctionTopic(text, diagnosis);
  const evidenceIds = diagnosis.evidenceNodes.slice(0, 3).map((node) => node.id);
  const firstWrongEvidence = diagnosis.firstWrongStep
    ? [diagnosis.firstWrongStep]
    : evidenceIds;
  const intervals = buildIntervals(text, topic);
  const criticalPoints = buildCriticalPoints(text, topic);
  const atomIds = diagnosis.misconceptionAtoms.map((atom) => atom.id);

  const spec: FunctionVisualExplanationSpec = {
    type: "function_visual_explanation",
    title: functionTopicTitle(topic),
    topic,
    domainHighlights: buildDomainHighlights({
      text,
      problemText,
      studentSteps,
      diagnosis,
      evidenceIds,
    }),
    intervals,
    criticalPoints,
    monotonicityRows: buildMonotonicityRows(intervals, text, topic),
    parameterTransform:
      topic === "parameter_for_all"
        ? buildParameterTransform(text, diagnosis)
        : undefined,
    quadraticShape:
      topic === "quadratic_interval"
        ? buildQuadraticShape(text)
        : undefined,
    riskWarnings: buildRiskWarnings(atomIds, topic, firstWrongEvidence),
  };

  return validateFunctionVisualExplanationSpec(spec) ? spec : undefined;
}

export function validateFunctionVisualExplanationSpec(
  spec: FunctionVisualExplanationSpec
) {
  return !containsForbiddenKey(spec);
}

function looksLikeFunctionProblem(
  text: string,
  diagnosis: FunctionVisualInput["diagnosis"]
) {
  return (
    /f\s*\(|函数|导数|单调|极值|最值|恒成立|参数|二次|抛物线|判别式|定义域|ln|log|sqrt|根号|x\^2|x²/i.test(
      text
    ) ||
    diagnosis.misconceptionAtoms.some((atom) =>
      /定义域|函数|导数|单调|最值|参数|分类|A07|A11|A18/.test(
        `${atom.id} ${atom.label} ${atom.description}`
      )
    )
  );
}

function detectFunctionTopic(
  text: string,
  diagnosis: FunctionVisualInput["diagnosis"]
): FunctionVisualExplanationSpec["topic"] {
  const atomText = diagnosis.misconceptionAtoms
    .map((atom) => `${atom.id} ${atom.label} ${atom.description}`)
    .join("\n");
  const allText = `${text}\n${atomText}`;
  if (/恒成立|任意|对任意/i.test(allText)) {
    return "parameter_for_all";
  }
  if (/二次|抛物线|判别式|顶点|x\^2|x²|\bx\s*\*\*\s*2/i.test(allText)) {
    return "quadratic_interval";
  }
  if (/定义域|ln|log|sqrt|根号|分母|x\s*>\s*0/i.test(allText)) {
    return "derivative_domain";
  }
  if (/参数|取值范围|a\s*[<>≤≥=]/i.test(allText)) {
    return "parameter_for_all";
  }
  if (/导数|f'|f’|单调|极值|最值|增区间|减区间/i.test(allText)) {
    return "monotonicity_extremum";
  }
  return "generic_function";
}

function buildDomainHighlights({
  text,
  problemText,
  studentSteps,
  diagnosis,
  evidenceIds,
}: {
  text: string;
  problemText: string;
  studentSteps: string;
  diagnosis: FunctionVisualInput["diagnosis"];
  evidenceIds: string[];
}) {
  const highlights: FunctionVisualExplanationSpec["domainHighlights"] = [];

  if (/ln|log|x\s*>\s*0|\(0,\s*\+?∞|\(0,\s*\+?\\infty/i.test(text)) {
    highlights.push({
      id: "domain-positive",
      text: "含有 ln/log 或题干给出 (0,+∞) 时，必须先锁定 x>0 的定义域。",
      source: /ln|log/i.test(problemText) ? "problem" : "student_step",
      evidenceIds,
    });
  }

  if (/sqrt|根号|√/i.test(text)) {
    highlights.push({
      id: "domain-radical",
      text: "根号内部必须非负，区间端点不能直接忽略。",
      source: "problem",
      evidenceIds,
    });
  }

  if (/分母|\/\s*\(?[a-z0-9+\-*/^ ]+\)?|不等于|≠/.test(text)) {
    highlights.push({
      id: "domain-denominator",
      text: "分母不能为 0；等价变形前后要保留这一限制。",
      source: "verifier",
      evidenceIds,
    });
  }

  for (const check of diagnosis.strictChecks.filter((item) =>
    /定义域|范围|条件|恒成立|单调|最值/.test(`${item.label} ${item.reason}`)
  )) {
    highlights.push({
      id: `strict-${check.id}`,
      text: `${check.label}: ${check.reason}`,
      source: "verifier",
      evidenceIds: [check.id],
    });
  }

  if (highlights.length === 0) {
    highlights.push({
      id: "function-condition",
      text: "先把题干条件、函数定义域、讨论区间和要求的结论分开标记。",
      source: studentSteps ? "student_step" : "problem",
      evidenceIds,
    });
  }

  return dedupeById(highlights).slice(0, 5);
}

function buildIntervals(
  text: string,
  topic: FunctionVisualExplanationSpec["topic"]
): FunctionVisualExplanationSpec["intervals"] {
  if (/ln|log|x\s*>\s*0|\(0,\s*\+?∞|\(0,\s*\+?\\infty/i.test(text)) {
    return [
      {
        id: "interval-positive-domain",
        label: "(0,+∞)",
        from: "0",
        to: "+∞",
        openLeft: true,
        openRight: true,
        status: "valid",
      },
      {
        id: "interval-excluded-nonpositive",
        label: "(-∞,0]",
        from: "-∞",
        to: "0",
        openLeft: true,
        openRight: false,
        status: "excluded",
      },
    ];
  }

  if (topic === "quadratic_interval") {
    return [
      {
        id: "quadratic-given-interval",
        label: "题设区间",
        from: "left",
        to: "right",
        openLeft: false,
        openRight: false,
        status: "critical",
      },
    ];
  }

  return [
    {
      id: "interval-main",
      label: "主讨论区间",
      from: "-∞",
      to: "+∞",
      openLeft: true,
      openRight: true,
      status: "unknown",
    },
  ];
}

function buildCriticalPoints(
  text: string,
  topic: FunctionVisualExplanationSpec["topic"]
): FunctionVisualExplanationSpec["criticalPoints"] {
  const points: FunctionVisualExplanationSpec["criticalPoints"] = [];
  const equalMatches = text.matchAll(/\bx\s*=\s*([a-zA-Z0-9+\-*/^()\\{}]+|e\^\(?[a-zA-Z0-9+\-*/ ]+\)?)/g);
  let index = 1;
  for (const match of equalMatches) {
    points.push({
      id: `critical-x-${index}`,
      label: `x=${match[1]}`,
      value: match[1],
      role: /f'|导数|极值|单调/.test(text) ? "stationary" : "unknown",
      evidenceIds: [],
    });
    index += 1;
  }

  if (topic === "quadratic_interval") {
    points.push({
      id: "quadratic-vertex",
      label: "顶点横坐标",
      value: "-b/(2a)",
      role: "vertex",
      evidenceIds: [],
    });
  }

  if (/ln|log|sqrt|根号/.test(text)) {
    points.push({
      id: "domain-boundary",
      label: "定义域边界",
      value: "0 或使限制条件取等的点",
      role: "boundary",
      evidenceIds: [],
    });
  }

  return dedupeById(points).slice(0, 5);
}

function buildMonotonicityRows(
  intervals: FunctionVisualExplanationSpec["intervals"],
  text: string,
  topic: FunctionVisualExplanationSpec["topic"]
): FunctionVisualExplanationSpec["monotonicityRows"] {
  if (
    topic !== "derivative_domain" &&
    topic !== "monotonicity_extremum" &&
    topic !== "parameter_for_all"
  ) {
    return [];
  }

  return intervals
    .filter((interval) => interval.status !== "excluded")
    .map((interval) => ({
      intervalId: interval.id,
      derivativeSign: /f'\(x\)\s*>\s*0|导数.*大于\s*0/.test(text)
        ? "+"
        : /f'\(x\)\s*<\s*0|导数.*小于\s*0/.test(text)
          ? "-"
          : "unknown",
      trend: /单调递增|增区间/.test(text)
        ? "increasing"
        : /单调递减|减区间/.test(text)
          ? "decreasing"
          : "unknown",
      reason: "先在合法定义域内看 f'(x) 符号，再判断单调区间和极值点。",
    }));
}

function buildParameterTransform(
  text: string,
  diagnosis: FunctionVisualInput["diagnosis"]
): NonNullable<FunctionVisualExplanationSpec["parameterTransform"]> {
  const failedCheck = diagnosis.strictChecks.find((check) => check.status !== "pass");
  return {
    originalClaim: extractSentence(text, /恒成立|任意|对任意|参数/) ??
      "含参数不等式或函数结论在给定区间恒成立。",
    transformedClaim:
      "把恒成立条件转化为目标函数在合法区间上的最大值/最小值/取值范围问题。",
    parameter: inferParameter(text),
    targetExpression: inferTargetExpression(text),
    extremumType: /最大|上界|≤|小于等于/.test(text)
      ? "max"
      : /最小|下界|≥|大于等于/.test(text)
        ? "min"
        : "range",
    riskWarning:
      failedCheck?.reason ??
      "最快做法通常是参数分离，但最容易漏定义域、端点和等号成立条件。",
  };
}

function buildQuadraticShape(
  text: string
): NonNullable<FunctionVisualExplanationSpec["quadraticShape"]> {
  return {
    expression: extractQuadraticExpression(text),
    axis: "x=-b/(2a)",
    vertex: "(-b/(2a), f(-b/(2a)))",
    discriminant: /判别式|Δ|delta/i.test(text) ? "Δ=b^2-4ac" : undefined,
    opening: /-\s*x\^2|-\s*x²|a\s*<\s*0/.test(text) ? "down" : "unknown",
    intervalRestriction: /区间|闭区间|\[|\]/.test(text)
      ? "比较顶点与区间端点，不能只看全局最值。"
      : undefined,
  };
}

function buildRiskWarnings(
  atomIds: string[],
  topic: FunctionVisualExplanationSpec["topic"],
  firstWrongEvidence: string[]
): FunctionVisualExplanationSpec["riskWarnings"] {
  const warnings: FunctionVisualExplanationSpec["riskWarnings"] = [];
  if (topic === "derivative_domain" || atomIds.includes("A07")) {
    warnings.push({
      atomIds: atomIds.length ? atomIds : ["A07"],
      message: "定义域没有先写清，后面的导数、单调性和最值结论都可能无效。",
    });
  }
  if (topic === "parameter_for_all" || atomIds.includes("A18")) {
    warnings.push({
      atomIds: atomIds.length ? atomIds : ["A18"],
      message: "参数恒成立题要先说明等价转化方向，再检查端点和等号条件。",
    });
  }
  if (topic === "quadratic_interval") {
    warnings.push({
      atomIds: atomIds.length ? atomIds : firstWrongEvidence,
      message: "二次函数区间最值必须比较顶点与端点，不能只套全局顶点。",
    });
  }
  if (warnings.length === 0) {
    warnings.push({
      atomIds: atomIds.length ? atomIds : firstWrongEvidence,
      message: "每一步变形后都要回到题设条件检查是否仍然等价。",
    });
  }
  return warnings.slice(0, 4);
}

function functionTopicTitle(topic: FunctionVisualExplanationSpec["topic"]) {
  const titles: Record<FunctionVisualExplanationSpec["topic"], string> = {
    derivative_domain: "函数图上讲解：定义域与导数链路",
    parameter_for_all: "函数图上讲解：参数恒成立转最值",
    quadratic_interval: "函数图上讲解：二次函数区间最值",
    monotonicity_extremum: "函数图上讲解：单调性与最值",
    generic_function: "函数图上讲解：条件、区间与验证点",
  };
  return titles[topic];
}

function inferParameter(text: string) {
  const match = text.match(/参数\s*([a-zA-Z])|([a-zA-Z])\s*的取值范围/);
  return match?.[1] ?? match?.[2] ?? "a";
}

function inferTargetExpression(text: string) {
  const functionMatch = text.match(/f\s*\(x\)\s*=\s*([^，。;\n]+)/i);
  return functionMatch?.[1]?.trim() ?? "目标函数 g(x)";
}

function extractQuadraticExpression(text: string) {
  const match = text.match(/([+-]?\s*\d*\.?\d*\s*x(?:\^2|²)[^，。;\n]*)/i);
  return match?.[1]?.trim() ?? "ax^2+bx+c";
}

function extractSentence(text: string, pattern: RegExp) {
  return text
    .split(/[。；;\n]/)
    .map((item) => item.trim())
    .find((item) => pattern.test(item));
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function containsForbiddenKey(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsForbiddenKey);
  }
  return Object.entries(value as Record<string, unknown>).some(
    ([key, child]) =>
      FORBIDDEN_SPEC_KEYS.has(key.toLowerCase()) || containsForbiddenKey(child)
  );
}
