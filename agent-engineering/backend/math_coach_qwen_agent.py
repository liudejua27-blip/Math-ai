from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

try:
    import json5
except ModuleNotFoundError:
    json5 = json


PROJECT_ROOT = Path(__file__).resolve().parents[2]
QWEN_AGENT_ROOT = PROJECT_ROOT / "opensource-bases" / "qwen-agent"
MATH_OWN_ROOT = PROJECT_ROOT / "math-own"
MATH_SEARAG_SKILL = Path(__file__).resolve().parent / "skills" / "math-searag" / "SKILL.md"
MATH_THINKING_GRAPH_SKILL = (
    Path(__file__).resolve().parent / "skills" / "math-thinking-graph" / "SKILL.md"
)

sys.path.insert(0, str(QWEN_AGENT_ROOT))
sys.path.insert(0, str(MATH_OWN_ROOT))

from qwen_agent.agents import Assistant  # noqa: E402
from qwen_agent.tools.base import BaseTool, register_tool  # noqa: E402

from backend.compute_engine import analyze_problem, list_capabilities  # noqa: E402


SYSTEM_MESSAGE = """
你是“高考数学私人思维教练”的 Math-SEARAG Agent。

你的基座不是自研 Agent，而是 Qwen-Agent 的 Assistant。你的任务是把学生的题目和解题步骤转化为可验证的数学思维诊断。

核心原则：
1. 不先给答案，先定位学生第一处错误步骤。
2. 每个关键结论必须绑定 evidence_id、strict_check 或 verification 状态。
3. 遇到定义域、端点、参数范围、上下标、分式层级、根号范围等低置信字段，先提示确认。
4. 符号验证失败、证据不足或条件缺失时，必须降置信度并要求人工复核。
5. 变式题只围绕同一个错因原子生成，不做随机刷题。
6. 面向高中生表达，禁止羞辱性评价、提分承诺和高考押题承诺。

固定输出结构：
- first_wrong_step
- misconception_atoms
- evidence_chain
- verification_status
- correction_card
- next_three_variants
"""


@register_tool("math_searag_diagnose")
class MathSearagDiagnose(BaseTool):
    description = (
        "Run a local Math-SEARAG diagnosis for a high-school math problem. "
        "Use it when the user provides a problem plus student solution steps."
    )
    parameters = [
        {
            "name": "problem_text",
            "type": "string",
            "description": "The corrected high-school math problem text.",
            "required": True,
        },
        {
            "name": "student_steps",
            "type": "string",
            "description": "The student's step-by-step solution attempt.",
            "required": True,
        },
        {
            "name": "confirmed_evidence",
            "type": "array",
            "items": {"type": "string"},
            "description": "Evidence IDs or low-confidence fields confirmed by the user.",
            "required": False,
        },
    ]

    def call(self, params: str, **_: Any) -> str:
        payload = json5.loads(params)
        result = analyze_problem(
            {
                "problem_text": payload.get("problem_text", ""),
                "student_steps": payload.get("student_steps", ""),
                "confirmed_evidence": payload.get("confirmed_evidence", []),
            }
        )

        compact_result = {
            "job_id": result.get("job_id"),
            "topic": result.get("topic"),
            "confidence": result.get("confidence"),
            "need_human_review": result.get("need_human_review"),
            "quality_gate": result.get("quality_gate"),
            "alignment": result.get("alignment"),
            "evidence_nodes": result.get("evidence_nodes"),
            "strict_checks": result.get("strict_checks"),
            "atoms": result.get("atoms"),
            "variants": result.get("variants"),
            "verification": result.get("verification"),
            "student_coach": result.get("student_coach"),
        }
        return json.dumps(compact_result, ensure_ascii=False, indent=2)


def build_llm_config() -> dict[str, Any]:
    model_server = os.getenv("QWEN_MODEL_SERVER")
    api_key = os.getenv("DASHSCOPE_API_KEY") or os.getenv("QWEN_API_KEY")
    model = os.getenv("QWEN_MODEL", "qwen-plus-latest")

    if model_server:
        return {
            "model": model,
            "model_server": model_server,
            "api_key": api_key or "EMPTY",
            "generate_cfg": {"top_p": 0.8},
        }

    return {
        "model": model,
        "model_type": "qwen_dashscope",
        "api_key": api_key,
        "generate_cfg": {"top_p": 0.8},
    }


def build_agent() -> Assistant:
    skill_files = [
        str(path)
        for path in (MATH_SEARAG_SKILL, MATH_THINKING_GRAPH_SKILL)
        if path.exists()
    ]

    return Assistant(
        llm=build_llm_config(),
        system_message=SYSTEM_MESSAGE,
        function_list=["math_searag_diagnose"],
        files=skill_files or None,
        name="Math-SEARAG Coach",
        description="Qwen-Agent based high-school math thinking coach.",
    )


def run_dry_diagnosis(problem_text: str, student_steps: str) -> dict[str, Any]:
    tool = MathSearagDiagnose()
    raw = tool.call(
        json.dumps(
            {
                "problem_text": problem_text,
                "student_steps": student_steps,
                "confirmed_evidence": [],
            },
            ensure_ascii=False,
        )
    )
    return json.loads(raw)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Qwen-Agent Math-SEARAG coach.")
    parser.add_argument("--dry-run", action="store_true", help="Exercise the local diagnosis tool without calling an LLM.")
    parser.add_argument("--problem", default="")
    parser.add_argument("--steps", default="")
    parser.add_argument("--query", default="请诊断这道导数题的第一处错误。")
    args = parser.parse_args()

    if args.dry_run:
        print(
            json.dumps(
                {
                    "base_agent": "Qwen-Agent Assistant",
                    "qwen_agent_path": str(QWEN_AGENT_ROOT),
                    "skill_files": [
                        str(path)
                        for path in (MATH_SEARAG_SKILL, MATH_THINKING_GRAPH_SKILL)
                        if path.exists()
                    ],
                    "capabilities": list_capabilities(),
                    "diagnosis": run_dry_diagnosis(args.problem, args.steps),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return

    if not (os.getenv("DASHSCOPE_API_KEY") or os.getenv("QWEN_API_KEY") or os.getenv("QWEN_MODEL_SERVER")):
        raise SystemExit(
            "Missing DASHSCOPE_API_KEY/QWEN_API_KEY or QWEN_MODEL_SERVER. "
            "Use --dry-run to verify the local Math-SEARAG tool without an LLM call."
        )

    bot = build_agent()
    messages = [{"role": "user", "content": args.query}]
    for response in bot.run(messages=messages):
        print(response)


if __name__ == "__main__":
    main()
