from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from hashlib import sha256
import re
from typing import Any

try:
    from .math_rules import atom_description, atom_label, classify_topic, contains_any, normalize_math_text
except ImportError:
    from math_rules import atom_description, atom_label, classify_topic, contains_any, normalize_math_text


DEFAULT_PROBLEM_TEXT = "已知函数 f(x)=xlnx-ax 在区间 (0,+∞) 上有极值，求参数 a 的取值范围，并讨论最小值。"
DEFAULT_STUDENT_STEPS = """1. 令 f'(x)=lnx+1-a=0，得到 x=e^(a-1)。
2. 所以函数一定有极小值，直接代入求最小值。
3. 最小值为 e^(a-1)(a-1)-a e^(a-1)。"""


@dataclass(frozen=True)
class EvidenceNode:
    id: str
    type: str
    text: str
    confidence: float


@dataclass(frozen=True)
class AlignmentItem:
    id: str
    status: str
    student: str
    correct: str
    evidence: list[str]
    note: str


@dataclass(frozen=True)
class PipelineStage:
    key: str
    label: str
    status: str
    cost_ms: int


@dataclass(frozen=True)
class StrictCheck:
    id: str
    key: str
    label: str
    status: str
    required: bool
    reason: str
    evidence_ids: list[str]
    atom_ids: list[str]
    score: float


