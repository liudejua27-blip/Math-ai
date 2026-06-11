import type {
  ClaimTrace,
  LearnerMemoryGuidance,
  MathDiagnosisRequest,
  MathDiagnosisResult,
  StepAlignmentDetail,
} from "./math-diagnosis-types";
import type { SocraticPolicyDecision } from "./socratic-policy-engine";
import type { LearnerMemoryDelta } from "./learner-memory-types";
import type { RemediationPlan, VariantLevel } from "./remediation-loop-types";
import type { VerifierTrace } from "./verifier-trace-types";

type RawDiagnosis = Record<string, any>;

type AtomDef = {
  id: string;
  label: string;
  level: string;
  description: string;
  keywords: RegExp[];
};

const EXTENDED_ATOMS: AtomDef[] = [
  atom("A40", "函数单调性与最值链条断裂", "topic", "只找到临界点或代入点，没有说明单调区间、端点和最值来源。", [/单调|递增|递减|最值|极值|maximum|minimum|f'\s*[<>]/i]),
  atom("A41", "导数几何意义误用", "topic", "把导数值、切线斜率、法线斜率、割线斜率混用。", [/切线|斜率|法线|导数几何|tangent|slope/i]),
  atom("A42", "参数恒成立转化缺失", "topic", "恒成立、存在性或任意性问题没有转成最值、判别式、分类边界或量词关系。", [/恒成立|任意|存在|对.*成立|parameter|for all/i]),
  atom("A43", "数列递推与归纳边界缺失", "topic", "递推、归纳或通项推导没有处理首项、下标范围和归纳闭环。", [/数列|递推|归纳|通项|a_n|an\+1|n=1/i]),
  atom("A44", "圆锥曲线条件转化薄弱", "topic", "圆锥曲线题没有把焦点、准线、离心率、弦长、切线等条件转成可验证方程。", [/椭圆|双曲线|抛物线|焦点|准线|离心率|弦长|conic/i]),
  atom("A45", "三角恒等变形条件薄弱", "topic", "三角恒等变形没有处理角范围、同角关系、诱导公式和等价性。", [/sin|cos|tan|三角|诱导公式|恒等变形/i]),
  atom("A46", "概率统计读题偏差", "topic", "样本空间、独立互斥、条件概率、期望或统计图表条件读错。", [/概率|统计|样本空间|独立|互斥|条件概率|期望|方差/i]),
  atom("A47", "空间向量与传统几何混用", "topic", "空间向量、法向量、垂直平行和传统几何角度关系之间没有保持同一套定义。", [/空间向量|法向量|坐标|线面角|二面角|垂直|平行/i]),
  atom("A48", "等价变形方向错误", "skill", "变形前后没有保持等价，常见于平方、开方、取倒数、同乘含参量或不等式变号。", [/等价|变形|平方|开方|取倒数|同乘|不等式|⇔|<|>/i]),
  atom("A49", "条件遗漏导致跳步", "strategy", "在未列出定义域、边界、量词、几何约束或等号条件时直接得出结论。", [/直接|所以|显然|易得|答案|结论|therefore|thus/i]),
];

export function buildStepAlignmentDetails({
  request,
  diagnosis,
  rawDiagnosis,
}: {
  request: Pick<MathDiagnosisRequest, "studentSteps">;
  diagnosis: Pick<MathDiagnosisResult, "strictChecks" | "firstWrongStep">;
  rawDiagnosis?: RawDiagnosis;
}): { details: StepAlignmentDetail[]; claims: ClaimTrace[] } {
  const failedChecks = collectFailedChecks(diagnosis, rawDiagnosis);
  const lines = splitSteps(request.studentSteps);
  const details = lines.map((sentence, stepIndex) => {
    const stepId = `S${stepIndex + 1}`;
    const claims = splitClaims(sentence).map((claimText, claimIndex) =>
      buildClaimTrace({
        claimText,
        sentence,
        stepId,
        claimIndex,
        failedChecks,
        firstWrongStep: diagnosis.firstWrongStep,
      })
    );
    const firstFail = claims.find((claim) => claim.status === "fail");
    const status: StepAlignmentDetail["status"] = firstFail
      ? "fail"
      : claims.some((claim) => claim.status === "warn")
        ? "warn"
        : claims.length
          ? "pass"
          : "not_checked";

    return {
      stepId,
      sentence,
      expression: extractExpression(sentence),
      status,
      firstErrorClaimId: firstFail?.id ?? null,
      claims,
    };
  });

  return {
    details,
    claims: details.flatMap((detail) => detail.claims),
  };
}

export function expandMisconceptionAtoms({
  request,
  diagnosis,
  claimTraces,
}: {
  request: Pick<MathDiagnosisRequest, "problemText" | "studentSteps">;
  diagnosis: Pick<MathDiagnosisResult, "misconceptionAtoms" | "strictChecks">;
  claimTraces: ClaimTrace[];
}): MathDiagnosisResult["misconceptionAtoms"] {
  const existing = new Map(
    diagnosis.misconceptionAtoms.map((atomItem) => [atomItem.id, atomItem])
  );
  const text = normalizeOCRMathText(`${request.problemText}\n${request.studentSteps}`);
  const failedAtomIds = new Set(
    claimTraces
      .filter((claim) => claim.status !== "pass")
      .flatMap((claim) => claim.atomIds)
  );

  for (const atomDef of EXTENDED_ATOMS) {
    const hitByKeyword = atomDef.keywords.some((pattern) => pattern.test(text));
    const hitByClaim = failedAtomIds.has(atomDef.id);
    if ((hitByKeyword || hitByClaim) && !existing.has(atomDef.id)) {
      existing.set(atomDef.id, {
        id: atomDef.id,
        label: atomDef.label,
        level: atomDef.level,
        description: atomDef.description,
      });
    }
  }

  return [...existing.values()].slice(0, 12);
}

export function buildClaimVerifierTraces(
  claimTraces: ClaimTrace[]
): VerifierTrace[] {
  return claimTraces
    .filter((claim) => claim.status !== "pass")
    .slice(0, 8)
    .map((claim, index) => ({
      id: `VT-CLAIM-${index + 1}`,
      claim: `${claim.stepId}: ${claim.sentence}`,
      claimType: toVerifierClaimType(claim.claimType),
      verifier: "typescript_strict_gate",
      status: claim.status,
      evidenceIds: [claim.id, ...claim.strictCheckIds],
      failureReason: claim.reason,
      confidence: claim.confidence,
    }));
}

export function buildLearnerMemoryGuidance({
  learnerMemoryDelta,
  atoms,
}: {
  learnerMemoryDelta?: LearnerMemoryDelta;
  atoms: MathDiagnosisResult["misconceptionAtoms"];
}): LearnerMemoryGuidance | undefined {
  if (!learnerMemoryDelta) {
    return;
  }

  const atomUpdates = learnerMemoryDelta.atomUpdates;
  const weakest =
    atomUpdates.find((item) => item.mastery === "weak") ??
    atomUpdates.find((item) => item.mastery === "unstable") ??
    atomUpdates[0];

  if (!weakest) {
    return {
      nextProblemRecommendation: "进入同因变式迁移题，验证本题订正是否真正掌握。",
      questionDifficulty: "transfer",
      explanationStyle: "variant_first",
      variantLevel: 3,
      canShowFullSolution: false,
      shouldTriggerReviewPlan: false,
      targetAtoms: atoms.slice(0, 2).map((atom) => atom.id),
      reason: "本次没有明显弱错因，适合用迁移变式做验证。",
    };
  }

  const highRecurrence = weakest.recurrenceRate30d >= 0.6;
  const lowTransfer = weakest.transferRate < 0.4;
  const targetAtoms = [
    weakest.atomId,
    ...atomUpdates
      .filter((item) => item.atomId !== weakest.atomId && item.mastery !== "stable")
      .map((item) => item.atomId),
  ].slice(0, 3);
  const isWeak = weakest.mastery === "weak";

  return {
    nextProblemRecommendation: `下一题优先练 ${weakest.label} 的同因变式。`,
    questionDifficulty: isWeak || (highRecurrence && lowTransfer) ? "micro" : "standard",
    explanationStyle: hasGeometryAtom(targetAtoms)
      ? "visual_first"
      : isWeak || highRecurrence
        ? "micro_scaffold"
        : "socratic_standard",
    variantLevel: chooseVariantLevel(weakest),
    canShowFullSolution: !(isWeak || (highRecurrence && lowTransfer)),
    shouldTriggerReviewPlan: isWeak || highRecurrence || lowTransfer,
    targetAtoms,
    reason: highRecurrence
      ? "该错因复发率较高，先降低追问粒度并触发复习计划。"
      : "画像显示该错因仍未稳定，下一步用同因变式巩固。",
  };
}

export function applyLearnerMemoryToPolicy({
  policy,
  guidance,
}: {
  policy: SocraticPolicyDecision;
  guidance?: LearnerMemoryGuidance;
}): SocraticPolicyDecision {
  if (!guidance) {
    return policy;
  }

  return {
    ...policy,
    allowedContent: {
      ...policy.allowedContent,
      canShowFullSolution:
        policy.allowedContent.canShowFullSolution && guidance.canShowFullSolution,
      canShowFinalAnswer:
        policy.allowedContent.canShowFinalAnswer && guidance.canShowFullSolution,
    },
    nextPrompts:
      guidance.questionDifficulty === "micro"
        ? [
            "先只回答一个小问题：这一步使用了题目里的哪一个条件？",
            ...policy.nextPrompts.slice(0, 2),
          ]
        : policy.nextPrompts,
    reason: `${policy.reason} LearnerMemory：${guidance.reason}`,
    targetAtoms: guidance.targetAtoms.length
      ? guidance.targetAtoms
      : policy.targetAtoms,
    recommendedAction: guidance.shouldTriggerReviewPlan
      ? "trigger_review_plan"
      : policy.recommendedAction,
    memoryGuidance: guidance,
  };
}

export function applyLearnerMemoryToRemediationPlan({
  plan,
  guidance,
}: {
  plan: RemediationPlan;
  guidance?: LearnerMemoryGuidance;
}): RemediationPlan {
  if (!guidance) {
    return plan;
  }

  const targetSet = new Set(guidance.targetAtoms);
  const prioritized = plan.items
    .map((item) => ({
      ...item,
      level: chooseBoundedLevel(item.level, guidance.variantLevel),
    }))
    .sort((first, second) => {
      const firstHit = targetSet.has(first.atomId) ? 1 : 0;
      const secondHit = targetSet.has(second.atomId) ? 1 : 0;
      return secondHit - firstHit || first.level - second.level;
    });

  return {
    ...plan,
    nextStep: guidance.explanationStyle === "visual_first" ? "geometry_lab" : plan.nextStep,
    items: prioritized.slice(0, 6),
    masteryImpact: guidance.variantLevel >= 3 ? "high" : plan.masteryImpact,
  };
}

function buildClaimTrace({
  claimText,
  sentence,
  stepId,
  claimIndex,
  failedChecks,
  firstWrongStep,
}: {
  claimText: string;
  sentence: string;
  stepId: string;
  claimIndex: number;
  failedChecks: Array<{ id: string; key: string; label: string; reason: string }>;
  firstWrongStep: string | null | undefined;
}): ClaimTrace {
  const normalizedClaimText = normalizeOCRMathText(claimText);
  const claimType = classifyClaim(normalizedClaimText);
  const atomIds = inferAtomIds(normalizedClaimText, claimType);
  const matchedChecks = failedChecks.filter((check) =>
    claimMatchesCheck(normalizedClaimText, claimType, check)
  );
  const isFirstWrongStep = !firstWrongStep || firstWrongStep === stepId;
  const status = matchedChecks.length && isFirstWrongStep ? "fail" : "pass";

  return {
    id: `${stepId}-C${claimIndex + 1}`,
    stepId,
    sentence,
    expression: extractExpression(normalizedClaimText),
    claimType,
    status,
    atomIds,
    strictCheckIds: matchedChecks.map((check) => check.id),
    reason:
      status === "fail"
        ? `该 claim 命中 ${matchedChecks.map((check) => check.label).join("、")}：${matchedChecks[0]?.reason ?? "需要复核"}`
        : "该 claim 暂未命中失败门禁。",
    confidence: status === "fail" ? 0.72 : 0.64,
  };
}

function collectFailedChecks(
  diagnosis: Pick<MathDiagnosisResult, "strictChecks">,
  rawDiagnosis?: RawDiagnosis
) {
  const rawChecks = Array.isArray(rawDiagnosis?.strict_checks)
    ? rawDiagnosis?.strict_checks
    : [];
  return diagnosis.strictChecks
    .map((check, index) => {
      const raw = rawChecks[index] ?? {};
      return {
        id: check.id || String(raw.id ?? `Q${index + 1}`),
        key: String(raw.key ?? ""),
        label: check.label || String(raw.label ?? ""),
        reason: check.reason || String(raw.reason ?? ""),
        status: check.status,
      };
    })
    .filter((check) => check.status === "fail")
    .map(({ status: _status, ...check }) => check);
}

export function normalizeOCRMathText(text: string) {
  return text
    .replace(/[’‘`]/g, "'")
    .replace(/[−－–—]/g, "-")
    .replace(/[×＊]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/[，]/g, ",")
    .replace(/[；]/g, ";")
    .replace(/[：]/g, ":")
    .replace(/[（]/g, "(")
    .replace(/[）]/g, ")")
    .replace(/[＜]/g, "<")
    .replace(/[＞]/g, ">")
    .replace(/[＝]/g, "=")
    .replace(/[⇒→]/g, "=>")
    .replace(/[⇔]/g, "<=>")
    .replace(/\b[I1l]\s*n\s*x\b/gi, "lnx")
    .replace(/\bln\s+([a-z0-9(])/gi, "ln$1")
    .replace(/\be\s*\^\s*\(([^)]+)\)/gi, "e^{$1}")
    .replace(/f\s*[′']/g, "f'")
    .replace(/\s*([=<>+\-*/^])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSteps(studentSteps = "") {
  return studentSteps
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) =>
      normalizeOCRMathText(line.replace(/^\s*S?\d+[:：.)、]?\s*/i, "").trim())
    );
}

function splitClaims(step: string) {
  const parts = normalizeOCRMathText(step)
    .split(/[;；。]/)
    .flatMap((part) => part.split(/(?<=，|,)(?=.*(?:所以|因此|得到|=>|⇒|=|<|>))/))
    .map((part) => part.replace(/[，,]\s*$/, "").trim())
    .filter(Boolean);

  return parts.length ? parts : [step];
}

function extractExpression(text: string) {
  const normalized = normalizeOCRMathText(text);
  const match =
    normalized.match(/(?:f'\([^)]*\)|[a-zA-Z]\w*(?:_\w+)?\s*[=<>]\s*[^，,;；。]+)/) ??
    normalized.match(/(?:sin|cos|tan|ln|log)\s*[^，,;；。]+/i);
  return match?.[0]?.trim() ?? null;
}

function classifyClaim(text: string): ClaimTrace["claimType"] {
  const normalized = normalizeOCRMathText(text);
  if (/定义域|domain|x\s*[<>]|ln|log|分母/.test(normalized)) {
    return "domain";
  }
  if (/分类|参数|恒成立|任意|存在|a\s*[<>]|m\s*[<>]/i.test(normalized)) {
    return "classification";
  }
  if (/单调|最值|极值|递增|递减|f'\s*[<>]/i.test(normalized)) {
    return "monotonicity_extremum";
  }
  if (/切线|斜率|法线|tangent|slope/i.test(normalized)) {
    return "derivative_geometric_meaning";
  }
  if (/数列|递推|归纳|通项|a_n|an\+1|n=1/i.test(normalized)) {
    return "sequence_recursion_induction";
  }
  if (/椭圆|双曲线|抛物线|焦点|准线|离心率|弦长/i.test(normalized)) {
    return "conic_condition_transform";
  }
  if (/sin|cos|tan|三角|恒等/i.test(normalized)) {
    return "trig_identity_transform";
  }
  if (/概率|统计|独立|互斥|期望|方差|样本空间/i.test(normalized)) {
    return "probability_reading";
  }
  if (/空间向量|法向量|线面角|二面角|垂直|平行/i.test(normalized)) {
    return "geometry_vector_method_mismatch";
  }
  if (/等价|平方|开方|同乘|取倒数|=>|⇒|⇔|=|<|>/i.test(normalized)) {
    return "equivalence_transform";
  }
  if (/直接|所以|显然|易得|答案|结论/.test(normalized)) {
    return "condition_omission";
  }
  return "proof_step";
}

function inferAtomIds(
  text: string,
  claimType: ClaimTrace["claimType"]
): string[] {
  const atomIds = new Set<string>();
  for (const atomDef of EXTENDED_ATOMS) {
    if (atomDef.keywords.some((pattern) => pattern.test(text))) {
      atomIds.add(atomDef.id);
    }
  }

  const fallback: Partial<Record<ClaimTrace["claimType"], string>> = {
    equivalence_transform: "A48",
    condition_omission: "A49",
    domain: "A07",
    classification: "A18",
    monotonicity_extremum: "A40",
    derivative_geometric_meaning: "A41",
    sequence_recursion_induction: "A43",
    conic_condition_transform: "A44",
    trig_identity_transform: "A45",
    probability_reading: "A46",
    geometry_vector_method_mismatch: "A47",
    geometry_relation: "A31",
  };
  const fallbackAtom = fallback[claimType];
  if (fallbackAtom) {
    atomIds.add(fallbackAtom);
  }

  return [...atomIds];
}

function claimMatchesCheck(
  text: string,
  claimType: ClaimTrace["claimType"],
  check: { key: string; label: string; reason: string }
) {
  const haystack = normalizeOCRMathText(`${check.key} ${check.label} ${check.reason}`);
  if (claimType === "domain" && /domain|定义域/.test(haystack)) {
    return true;
  }
  if (
    claimType === "classification" &&
    /parameter|classification|分类|参数/.test(haystack)
  ) {
    return true;
  }
  if (
    claimType === "monotonicity_extremum" &&
    /monotonicity|endpoint|boundary|单调|最值/.test(haystack)
  ) {
    return true;
  }
  if (
    claimType === "geometry_vector_method_mismatch" &&
    /geometry|projection|dihedral|section|几何|二面角|投影/.test(haystack)
  ) {
    return true;
  }
  if (
    claimType === "equivalence_transform" &&
    /equation|derivative|discriminant|formula|方程|判别式|求导/.test(haystack)
  ) {
    return true;
  }
  if (claimType === "condition_omission" && /condition|scope|conclusion|条件|结论/.test(haystack)) {
    return true;
  }
  return /直接|所以|显然|答案/.test(text) && /scope|conclusion|condition/.test(haystack);
}

function toVerifierClaimType(
  claimType: ClaimTrace["claimType"]
): VerifierTrace["claimType"] {
  if (claimType === "domain") {
    return "domain";
  }
  if (claimType === "classification") {
    return "classification";
  }
  if (claimType === "monotonicity_extremum") {
    return "monotonicity";
  }
  if (
    claimType === "geometry_vector_method_mismatch" ||
    claimType === "geometry_relation"
  ) {
    return "geometry_relation";
  }
  if (
    claimType === "equivalence_transform" ||
    claimType === "trig_identity_transform"
  ) {
    return "equivalence";
  }
  return "proof_step";
}

function chooseVariantLevel(atom: LearnerMemoryDelta["atomUpdates"][number]) {
  if (atom.mastery === "weak") {
    return 1;
  }
  if (atom.mastery === "unstable") {
    return 2;
  }
  if (atom.mastery === "improving") {
    return 3;
  }
  return 4;
}

function chooseBoundedLevel(current: VariantLevel, target: VariantLevel) {
  return Math.min(4, Math.max(1, Math.min(current, target))) as VariantLevel;
}

function hasGeometryAtom(atomIds: string[]) {
  return atomIds.some((atomId) =>
    ["A31", "A32", "A33", "A34", "A35", "A36", "A37", "A38", "A47"].includes(
      atomId
    )
  );
}

function atom(
  id: string,
  label: string,
  level: string,
  description: string,
  keywords: RegExp[]
): AtomDef {
  return { id, label, level, description, keywords };
}
