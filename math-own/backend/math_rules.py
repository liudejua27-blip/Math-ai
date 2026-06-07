from __future__ import annotations

from typing import Any


ATOM_CATALOG: dict[str, dict[str, str]] = {
    "A01": {"label": "审题漏条件", "description": "没有把题干中的范围、存在性、恒成立、最值对象写入推理链。"},
    "A02": {"label": "公式记错", "description": "公式、导数、恒等变形或定理条件使用错误。"},
    "A03": {"label": "代数变形错误", "description": "移项、化简、因式分解、符号方向或指数对数运算出错。"},
    "A07": {"label": "定义域意识弱", "description": "求解前没有确认变量定义域或表达式合法性。"},
    "A08": {"label": "分类讨论缺失", "description": "参数或几何位置改变时，没有分情况讨论。"},
    "A10": {"label": "单调性判断缺失", "description": "只求临界点，没有用符号、导数或图像证明单调区间。"},
    "A11": {"label": "结论范围不完整", "description": "最终答案没有说明适用条件、等号条件或参数范围。"},
    "A12": {"label": "推导链断裂", "description": "从局部结论直接跳到最终结论，中间缺少必要论证。"},
    "A14": {"label": "端点比较遗漏", "description": "极值、最值或范围题没有检查边界、端点或无穷远趋势。"},
    "A18": {"label": "参数分析弱", "description": "把含参问题当作定参问题处理，忽略参数对结构的影响。"},
    "A21": {"label": "判别式使用不严", "description": "二次方程或不等式中没有说明判别式、开口方向和根的位置。"},
    "A24": {"label": "数列递推边界遗漏", "description": "数列问题没有处理首项、下标范围或递推适用条件。"},
    "A27": {"label": "概率事件拆分错误", "description": "概率题中样本空间、互斥独立、条件概率或期望定义不清。"},
    "A31": {"label": "几何约束遗漏", "description": "几何题没有把垂直、平行、夹角、长度关系等约束写入推理链。"},
}