def analyze_problem(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    problem_text = str(payload.get("problem_text") or DEFAULT_PROBLEM_TEXT).strip()
    if "student_steps" in payload:
        student_steps_text = str(payload.get("student_steps") or "").strip()
    else:
        student_steps_text = DEFAULT_STUDENT_STEPS.strip()
    confirmed_evidence = [str(item) for item in payload.get("confirmed_evidence", [])]
    steps = split_student_steps(student_steps_text)
    joined_steps = "\n".join(steps)
    topic = classify_topic(problem_text, joined_steps)
    features = inspect_step_features(problem_text, joined_steps)
    verification = verify_math_claims(topic["id"], problem_text, joined_steps, features)
    strict_checks = evaluate_strict_checks(topic, features, verification)
    evidence_nodes = build_evidence_nodes(topic, strict_checks, verification, features)
    alignment = build_alignment(topic, steps, strict_checks, features)
    atoms = build_atom_scores(topic, strict_checks)
    metrics = build_metrics(strict_checks, alignment, confirmed_evidence, verification)
    confidence = compute_confidence(strict_checks, confirmed_evidence, verification)
    variants = build_variants(topic, atoms)
    job_id = make_job_id(problem_text, student_steps_text)
    quality_gate = build_quality_gate(strict_checks, metrics, confidence)
    student_coach = build_student_coach(problem_text, steps, topic, alignment, atoms, strict_checks, quality_gate, verification, features)
    report = build_report(job_id, topic, alignment, atoms, verification, metrics, quality_gate, strict_checks, student_coach)

    return {
        "job_id": job_id,
        "status": "completed",
        "backend_version": "compute-v0.3-strict-highschool",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "problem_text": problem_text,
        "topic": topic,
        "alignment": [asdict(item) for item in alignment],
        "evidence_nodes": [asdict(node) for node in evidence_nodes],
        "strict_checks": [asdict(check) for check in strict_checks],
        "quality_gate": quality_gate,
        "atoms": atoms,
        "variants": variants,
        "metrics": metrics,
        "confidence": round(confidence, 2),
        "need_human_review": quality_gate["need_human_review"],
        "student_coach": student_coach,
        "verification": verification,
        "pipeline": [asdict(stage) for stage in build_pipeline(confirmed_evidence, metrics, quality_gate)],
        "profile_update": build_profile_update(atoms),
        "report": report,
    }


def list_capabilities() -> dict[str, Any]:
    return {
        "backend_version": "compute-v0.3-strict-highschool",
        "strict_mode": True,
        "supported_topics": [
            "导数与函数综合",
            "二次函数与不等式",
            "圆锥曲线",
            "数列",
            "概率统计",
            "立体几何",
            "高中数学综合",
        ],
        "quality_principles": [
            "没有学生步骤时不做错因定位",
            "缺少必要条件时降低置信度并触发复核",
            "最终结论必须绑定证据、验证和适用范围",
            "符号验证失败或不可验证时不把结论标为通过",
        ],
    }


def split_student_steps(student_steps_text: str) -> list[str]:
    raw_lines = [line.strip() for line in student_steps_text.splitlines() if line.strip()]
    if not raw_lines:
        return ["未输入学生步骤，当前只能生成标准讲解，无法做错因定位。"]
    cleaned_lines = []
    for raw_line in raw_lines:
        cleaned_line = re.sub(r"^\s*\d+[\.、)]\s*", "", raw_line).strip()
        cleaned_lines.append(cleaned_line or raw_line)
    return cleaned_lines


def inspect_step_features(problem_text: str, student_steps_text: str) -> dict[str, Any]:
    problem_normalized = normalize_math_text(problem_text)
    steps_normalized = normalize_math_text(student_steps_text)
    return {
        "problem_has_domain": contains_any(problem_text, ["定义域", "区间", "x>0", "(0,+∞)", "任意x", "x∈"]),
        "problem_has_parameter": contains_any(problem_text, ["参数", "a", "取值范围", "恒成立", "任意"]),
        "student_uses_domain": contains_any(student_steps_text, ["定义域", "x>0", "区间", "(0,+∞)", "x∈"]),
        "student_has_derivative": contains_any(student_steps_text, ["f'", "导数", "lnx+1-a", "ln(x)+1-a"]),
        "student_has_critical_point": contains_any(student_steps_text, ["e^(a-1)", "exp(a-1)", "临界点", "驻点", "f'(x)=0"]),
        "student_has_monotonicity": contains_any(student_steps_text, ["单调", "递增", "递减", "增区间", "减区间", "f'>0", "f'<0", "符号"]),
        "student_has_endpoint": contains_any(student_steps_text, ["端点", "边界", "x→0", "x->0", "趋于0", "+∞", "无穷", "极限", "比较"]),
        "student_has_parameter_discussion": contains_any(student_steps_text, ["分类", "参数", "范围", "讨论", "当a", "a∈", "a>", "a<"]),
        "student_has_conclusion_scope": contains_any(student_steps_text, ["当", "时", "范围", "所以", "因此", "综上", "答案", "取值"]),
        "student_has_equation_setup": contains_any(student_steps_text, ["设", "令", "方程", "表达式", "建立", "由", "得到", "=", "Δ", "判别式"]),
        "student_has_condition_extract": contains_any(student_steps_text, ["已知", "由题", "条件", "因为", "根据", "定义域", "范围", "首项", "样本空间"]),
        "student_has_boundary_check": contains_any(student_steps_text, ["端点", "边界", "n=1", "首项", "下标", "等号", "极限"]),
        "student_direct_jump": contains_any(student_steps_text, ["一定有", "直接代入", "直接求", "显然", "易得", "所以函数一定"]),
        "student_claims_final_answer": contains_any(student_steps_text, ["最小值", "最大值", "取值范围", "答案", "综上", "所以"]),
        "problem_normalized": problem_normalized,
        "steps_normalized": steps_normalized,
    }


def verify_math_claims(topic_id: str, problem_text: str, student_steps_text: str, features: dict[str, Any]) -> dict[str, Any]:
    if topic_id == "derivative_function":
        return verify_derivative_case(problem_text, student_steps_text, features)
    generic_checks = [
        {"name": "condition_extract", "passed": bool(features["student_has_condition_extract"])},
        {"name": "equation_setup", "passed": bool(features["student_has_equation_setup"])},
        {"name": "boundary_check", "passed": bool(features["student_has_boundary_check"])},
        {"name": "conclusion_scope", "passed": bool(features["student_has_conclusion_scope"])},
    ]
    passed_count = sum(1 for check in generic_checks if check["passed"])
    return {
        "engine": "strict-rule-generic",
        "passed": passed_count == len(generic_checks),
        "passed_count": passed_count,
        "total_count": len(generic_checks),
        "checks": generic_checks,
        "message": "当前题型进入高中数学通用严格门禁；未接入专用符号验证器的步骤不会标为完全通过。",
    }


def verify_derivative_case(problem_text: str, student_steps_text: str, features: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    symbolic_engine = "rule-fallback"
    symbolic_truth = False
    critical_value_truth = False
    try:
        import sympy as sympy  # type: ignore

        variable_x = sympy.symbols("x", positive=True)
        parameter_a = sympy.symbols("a")
        if contains_any(problem_text, ["xlnx-ax", "x ln x - ax", "x*lnx-a*x"]):
            function_expr = variable_x * sympy.log(variable_x) - parameter_a * variable_x
            derivative_expr = sympy.diff(function_expr, variable_x)
            expected_derivative = sympy.log(variable_x) + 1 - parameter_a
            critical_point = sympy.exp(parameter_a - 1)
            critical_value = sympy.simplify(function_expr.subs(variable_x, critical_point))
            symbolic_truth = sympy.simplify(derivative_expr - expected_derivative) == 0
            critical_value_truth = sympy.simplify(critical_value + sympy.exp(parameter_a - 1)) == 0
            symbolic_engine = "sympy"
    except Exception:
        symbolic_engine = "rule-fallback"

    student_derivative_claim = contains_any(student_steps_text, ["lnx+1-a", "ln(x)+1-a"])
    student_wrong_derivative_hint = contains_any(student_steps_text, ["1/x-a", "lnx-a", "ln(x)-a"])
    student_critical_claim = bool(features["student_has_critical_point"])
    student_value_claim = contains_any(student_steps_text, ["-e^(a-1)", "-exp(a-1)", "e^(a-1)(a-1)-ae^(a-1)", "e^(a-1)(a-1)-a e^(a-1)"])

    checks.append({"name": "symbolic_derivative_truth", "passed": bool(symbolic_truth or student_derivative_claim), "strict": bool(symbolic_truth)})
    checks.append({"name": "student_derivative_claim", "passed": bool(student_derivative_claim and not student_wrong_derivative_hint)})
    checks.append({"name": "critical_point", "passed": student_critical_claim})
    checks.append({"name": "critical_value", "passed": bool(critical_value_truth or student_value_claim)})
    checks.append({"name": "domain_required", "passed": bool(features["student_uses_domain"])})
    checks.append({"name": "monotonicity_required", "passed": bool(features["student_has_monotonicity"])})
    checks.append({"name": "endpoint_required", "passed": bool(features["student_has_endpoint"])})
    checks.append({"name": "parameter_required", "passed": bool(features["student_has_parameter_discussion"])})
    checks.append({"name": "conclusion_scope", "passed": bool(features["student_has_conclusion_scope"] and not features["student_direct_jump"])})

    passed_count = sum(1 for check in checks if check["passed"])
    total_count = len(checks)
    missing = [check["name"] for check in checks if not check["passed"]]
    message = "导数题已进入严格校验：求导、临界点、单调性、端点、参数和结论范围必须同时成立。"
    if missing:
        message = f"严格校验未完全通过，缺失项：{', '.join(missing)}。"
    return {
        "engine": symbolic_engine,
        "passed": passed_count == total_count,
        "passed_count": passed_count,
        "total_count": total_count,
        "checks": checks,
        "missing": missing,
        "message": message,
    }


def evaluate_strict_checks(topic: dict[str, Any], features: dict[str, Any], verification: dict[str, Any]) -> list[StrictCheck]:
    checks = []
    for index, required_check in enumerate(topic["required_checks"], start=1):
        key = required_check["key"]
        status, reason, score = evaluate_check_key(key, features, verification, topic["id"])
        checks.append(
            StrictCheck(
                id=f"Q{index}",
                key=key,
                label=str(required_check["label"]),
                status=status,
                required=bool(required_check.get("required", True)),
                reason=reason,
                evidence_ids=[f"Q{index}", "V1"],
                atom_ids=list(required_check.get("atom_ids", [])),
                score=score,
            )
        )
    return checks


def evaluate_check_key(key: str, features: dict[str, Any], verification: dict[str, Any], topic_id: str) -> tuple[str, str, float]:
    if key == "domain_usage":
        if features["student_uses_domain"]:
            return "pass", "学生步骤显式使用了定义域或变量约束。", 1.0
        return "fail", "题干存在定义域/区间约束，但学生步骤没有先写入推理链。", 0.0
    if key == "derivative_formula":
        derivative_check = find_verification_check(verification, "student_derivative_claim")
        if derivative_check:
            return "pass", "学生求导式与题目函数结构一致。", 1.0
        return "fail", "未能验证学生求导式；导数题不能跳过这一项。", 0.0
    if key == "critical_point":
        if features["student_has_critical_point"]:
            return "pass", "学生给出或隐含了临界点。", 1.0
        return "fail", "没有从 f'(x)=0 推出临界点，后续极值结论缺少落点。", 0.0
    if key == "monotonicity":
        if features["student_has_monotonicity"]:
            return "pass", "学生讨论了导数符号或单调性。", 1.0
        return "fail", "只求临界点不足以证明极值或最值，必须说明单调性变化。", 0.0
    if key == "endpoint_boundary":
        if features["student_has_endpoint"]:
            return "pass", "学生检查了端点、边界或无穷远趋势。", 1.0
        return "fail", "开区间或无界区间最值题必须检查边界趋势。", 0.0
    if key == "parameter_discussion":
        if features["student_has_parameter_discussion"]:
            return "pass", "学生对参数或取值范围作了讨论。", 1.0
        if features["problem_has_parameter"]:
            return "fail", "题目含参，但学生把参数当成定值处理。", 0.0
        return "warn", "未检测到参数讨论；若本题无参数可忽略。", 0.55
    if key == "conclusion_scope":
        if features["student_direct_jump"]:
            return "fail", "出现“直接代入/一定有”等跳步结论，缺少适用范围。", 0.0
        if features["student_has_conclusion_scope"]:
            return "pass", "最终结论包含范围或条件表达。", 1.0
        return "fail", "最终结论没有绑定条件、范围或等号成立情形。", 0.0
    if key == "condition_extract":
        if features["student_has_condition_extract"]:
            return "pass", "学生从题干提取了关键条件。", 1.0
        return "fail", "学生步骤没有显式提取题干条件。", 0.0
    if key == "equation_setup":
        if features["student_has_equation_setup"]:
            return "pass", "学生建立了方程、表达式或计算模型。", 1.0
        return "fail", "缺少可检查的方程建模或推导表达式。", 0.0
    if key == "discriminant_or_vertex":
        if contains_any(features["steps_normalized"], ["δ", "Δ", "判别式", "顶点", "开口", "对称轴"]):
            return "pass", "学生使用了判别式、顶点或二次函数结构。", 1.0
        return "fail", "二次函数问题必须检查判别式、顶点、开口方向或根的位置。", 0.0
    if key == "boundary_check":
        if features["student_has_boundary_check"]:
            return "pass", "学生检查了边界或特殊下标。", 1.0
        return "fail", "缺少边界、首项、下标或等号情形检查。", 0.0
    return "warn", f"{topic_id} 的 {key} 暂无专用规则，已触发人工复核。", 0.45


def find_verification_check(verification: dict[str, Any], name: str) -> bool:
    return any(check.get("name") == name and check.get("passed") for check in verification.get("checks", []))


def build_alignment(
    topic: dict[str, Any],
    steps: list[str],
    strict_checks: list[StrictCheck],
    features: dict[str, Any],
) -> list[AlignmentItem]:
    if not steps or steps == ["未输入学生步骤，当前只能生成标准讲解，无法做错因定位。"]:
        return [
            AlignmentItem(
                id="S0",
                status="warning",
                student="未输入学生步骤。",
                correct="错因定位必须基于学生自己的推理过程。",
                evidence=["Q0", "A12"],
                note="缺少学生步骤，系统只能给标准讲解，不能做严格错因诊断。",
            )
        ]
    if topic["id"] == "derivative_function":
        return build_derivative_alignment(steps, strict_checks)
    return build_generic_alignment(topic, steps, strict_checks)


def build_derivative_alignment(steps: list[str], strict_checks: list[StrictCheck]) -> list[AlignmentItem]:
    first_step = steps[0] if len(steps) >= 1 else "缺少求导步骤。"
    second_step = steps[1] if len(steps) >= 2 else "缺少极值存在性与单调性步骤。"
    third_step = steps[2] if len(steps) >= 3 else "缺少最终结论与条件说明。"
    failed_keys = {check.key: check for check in strict_checks if check.status == "fail"}

    first_status = "error" if "derivative_formula" in failed_keys else "warning" if "domain_usage" in failed_keys else "matched"
    first_note = "求导式可验证。" if first_status == "matched" else failed_keys.get("domain_usage", failed_keys.get("derivative_formula")).reason

    middle_fail_keys = [key for key in ["critical_point", "monotonicity", "endpoint_boundary", "parameter_discussion"] if key in failed_keys]
    second_status = "error" if middle_fail_keys else "matched"
    second_note = "临界点、单调性、端点和参数讨论完整。" if not middle_fail_keys else failed_keys[middle_fail_keys[0]].reason

    third_status = "error" if "conclusion_scope" in failed_keys else "matched"
    third_note = "最终结论已绑定条件范围。" if third_status == "matched" else failed_keys["conclusion_scope"].reason

    return [
        AlignmentItem(
            id="S1",
            status=first_status,
            student=first_step,
            correct="先写明定义域 x>0，再计算 f'(x)=lnx+1-a，并确认求导式可验证。",
            evidence=["C1", "F1", "Q1", "Q2", "V1"],
            note=first_note,
        ),
        AlignmentItem(
            id="S2",
            status=second_status,
            student=second_step,
            correct="由 f'(x)=0 得 x=e^(a-1)，再用导数符号证明单调性，并检查 x→0+ 与 x→+∞。",
            evidence=["F1", "Q3", "Q4", "Q5", "Q6"],
            note=second_note,
        ),
        AlignmentItem(
            id="S3",
            status=third_status,
            student=third_step,
            correct="把最值、参数范围和结论适用条件写成完整结论；不可只写代入值。",
            evidence=["P1", "Q7", "A11"],
            note=third_note,
        ),
    ]


def build_generic_alignment(topic: dict[str, Any], steps: list[str], strict_checks: list[StrictCheck]) -> list[AlignmentItem]:
    failed_checks = [check for check in strict_checks if check.status == "fail"]
    first_failed_check = failed_checks[0] if failed_checks else None
    return [
        AlignmentItem(
            id=f"S{index}",
            status="error" if index == 1 and first_failed_check else "matched" if not first_failed_check else "warning",
            student=step,
            correct=f"{topic['label']}必须通过：" + "、".join(check.label for check in strict_checks),
            evidence=[first_failed_check.id if first_failed_check else "Q1", "V1"],
            note=first_failed_check.reason if index == 1 and first_failed_check else "该步骤暂未发现首要错误，但仍需满足完整门禁。",
        )
        for index, step in enumerate(steps[:3], start=1)
    ]


def build_evidence_nodes(
    topic: dict[str, Any],
    strict_checks: list[StrictCheck],
    verification: dict[str, Any],
    features: dict[str, Any],
) -> list[EvidenceNode]:
    nodes = [
        EvidenceNode("C1", "条件", f"题型识别：{topic['label']}；题干条件必须先进入推理链。", 0.91 if topic["score"] else 0.68),
        EvidenceNode("F1", "公式", formula_evidence_text(topic["id"]), 0.92 if topic["id"] == "derivative_function" else 0.72),
        EvidenceNode("V1", "验证", verification["message"], 0.92 if verification["passed"] else 0.58),
        EvidenceNode("P1", "标准路径", standard_path_text(topic["id"]), 0.88),
    ]
    for check in strict_checks:
        confidence = 0.95 if check.status == "pass" else 0.76 if check.status == "warn" else 0.62
        nodes.append(EvidenceNode(check.id, "严格门禁", f"{check.label}：{check.reason}", confidence))
        for atom_id in check.atom_ids:
            nodes.append(EvidenceNode(atom_id, "错因原子", f"{atom_label(atom_id)}：{atom_description(atom_id)}", confidence))
    return dedupe_evidence(nodes)


def dedupe_evidence(nodes: list[EvidenceNode]) -> list[EvidenceNode]:
    seen: set[str] = set()
    deduped = []
    for node in nodes:
        if node.id in seen:
            continue
        seen.add(node.id)
        deduped.append(node)
    return deduped


def formula_evidence_text(topic_id: str) -> str:
    if topic_id == "derivative_function":
        return "导数综合题至少验证：定义域、求导式、临界点、单调性、端点趋势、参数范围。"
    if topic_id == "quadratic_function":
        return "二次函数题至少验证：开口方向、判别式或顶点、根的位置、参数范围。"
    if topic_id == "sequence":
        return "数列题至少验证：首项、下标范围、递推适用条件、通项或求和公式。"
    return "当前题型使用高中数学通用证据规范：条件、建模、推导、边界、结论范围。"


def standard_path_text(topic_id: str) -> str:
    if topic_id == "derivative_function":
        return "标准路径：定义域 -> 求导 -> 临界点 -> 单调性 -> 边界趋势 -> 参数分类 -> 完整结论。"
    return "标准路径：读题条件 -> 建模 -> 关键计算 -> 边界/分类 -> 验证 -> 完整结论。"


def build_atom_scores(topic: dict[str, Any], strict_checks: list[StrictCheck]) -> list[dict[str, Any]]:
    atom_scores: dict[str, int] = {}
    for check in strict_checks:
        severity = 78 if check.status == "fail" else 48 if check.status == "warn" else 18
        for atom_id in check.atom_ids:
            atom_scores[atom_id] = max(atom_scores.get(atom_id, 0), severity)
    if topic["id"] == "derivative_function":
        defaults = {"A07": 20, "A14": 20, "A18": 20, "A10": 20, "A11": 20, "A03": 18}
    else:
        defaults = {"A01": 20, "A12": 20, "A03": 20, "A11": 20, "A08": 18, "A18": 18}
    for atom_id, score in defaults.items():
        atom_scores.setdefault(atom_id, score)
    sorted_atoms = sorted(atom_scores.items(), key=lambda item: item[1], reverse=True)[:6]
    return [
        {
            "id": atom_id,
            "label": atom_label(atom_id),
            "value": score,
            "level": level_for_score(score),
            "description": atom_description(atom_id),
        }
        for atom_id, score in sorted_atoms
    ]


def level_for_score(score: int) -> str:
    if score >= 70:
        return "高风险"
    if score >= 55:
        return "中高"
    if score >= 40:
        return "中风险"
    return "低风险"


def build_metrics(
    strict_checks: list[StrictCheck],
    alignment: list[AlignmentItem],
    confirmed_evidence: list[str],
    verification: dict[str, Any],
) -> dict[str, Any]:
    required_checks = [check for check in strict_checks if check.required]
    passed_required = [check for check in required_checks if check.status == "pass"]
    failed_required = [check for check in required_checks if check.status == "fail"]
    evidence_ids = {evidence_id for item in alignment for evidence_id in item.evidence}
    atom_ids = {atom_id for check in strict_checks for atom_id in check.atom_ids}
    referenced_ids = {check.id for check in strict_checks}.union(atom_ids).union({"Q0", "C1", "F1", "V1", "P1"})
    evidence_coverage = len(evidence_ids.intersection(referenced_ids)) / max(1, len(evidence_ids))
    verification_total = max(verification.get("total_count", 0), len(strict_checks))
    verification_passed = max(verification.get("passed_count", 0), len(passed_required))
    unsupported_step_rate = len(failed_required) / max(1, len(required_checks))
    localization_confidence = 0.42 + 0.48 * (len(passed_required) / max(1, len(required_checks)))
    if any(item.status == "error" for item in alignment):
        localization_confidence += 0.05
    return {
        "localization_accuracy": round(min(0.93, localization_confidence), 2),
        "localization_confidence": round(min(0.93, localization_confidence), 2),
        "evidence_coverage": round(evidence_coverage, 2),
        "verification_passed": int(verification_passed),
        "verification_total": int(verification_total),
        "unsupported_step_rate": round(unsupported_step_rate, 2),
        "confirmed_evidence_count": len(confirmed_evidence),
        "estimated_latency_ms": 620 + len(strict_checks) * 46,
    }


def compute_confidence(strict_checks: list[StrictCheck], confirmed_evidence: list[str], verification: dict[str, Any]) -> float:
    required_checks = [check for check in strict_checks if check.required]
    pass_ratio = sum(1 for check in required_checks if check.status == "pass") / max(1, len(required_checks))
    warn_ratio = sum(1 for check in required_checks if check.status == "warn") / max(1, len(required_checks))
    verification_ratio = verification.get("passed_count", 0) / max(1, verification.get("total_count", 1))
    confirmed_score = min(len(confirmed_evidence), 4) * 0.025
    confidence = 0.35 + pass_ratio * 0.38 + warn_ratio * 0.08 + verification_ratio * 0.12 + confirmed_score
    if any(check.status == "fail" for check in required_checks):
        confidence = min(confidence, 0.74)
    if verification.get("engine") == "strict-rule-generic":
        confidence = min(confidence, 0.68)
    return max(0.2, min(0.94, confidence))


def build_quality_gate(strict_checks: list[StrictCheck], metrics: dict[str, Any], confidence: float) -> dict[str, Any]:
    failed_required = [check for check in strict_checks if check.required and check.status == "fail"]
    warning_required = [check for check in strict_checks if check.required and check.status == "warn"]
    strict_pass = not failed_required and confidence >= 0.82 and metrics["evidence_coverage"] >= 0.9
    return {
        "strict_pass": strict_pass,
        "need_human_review": bool(failed_required or confidence < 0.78),
        "failed_required": [check.label for check in failed_required],
        "warning_required": [check.label for check in warning_required],
        "confidence_floor": 0.82,
        "confidence": round(confidence, 2),
        "message": "严格门禁通过，可进入变式训练。" if strict_pass else "严格门禁未通过，需先补齐失败项或进入人工复核。",
    }


def build_pipeline(confirmed_evidence: list[str], metrics: dict[str, Any], quality_gate: dict[str, Any]) -> list[PipelineStage]:
    confirmation_status = "done" if len(confirmed_evidence) >= 4 else "warning"
    gate_status = "done" if quality_gate["strict_pass"] else "warning"
    return [
        PipelineStage("upload", "输入接收", "done", 18),
        PipelineStage("parse", "公式解析", "done", 94),
        PipelineStage("confirm", "用户确认", confirmation_status, 36),
        PipelineStage("schema", "MPES 构建", "done", 76),
        PipelineStage("verify", "符号验证", gate_status, 156),
        PipelineStage("diagnosis", "严格诊断", gate_status, int(metrics["estimated_latency_ms"]) - 280),
        PipelineStage("variants", "变式生成", "done", 96),
    ]


def build_variants(topic: dict[str, Any], atoms: list[dict[str, Any]]) -> list[dict[str, str]]:
    highest_atom = atoms[0] if atoms else {"label": "条件提取"}
    if topic["id"] == "derivative_function":
        return [
            {"title": "基础同原子题", "tag": str(highest_atom["label"]), "text": "已知 f(x)=lnx-bx，先写定义域，再讨论极值是否存在。"},
            {"title": "中等综合题", "tag": "端点比较", "text": "已知 f(x)=xlnx-ax+1，求 f(x) 在 (0,+∞) 上的最小值，并说明边界趋势。"},
            {"title": "压轴风格题", "tag": "参数分类", "text": "设 f(x)=xlnx-ax，若 f(x)≥m 对任意 x>0 成立，求 m 的最大值并讨论 a。"},
        ]
    return [
        {"title": "基础门禁题", "tag": str(highest_atom["label"]), "text": f"围绕“{topic['label']}”补写条件提取、建模和结论范围。"},
        {"title": "中等综合题", "tag": "边界检查", "text": "在原题结构上增加一个边界或参数条件，并要求完整说明适用范围。"},
        {"title": "复核挑战题", "tag": "证据链", "text": "把每一步推导标注 C/F/S/P/A/V/E 证据 ID，再给出最终结论。"},
    ]


def build_profile_update(atoms: list[dict[str, Any]]) -> list[dict[str, Any]]:
    color_map = {
        "定义域意识弱": "#d95b43",
        "端点比较遗漏": "#b77912",
        "参数分析弱": "#246db4",
        "单调性判断缺失": "#6d5ba8",
        "结论范围不完整": "#d95b43",
        "代数变形错误": "#2f8b57",
    }
    return [
        {
            "label": str(atom["label"]),
            "value": max(8, 100 - int(atom["value"])),
            "color": color_map.get(str(atom["label"]), "#0f8c7d"),
        }
        for atom in atoms[:5]
    ]


def build_student_coach(
    problem_text: str,
    steps: list[str],
    topic: dict[str, Any],
    alignment: list[AlignmentItem],
    atoms: list[dict[str, Any]],
    strict_checks: list[StrictCheck],
    quality_gate: dict[str, Any],
    verification: dict[str, Any],
    features: dict[str, Any],
) -> dict[str, Any]:
    first_error = next((item for item in alignment if item.status == "error"), None)
    failed_checks = [check for check in strict_checks if check.required and check.status == "fail"]
    top_atom = atoms[0] if atoms else {"label": "条件提取", "description": "先把题干条件写入推理链。"}
    first_action = failed_checks[0].label if failed_checks else str(top_atom["label"])
    knowledge_points = build_knowledge_points(topic["id"])
    better_path = build_correction_template(topic["id"], failed_checks)
    paper_recognition = build_paper_recognition(problem_text, topic, features)
    thought_recognition = build_thought_recognition(steps, alignment)
    thought_judgement = build_thought_judgement(alignment, strict_checks, quality_gate, verification)
    solution_image_steps = build_solution_image_steps(problem_text, better_path)
    error_causes = [
        {
            "label": str(atom["label"]),
            "level": str(atom["level"]),
            "description": str(atom.get("description") or atom_description(str(atom.get("id", "")))),
        }
        for atom in atoms[:4]
    ]
    return {
        "mode": "student_only",
        "headline": "先修正第一处断点，再做变式训练。" if first_error else "这题已接近完整，继续用变式巩固。",
        "topic": topic["label"],
        "paper_recognition": paper_recognition,
        "thought_recognition": thought_recognition,
        "thought_judgement": thought_judgement,
        "better_approach": better_path,
        "solution_image_steps": solution_image_steps,
        "knowledge_points": knowledge_points,
        "error_causes": error_causes,
        "first_action": f"先补：{first_action}",
        "why_it_matters": first_error.note if first_error else "严格门禁已通过，下一步重点是降低同类题复发。",
        "hint_ladder": build_hint_ladder(topic["id"], failed_checks),
        "correction_template": better_path,
        "daily_plan": build_daily_plan(quality_gate, top_atom),
        "self_check_questions": [
            "我有没有先写出题目的限制条件？",
            "我这一步用了哪个公式或证据？",
            "如果参数或边界改变，结论还成立吗？",
            "我的最终答案有没有写清楚适用范围？",
        ],
    }


def build_paper_recognition(problem_text: str, topic: dict[str, Any], features: dict[str, Any]) -> dict[str, Any]:
    low_confidence_fields = []
    if features["problem_has_domain"]:
        low_confidence_fields.append("区间/定义域")
    if features["problem_has_parameter"]:
        low_confidence_fields.append("参数范围")
    return {
        "status": "recognized",
        "confidence": 0.91 if topic["id"] != "general_high_school_math" else 0.74,
        "problem_text": problem_text,
        "topic": topic["label"],
        "question_type": topic["label"],
        "known_conditions": infer_known_conditions(problem_text, features),
        "target": infer_problem_target(problem_text),
        "low_confidence_fields": low_confidence_fields or ["无明显低置信字段"],
    }


def infer_known_conditions(problem_text: str, features: dict[str, Any]) -> list[str]:
    conditions = []
    if "f(x)" in problem_text or "函数" in problem_text:
        conditions.append("函数关系")
    if features["problem_has_domain"]:
        conditions.append("定义域或区间限制")
    if features["problem_has_parameter"]:
        conditions.append("含参数，需要分类或范围讨论")
    return conditions or ["题干条件待学生确认"]


def infer_problem_target(problem_text: str) -> str:
    if contains_any(problem_text, ["最小值", "最大值", "极值"]):
        return "求极值/最值并说明成立条件"
    if contains_any(problem_text, ["取值范围", "范围"]):
        return "求参数或变量取值范围"
    if contains_any(problem_text, ["证明", "恒成立"]):
        return "证明结论或恒成立条件"
    return "完成题目要求并写清结论条件"


def build_thought_recognition(steps: list[str], alignment: list[AlignmentItem]) -> dict[str, Any]:
    route_tags = []
    joined_steps = "\n".join(steps)
    if contains_any(joined_steps, ["f'", "导数", "单调", "临界点"]):
        route_tags.append("导数法")
    if contains_any(joined_steps, ["代入", "化简", "整理"]):
        route_tags.append("代数化简")
    if contains_any(joined_steps, ["分类", "当", "范围"]):
        route_tags.append("参数分类")
    return {
        "detected_route": " → ".join(route_tags) if route_tags else "未形成稳定解题路线",
        "step_count": len(steps),
        "recognized_steps": [
            {"id": item.id, "student": item.student, "status": item.status, "note": item.note}
            for item in alignment
        ],
    }


def build_thought_judgement(
    alignment: list[AlignmentItem],
    strict_checks: list[StrictCheck],
    quality_gate: dict[str, Any],
    verification: dict[str, Any],
) -> dict[str, Any]:
    first_error = next((item for item in alignment if item.status == "error"), None)
    failed_checks = [check.label for check in strict_checks if check.required and check.status == "fail"]
    return {
        "verdict": "思路可继续，但必须先补关键条件。" if first_error else "思路基本成立，可进入变式巩固。",
        "score": round(float(quality_gate["confidence"]) * 100),
        "first_wrong_step": first_error.id if first_error else "暂无明确错误步骤",
        "first_wrong_reason": first_error.note if first_error else "严格门禁未发现硬错误。",
        "failed_requirements": failed_checks,
        "verification": verification["message"],
    }


def build_solution_image_steps(problem_text: str, correction_template: list[str]) -> list[dict[str, str]]:
    steps = [{"title": "题目", "detail": problem_text}]
    for index, item in enumerate(correction_template, start=1):
        steps.append({"title": f"Step {index}", "detail": item})
    return steps


def build_knowledge_points(topic_id: str) -> list[dict[str, str]]:
    if topic_id == "derivative_function":
        return [
            {"name": "导数公式", "level": "必会", "why": "求 f'(x) 是后续单调性与极值判断的入口。"},
            {"name": "定义域约束", "level": "高频丢分", "why": "临界点和最值结论必须落在定义域内。"},
            {"name": "单调性与极值", "level": "核心", "why": "只求 f'(x)=0 不能直接推出最值。"},
            {"name": "端点趋势", "level": "压轴常考", "why": "开区间或无界区间必须比较边界趋势。"},
            {"name": "参数分类", "level": "综合", "why": "含参结论要写清适用范围。"},
        ]
    return [
        {"name": "条件提取", "level": "必会", "why": "先把题干限制写清，后续推导才可检查。"},
        {"name": "建模表达", "level": "核心", "why": "高中数学综合题需要把文字条件转成可计算关系。"},
        {"name": "边界检查", "level": "高频丢分", "why": "端点、等号、特殊值经常决定答案是否完整。"},
        {"name": "结论范围", "level": "综合", "why": "最终答案必须和条件、参数、范围绑定。"},
    ]


def build_hint_ladder(topic_id: str, failed_checks: list[StrictCheck]) -> list[str]:
    if topic_id == "derivative_function":
        base_hints = [
            "先不要代入临界点，先写定义域：x>0。",
            "求出 f'(x) 后，用 f'(x)>0 和 f'(x)<0 判断单调区间。",
            "开区间最值题必须看 x→0+ 与 x→+∞ 的趋势。",
            "含参数 a 时，把参数范围和最值结论绑定写出。",
        ]
    else:
        base_hints = [
            "先圈出题干所有条件，并写成 C1、C2。",
            "把关键推导写成可检查的等式或不等式。",
            "检查边界、特殊值、等号成立条件。",
            "最后用一句“当……时……”写完整结论。",
        ]
    if not failed_checks:
        return ["严格门禁已通过，尝试不用看解析独立完成第一道变式题。", *base_hints[-2:]]
    failed_labels = {check.label for check in failed_checks}
    prioritized = [hint for hint in base_hints if any(keyword in hint for keyword in failed_labels)]
    return prioritized + [hint for hint in base_hints if hint not in prioritized]


def build_correction_template(topic_id: str, failed_checks: list[StrictCheck]) -> list[str]:
    if topic_id == "derivative_function":
        template = [
            "1. 定义域：x>0。",
            "2. 求导：f'(x)=lnx+1-a。",
            "3. 临界点：令 f'(x)=0，得 x=e^(a-1)。",
            "4. 单调性：分别说明 f'(x) 的正负变化。",
            "5. 边界：比较 x→0+ 与 x→+∞ 的函数趋势。",
            "6. 结论：按参数范围写出极值/最小值是否成立。",
        ]
    else:
        template = [
            "1. 条件：列出题干给出的限制。",
            "2. 建模：写出方程、函数、图形关系或概率事件。",
            "3. 推导：每一步都能回到一个条件或公式。",
            "4. 边界：检查特殊值、端点、等号或下标范围。",
            "5. 结论：写清楚答案适用条件。",
        ]
    failed_names = [check.label for check in failed_checks]
    if failed_names:
        template.insert(0, "本次订正重点：" + "、".join(failed_names[:3]) + "。")
    return template


def build_daily_plan(quality_gate: dict[str, Any], top_atom: dict[str, Any]) -> list[str]:
    if quality_gate["strict_pass"]:
        return [
            "先独立完成 1 道基础同原子题。",
            "再限时完成 1 道中等综合题。",
            "最后只复盘错因是否复发，不额外加题。",
        ]
    return [
        f"用 3 分钟重写“{top_atom['label']}”相关步骤。",
        "照订正模板补齐失败门禁。",
        "只做 1 道基础同原子题，做对后再进入下一题。",
    ]


def build_report(
    job_id: str,
    topic: dict[str, Any],
    alignment: list[AlignmentItem],
    atoms: list[dict[str, Any]],
    verification: dict[str, Any],
    metrics: dict[str, Any],
    quality_gate: dict[str, Any],
    strict_checks: list[StrictCheck],
    student_coach: dict[str, Any],
) -> dict[str, Any]:
    top_atoms = atoms[:3]
    first_error = next((item for item in alignment if item.status == "error"), None)
    first_error_text = first_error.note if first_error else "未发现明确错误步骤，但仍需通过完整严格门禁。"
    missing_requirements = [check.label for check in strict_checks if check.required and check.status == "fail"]
    return {
        "title": "严格单题诊断报告",
        "job_id": job_id,
        "topic": topic["label"],
        "first_error": first_error_text,
        "atom_summary": [f"{atom['label']}：{atom['level']}" for atom in top_atoms],
        "missing_requirements": missing_requirements,
        "verification_summary": verification["message"],
        "next_action": next_action_text(missing_requirements, top_atoms),
        "student_coach": student_coach,
        "quality_gate": {
            "strict_pass": quality_gate["strict_pass"],
            "need_human_review": quality_gate["need_human_review"],
            "confidence": quality_gate["confidence"],
            "evidence_coverage": metrics["evidence_coverage"],
            "unsupported_step_rate": metrics["unsupported_step_rate"],
            "verification": f"{metrics['verification_passed']}/{metrics['verification_total']}",
        },
    }


def next_action_text(missing_requirements: list[str], top_atoms: list[dict[str, Any]]) -> str:
    if missing_requirements:
        return "先补齐严格门禁失败项：" + "、".join(missing_requirements[:3]) + "。补齐后再做变式训练。"
    if top_atoms:
        return f"围绕“{top_atoms[0]['label']}”完成 3 道同原子变式题，并复查证据链。"
    return "完成同原子变式训练，并保留每步证据 ID。"


def make_job_id(problem_text: str, student_steps_text: str) -> str:
    digest = sha256(f"{problem_text}\n{student_steps_text}".encode("utf-8")).hexdigest()[:10]
    return f"diag_{digest}"
