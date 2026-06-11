import type {
  ClaimTrace,
  LayeredVerifierReport,
  MathDiagnosisRequest,
  MathDiagnosisResult,
  VerifierTierReport,
} from "./math-diagnosis-types";
import type { VerifierTrace } from "./verifier-trace-types";

type LayeredVerifierInput = {
  request: Pick<MathDiagnosisRequest, "problemText" | "studentSteps">;
  diagnosis: Pick<
    MathDiagnosisResult,
    "strictChecks" | "misconceptionAtoms" | "firstWrongStep"
  >;
  claimTraces: ClaimTrace[];
  pythonVerifier?: Record<string, any> | null;
};

export function buildLayeredVerifierReport({
  request,
  diagnosis,
  claimTraces,
  pythonVerifier,
}: LayeredVerifierInput): LayeredVerifierReport {
  const lightTier = buildLightTier({ diagnosis, claimTraces, pythonVerifier });
  const domainTier = buildDomainTier({ request, diagnosis, claimTraces });
  const formalTier = buildFormalTier({ request, diagnosis, claimTraces });
  const tiers = [lightTier, domainTier, formalTier];

  return {
    source: "layered_verifier_engine",
    overallStatus: summarizeTierStatus(tiers),
    tiers,
    formalReviewPlan: {
      shouldRun: formalTier.checks.some((check) => check.status === "warn"),
      adapter: "lean4",
      reason:
        formalTier.checks.length > 0
          ? "存在适合形式化复核的等价变形、归纳、恒成立或几何关系 claim。"
          : "当前题目暂不需要 Lean 级形式化复核。",
      candidateClaims: formalTier.checks.map((check) => check.claim),
      auxiliaryLemmaHints: buildAuxiliaryLemmaHints(request, claimTraces),
      knowledgeRetrievalHints: buildKnowledgeRetrievalHints(request, diagnosis),
    },
    knowledgeEvolution: {
      source: "leanagent_inspired",
      reusableLemmaHints: buildAuxiliaryLemmaHints(request, claimTraces),
      curriculumTags: inferCurriculumTags(request, diagnosis),
      retrievalHints: buildKnowledgeRetrievalHints(request, diagnosis),
    },
    notes: [
      "轻量层负责 SymPy、数值采样和几何向量计算。",
      "中量层负责高中数学 domain verifier：参数、圆锥曲线、数列、三角、概率和几何证明。",
      "重量层只生成 Lean 4/formal verifier 候选，不在主链路中强制运行。",
    ],
  };
}

export function buildLayeredVerifierTraces(
  report: LayeredVerifierReport
): VerifierTrace[] {
  return report.tiers.flatMap((tier) =>
    tier.checks.slice(0, 4).map((check, index) => ({
      id: `VT-LAYER-${tier.tier.toUpperCase()}-${index + 1}`,
      claim: check.claim,
      claimType: inferTraceClaimType(check.claim),
      verifier:
        tier.tier === "domain"
          ? "high_school_domain_verifier"
          : tier.tier === "formal"
            ? "lean_formal_adapter"
            : check.claim.includes("数值") || check.claim.includes("采样")
              ? "numeric_sampling"
              : "sympy",
      status: check.status,
      evidenceIds: check.evidenceIds,
      failureReason: check.status === "pass" ? undefined : check.reason,
      confidence: check.confidence,
    }))
  );
}

function buildLightTier({
  diagnosis,
  claimTraces,
  pythonVerifier,
}: Pick<LayeredVerifierInput, "diagnosis" | "claimTraces" | "pythonVerifier">): VerifierTierReport {
  const checks = [
    {
      id: "L1",
      claim: "SymPy verifier / algebraic expression checks",
      status: pythonVerifier?.verification?.passed
        ? "pass"
        : pythonVerifier
          ? "warn"
          : "not_checked",
      confidence: pythonVerifier?.verification?.passed ? 0.86 : 0.38,
      evidenceIds: ["V1"],
      reason: pythonVerifier
        ? String(pythonVerifier.verification?.message ?? "Python verifier returned partial evidence.")
        : "Python/SymPy verifier is optional and was not available.",
    },
    {
      id: "L2",
      claim: "Numeric sampling for equality, inequality, and boundary sanity checks",
      status: diagnosis.strictChecks.some((check) => check.status === "fail")
        ? "warn"
        : "pass",
      confidence: 0.62,
      evidenceIds: diagnosis.strictChecks.slice(0, 3).map((check) => check.id),
      reason: "数值采样适合快速发现反例，但不能替代完整证明。",
    },
    {
      id: "L3",
      claim: "Geometry vector constraints for projection, angle, and plane relations",
      status: claimTraces.some((claim) =>
        claim.claimType.includes("geometry")
      )
        ? "warn"
        : "not_checked",
      confidence: 0.55,
      evidenceIds: claimTraces
        .filter((claim) => claim.claimType.includes("geometry"))
        .map((claim) => claim.id),
      reason: "几何向量检查可验证投影、垂直和平面关系，复杂证明仍需 domain/formal 层。",
    },
  ] satisfies VerifierTierReport["checks"];

  return {
    tier: "light",
    verifier: "sympy_numeric_geometry",
    status: summarizeCheckStatus(checks),
    checks,
    summary: "轻量 verifier 提供快速可计算证据，不直接承担完整证明。",
  };
}