TOPIC_PROFILES: dict[str, dict[str, Any]] = {
    "derivative_function": {
        "label": "导数与函数综合",
        "keywords": ["导数", "函数", "极值", "最值", "单调", "f'", "ln", "对数", "恒成立", "切线"],
        "required_checks": [
            {"key": "domain_usage", "label": "定义域/约束", "atom_ids": ["A07", "A01"], "required": True},
            {"key": "derivative_formula", "label": "求导公式", "atom_ids": ["A02"], "required": True},
            {"key": "critical_point", "label": "临界点", "atom_ids": ["A03"], "required": True},
            {"key": "monotonicity", "label": "单调性证明", "atom_ids": ["A10", "A12"], "required": True},
            {"key": "endpoint_boundary", "label": "端点/边界趋势", "atom_ids": ["A14"], "required": True},
            {"key": "parameter_discussion", "label": "参数分类", "atom_ids": ["A18", "A08"], "required": True},
            {"key": "conclusion_scope", "label": "结论范围", "atom_ids": ["A11"], "required": True},
        ],
    },
    "quadratic_function": {
        "label": "二次函数与不等式",
        "keywords": ["二次函数", "抛物线", "判别式", "Δ", "顶点", "开口", "根", "一元二次", "不等式"],
        "required_checks": [
            {"key": "condition_extract", "label": "条件提取", "atom_ids": ["A01"], "required": True},
            {"key": "discriminant_or_vertex", "label": "判别式/顶点", "atom_ids": ["A21"], "required": True},
            {"key": "parameter_discussion", "label": "参数分类", "atom_ids": ["A18", "A08"], "required": True},
            {"key": "conclusion_scope", "label": "结论范围", "atom_ids": ["A11"], "required": True},
        ],
    },
    "conic_geometry": {
        "label": "圆锥曲线",
        "keywords": ["椭圆", "双曲线", "抛物线", "焦点", "准线", "离心率", "弦", "切线", "圆锥曲线"],
        "required_checks": [
            {"key": "condition_extract", "label": "几何条件", "atom_ids": ["A31", "A01"], "required": True},
            {"key": "equation_setup", "label": "方程建模", "atom_ids": ["A03"], "required": True},
            {"key": "parameter_discussion", "label": "参数/位置分类", "atom_ids": ["A18", "A08"], "required": True},
            {"key": "conclusion_scope", "label": "结论范围", "atom_ids": ["A11"], "required": True},
        ],
    },
    "sequence": {
        "label": "数列",
        "keywords": ["数列", "等差", "等比", "通项", "递推", "前n项", "Sn", "a_n"],
        "required_checks": [
            {"key": "condition_extract", "label": "首项/下标", "atom_ids": ["A24", "A01"], "required": True},
            {"key": "equation_setup", "label": "递推或通项建模", "atom_ids": ["A03"], "required": True},
            {"key": "boundary_check", "label": "下标边界", "atom_ids": ["A24"], "required": True},
            {"key": "conclusion_scope", "label": "结论范围", "atom_ids": ["A11"], "required": True},
        ],
    },
    "probability_statistics": {
        "label": "概率统计",
        "keywords": ["概率", "随机", "独立", "互斥", "期望", "方差", "分布", "抽取", "样本空间"],
        "required_checks": [
            {"key": "condition_extract", "label": "样本空间", "atom_ids": ["A27", "A01"], "required": True},
            {"key": "equation_setup", "label": "事件拆分", "atom_ids": ["A27"], "required": True},
            {"key": "conclusion_scope", "label": "结果解释", "atom_ids": ["A11"], "required": True},
        ],
    },
    "solid_geometry": {
        "label": "立体几何",
        "keywords": ["立体几何", "空间", "垂直", "平行", "二面角", "体积", "棱锥", "棱柱", "法向量"],
        "required_checks": [
            {"key": "condition_extract", "label": "空间关系", "atom_ids": ["A31", "A01"], "required": True},
            {"key": "equation_setup", "label": "向量/几何建模", "atom_ids": ["A31"], "required": True},
            {"key": "conclusion_scope", "label": "结论范围", "atom_ids": ["A11"], "required": True},
        ],
    },
    "general_high_school_math": {
        "label": "高中数学综合",
        "keywords": [],
        "required_checks": [
            {"key": "condition_extract", "label": "条件提取", "atom_ids": ["A01"], "required": True},
            {"key": "equation_setup", "label": "建模与推导", "atom_ids": ["A12", "A03"], "required": True},
            {"key": "conclusion_scope", "label": "结论范围", "atom_ids": ["A11"], "required": True},
        ],
    },
}


def normalize_math_text(text: str) -> str:
    replacements = {
        " ": "",
        "（": "(",
        "）": ")",
        "＋": "+",
        "－": "-",
        "−": "-",
        "×": "*",
        "，": ",",
        "。": ".",
        "；": ";",
        "：": ":",
        "∞": "∞",
    }
    normalized = text
    for old, new in replacements.items():
        normalized = normalized.replace(old, new)
    return normalized.lower()


def contains_any(text: str, keywords: list[str]) -> bool:
    normalized = normalize_math_text(text)
    return any(normalize_math_text(keyword) in normalized for keyword in keywords)


def classify_topic(problem_text: str, student_steps_text: str = "") -> dict[str, Any]:
    text = f"{problem_text}\n{student_steps_text}"
    best_topic_id = "general_high_school_math"
    best_score = 0
    for topic_id, profile in TOPIC_PROFILES.items():
        if topic_id == "general_high_school_math":
            continue
        score = sum(1 for keyword in profile["keywords"] if contains_any(text, [keyword]))
        if score > best_score:
            best_topic_id = topic_id
            best_score = score
    profile = TOPIC_PROFILES[best_topic_id]
    return {
        "id": best_topic_id,
        "label": profile["label"],
        "score": best_score,
        "required_checks": profile["required_checks"],
    }


def atom_label(atom_id: str) -> str:
    return ATOM_CATALOG.get(atom_id, {"label": atom_id})["label"]


def atom_description(atom_id: str) -> str:
    return ATOM_CATALOG.get(atom_id, {"description": ""})["description"]
