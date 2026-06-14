import json
import os
import sys
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))

from server import MathCoachHandler  # noqa: E402


class ServerApiTests(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), MathCoachHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.port = self.server.server_address[1]

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def post_analyze(self, payload):
        connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
        connection.request(
            "POST",
            "/api/analyze",
            body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        response = connection.getresponse()
        body = response.read().decode("utf-8")
        connection.close()
        return response.status, json.loads(body)

    def test_analyze_without_student_steps_has_no_first_wrong_error(self):
        status, result = self.post_analyze({
            "problem_text": "已知函数 f(x)=xlnx-ax，求极值。",
            "student_steps": "",
        })
        error_steps = [item for item in result["alignment"] if item["status"] == "error"]
        self.assertEqual(status, 200)
        self.assertEqual(error_steps, [])
        self.assertTrue(result["need_human_review"])

    def test_analyze_with_wrong_steps_returns_diagnosis_fields(self):
        status, result = self.post_analyze({
            "problem_text": "已知函数 f(x)=xlnx-ax 在区间 (0,+∞) 上有极值，求参数 a 的取值范围。",
            "student_steps": "1. 令 f'(x)=lnx+1-a=0，得到 x=e^(a-1)。\n2. 所以函数一定有极小值，直接代入求最小值。",
        })
        self.assertEqual(status, 200)
        self.assertTrue(result["student_coach"]["thought_judgement"]["first_wrong_step"])
        self.assertTrue(result["atoms"])
        self.assertTrue(result["strict_checks"])

    def test_draft_ocr_mock_returns_confirmation_result(self):
        os.environ["MATH_DRAFT_OCR_MOCK"] = "true"
        try:
            connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
            connection.request(
                "POST",
                "/api/draft-ocr",
                body=json.dumps({"image_base64": "mock"}, ensure_ascii=False).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            response = connection.getresponse()
            body = response.read().decode("utf-8")
            connection.close()
        finally:
            os.environ.pop("MATH_DRAFT_OCR_MOCK", None)

        result = json.loads(body)
        self.assertEqual(response.status, 200)
        self.assertTrue(result["pageBlocks"])
        self.assertIn("rawImageCrop", result["pageBlocks"][0])
        self.assertIn("lineItems", result["pageBlocks"][0])
        self.assertIn("rawImageCrop", result["pageBlocks"][0]["lineItems"][0])
        self.assertIn("formulaItems", result["pageBlocks"][0]["lineItems"][0])
        self.assertTrue(result["dataFlywheel"]["rawCropCount"] > 0)
        self.assertTrue(result["requiresStudentConfirmation"])

    def test_draft_ocr_unavailable_returns_engine_reports(self):
        os.environ.pop("MATH_DRAFT_OCR_MOCK", None)
        os.environ["MATH_DRAFT_OCR_ENGINES"] = "missing_engine"
        try:
            connection = HTTPConnection("127.0.0.1", self.port, timeout=5)
            connection.request(
                "POST",
                "/api/draft-ocr",
                body=json.dumps({"image_base64": "ZmFrZQ=="}, ensure_ascii=False).encode("utf-8"),
                headers={"Content-Type": "application/json"},
            )
            response = connection.getresponse()
            body = response.read().decode("utf-8")
            connection.close()
        finally:
            os.environ.pop("MATH_DRAFT_OCR_ENGINES", None)

        result = json.loads(body)
        self.assertEqual(response.status, 200)
        self.assertEqual(result["status"], "failed")
        self.assertTrue(result["engineReports"])
        self.assertTrue(result["requiresStudentConfirmation"])


if __name__ == "__main__":
    unittest.main()
