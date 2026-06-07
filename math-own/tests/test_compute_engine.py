import sys
import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from compute_engine import analyze_problem, list_capabilities, split_student_steps  # noqa: E402


class ComputeEngineTests(unittest.TestCase):
    def test_split_student_steps_removes_numbering(self):
        steps = split_student_steps("1. 求导\n2. 直接代入")
        self.assertEqual(steps, ["求导", "直接代入"])

    def test_analyze_problem_returns_error_alignment(self):
        result = analyze_problem({"student_steps": "1. 求导得到 lnx+1-a\n2. 所以一定有极小值，直接代入"})
        error_steps = [item for item in result["alignment"] if item["status"] == "error"]
        self.assertEqual(result["status"], "completed")
        self.assertTrue(error_steps)
        self.assertEqual(error_steps[0]["id"], "S2")
        self.assertEqual(result["metrics"]["evidence_coverage"], 1.0)
        self.assertFalse(result["quality_gate"]["strict_pass"])
        self.assertTrue(result["need_human_review"])

    def test_confirmed_evidence_raises_confidence(self):
        base_result = analyze_problem({"confirmed_evidence": []})
        confirmed_result = analyze_problem({"confirmed_evidence": ["C1", "F1", "C2", "S2"]})
        self.assertGreater(confirmed_result["confidence"], base_result["confidence"])

    def test_complete_derivative_solution_has_higher_confidence(self):
        result = analyze_problem({
            "confirmed_evidence": ["C1", "F1", "C2", "S2"],
            "student_steps": """
1. 定义域为 x>0，f'(x)=lnx+1-a。
2. 令 f'(x)=0，得临界点 x=e^(a-1)，讨论 f' 的符号变化与单调性。
3. 比较 x→0+ 与 x→+∞ 的边界趋势，并按参数 a 的范围分类讨论。
4. 综上写出最小值及其成立范围。
""",
        })
        self.assertGreaterEqual(result["confidence"], 0.82)
        self.assertTrue(result["quality_gate"]["strict_pass"])
        self.assertFalse(result["need_human_review"])

    def test_empty_student_steps_do_not_use_default_demo_steps(self):
        result = analyze_problem({
            "problem_text": "已知函数 f(x)=xlnx-ax，求极值。",
            "student_steps": "",
        })
        error_steps = [item for item in result["alignment"] if item["status"] == "error"]
        self.assertEqual(error_steps, [])
        self.assertTrue(result["need_human_review"])
        self.assertIn("未输入", result["alignment"][0]["student"])

    def test_capabilities_expose_strict_mode(self):
        capabilities = list_capabilities()
        self.assertTrue(capabilities["strict_mode"])
        self.assertIn("导数与函数综合", capabilities["supported_topics"])


if __name__ == "__main__":
    unittest.main()