function buildDomainTier({
  request,
  diagnosis,
  claimTraces,
}: Pick<LayeredVerifierInput, "request" | "diagnosis" | "claimTraces">): VerifierTierReport {
  const checks: VerifierTierReport["checks"] = [];
  const text = `${request.problemText}\n${request.studentSteps}`;
  const failed = diagnosis.strictChecks.filter((check) => check.status === "fail");

  const domainRules = [
    {
      id: "D-PARAM",
      pattern: /参数|恒成立|恒大于|恒小于|恒正|恒负|任意|存在|a\s*[<>]|m\s*[<>]/i,
      claim: "参数恒成立需要转成最值、判别式、边界或量词关系。",
    },
    {
      id: "D-CONIC",
      pattern: /椭圆|双曲线|抛物线|焦点|准线|离心率|弦长|圆锥曲线/i,
      claim: "圆锥曲线条件需要转成可验证方程或几何约束。",
    },
    {
      id: "D-SEQUENCE",
      pattern: /数列|递推|归纳|通项|a_n|an\+1|n=1/i,
      claim: "数列递推和归纳需要检查首项、下标范围和闭环。",
    },
    {
      id: "D-TRIG",
      pattern: /sin|cos|tan|三角|恒等|诱导公式/i,
      claim: "三角恒等变形需要检查角范围和等价性。",
    },
    {
      id: "D-PROB",
      pattern: /概率|统计|独立|互斥|条件概率|期望|方差|样本空间/i,
      claim: "概率统计需要先明确样本空间、事件关系和条件。",
    },
    {
      id: "D-GEO",
      pattern: /线面角|二面角|垂直|平行|投影|截面|空间向量|法向量/i,
      claim: "立体几何证明需要检查投影、辅助面和空间到平面的转化。",
    },
  ];

  for (const rule of domainRules) {
    if (!rule.pattern.test(text)) {
      continue;
    }
    const relatedClaims = claimTraces.filter((claim) =>
      rule.pattern.test(`${claim.sentence} ${claim.expression ?? ""}`)
    );
    checks.push({
      id: rule.id,
      claim: rule.claim,
      status:
        relatedClaims.some((claim) => claim.status === "fail") ||
        failed.length > 0
          ? "warn"
          : "pass",
      confidence: relatedClaims.length ? 0.68 : 0.52,
      evidenceIds: relatedClaims.map((claim) => claim.id).slice(0, 4),
      reason:
        relatedClaims.length > 0
          ? "已匹配到学生步骤中的相关 claim，需要 domain verifier 做专题规则复核。"
          : "题干命中专题，但学生步骤没有给出足够可验证 claim。",
    });
  }

  if (checks.length === 0) {
    checks.push({
      id: "D-GENERAL",
      claim: "高中数学通用 domain verifier",
      status: "not_checked",
      confidence: 0,
      evidenceIds: [],
      reason: "当前题目未命中特定专题 verifier。",
    });
  }

  return {
    tier: "domain",
    verifier: "high_school_domain_verifier",
    status: summarizeCheckStatus(checks),
    checks,
    summary: "中量 domain verifier 负责高中专题规则和证明结构复核。",
  };
}

function buildFormalTier({
  request,
  diagnosis,
  claimTraces,
}: Pick<LayeredVerifierInput, "request" | "diagnosis" | "claimTraces">): VerifierTierReport {
  const formalClaims = claimTraces.filter((claim) =>
    [
      "equivalence_transform",
      "trig_identity_transform",
      "sequence_recursion_induction",
      "classification",
      "geometry_relation",
      "geometry_vector_method_mismatch",
    ].includes(claim.claimType)
  );
  const failedChecks = diagnosis.strictChecks.filter(
    (check) => check.status === "fail"
  );
  const checks = formalClaims.slice(0, 5).map((claim, index) => ({
    id: `F${index + 1}`,
    claim: claim.expression ?? claim.sentence,
    status: claim.status === "pass" && failedChecks.length === 0 ? "not_checked" : "warn",
    confidence: 0.42,
    evidenceIds: [claim.id, ...claim.strictCheckIds],
    reason:
      "适合作为 Lean 4/formal adapter 的候选 claim；需要先完成自然语言到形式化命题的安全翻译。",
  })) satisfies VerifierTierReport["checks"];

  if (checks.length === 0 && /证明|恒成立|归纳|等价|二面角|圆锥曲线/.test(request.problemText)) {
    checks.push({
      id: "F0",
      claim: request.problemText,
      status: "warn",
      confidence: 0.36,
      evidenceIds: ["problem"],
      reason: "题干包含证明或高风险等价关系，但学生步骤尚未形成可翻译 claim。",
    });
  }

  return {
    tier: "formal",
    verifier: "lean4_formal_adapter",
    status: checks.length ? "warn" : "not_checked",
    checks,
    summary: "重量 formal verifier 只用于高置信复核，不阻塞普通诊断。",
  };
}

function buildAuxiliaryLemmaHints(
  request: Pick<MathDiagnosisRequest, "problemText" | "studentSteps">,
  claimTraces: ClaimTrace[]
) {
  const text = `${request.problemText}\n${request.studentSteps}`;
  const hints = new Set<string>();
  if (/恒成立|恒大于|恒小于|恒正|恒负|参数|任意|存在/.test(text)) {
    hints.add("把恒成立命题转成最值或边界引理。");
  }
  if (/数列|递推|归纳/.test(text)) {
    hints.add("补充首项、递推步和归纳闭环引理。");
  }
  if (/sin|cos|tan|三角/.test(text)) {
    hints.add("补充角范围和三角恒等变形引理。");
  }
  if (/二面角|线面角|投影|垂直|平行/.test(text)) {
    hints.add("补充投影、垂直平面和二面角截面引理。");
  }
  if (claimTraces.some((claim) => claim.claimType === "equivalence_transform")) {
    hints.add("补充等价变形保持同解的条件引理。");
  }
  return [...hints].slice(0, 5);
}

function buildKnowledgeRetrievalHints(
  request: Pick<MathDiagnosisRequest, "problemText" | "studentSteps">,
  diagnosis: Pick<MathDiagnosisResult, "misconceptionAtoms">
) {
  return [
    ...inferCurriculumTags(request, diagnosis),
    ...diagnosis.misconceptionAtoms.slice(0, 3).map((atom) => atom.label),
  ].filter(Boolean);
}

function inferCurriculumTags(
  request: Pick<MathDiagnosisRequest, "problemText" | "studentSteps">,
  diagnosis: Pick<MathDiagnosisResult, "misconceptionAtoms">
) {
  const text = `${request.problemText}\n${request.studentSteps}`;
  const tags = new Set<string>();
  if (/导数|函数|极值|最值|单调/.test(text)) {
    tags.add("导数与函数");
  }
  if (/参数|恒成立|恒大于|恒小于|恒正|恒负|任意|存在/.test(text)) {
    tags.add("参数与恒成立");
  }
  if (/椭圆|双曲线|抛物线|圆锥曲线/.test(text)) {
    tags.add("圆锥曲线");
  }
  if (/数列|递推|归纳/.test(text)) {
    tags.add("数列与归纳");
  }
  if (/三角|sin|cos|tan/.test(text)) {
    tags.add("三角恒等变形");
  }
  if (/概率|统计/.test(text)) {
    tags.add("概率统计");
  }
  if (/空间|线面角|二面角|正方体|棱锥/.test(text)) {
    tags.add("立体几何");
  }
  for (const atom of diagnosis.misconceptionAtoms) {
    if (atom.id.startsWith("A3")) {
      tags.add("几何错因");
    }
  }
  return [...tags];
}

function summarizeTierStatus(tiers: VerifierTierReport[]) {
  if (tiers.some((tier) => tier.status === "fail")) {
    return "fail";
  }
  if (tiers.some((tier) => tier.status === "warn")) {
    return "warn";
  }
  if (tiers.some((tier) => tier.status === "pass")) {
    return "pass";
  }
  return "not_checked";
}

function summarizeCheckStatus(checks: VerifierTierReport["checks"]) {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }
  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }
  if (checks.some((check) => check.status === "pass")) {
    return "pass";
  }
  return "not_checked";
}

function inferTraceClaimType(text: string): VerifierTrace["claimType"] {
  if (/导数|求导|f'/.test(text)) {
    return "derivative";
  }
  if (/定义域|范围/.test(text)) {
    return "domain";
  }
  if (/恒成立|参数|分类/.test(text)) {
    return "classification";
  }
  if (/单调|最值|极值/.test(text)) {
    return "monotonicity";
  }
  if (/端点|边界/.test(text)) {
    return "endpoint";
  }
  if (/二面角|线面角|几何|投影|垂直|平行/.test(text)) {
    return "geometry_relation";
  }
  if (/等价|恒等|变形/.test(text)) {
    return "equivalence";
  }
  return "proof_step";
}
