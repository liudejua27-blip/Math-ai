from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
import base64
import os
import re
from typing import Any


LOW_CONFIDENCE_THRESHOLD = 0.82


@dataclass(frozen=True)
class OCRLine:
    text: str
    confidence: float
    box: dict[str, float] | None = None


def recognize_draft(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    if os.environ.get("MATH_DRAFT_OCR_MOCK") == "true":
        return build_result(
            lines=[
                OCRLine("已知函数 f(x)=xlnx-ax，求参数 a 的取值范围。", 0.91),
                OCRLine("1. 令 f'(x)=lnx+1-a=0，得到 x=e^(a-1)。", 0.88),
                OCRLine("2. 所以函数一定有极小值，直接代入。", 0.74),
            ],
            source="paddleocr_mock",
            warnings=["Mock OCR mode is enabled."],
        )

    if not payload.get("image_base64") and not payload.get("image_url"):
        return {
            "error": "bad_request",
            "message": "Provide image_base64 or image_url for draft OCR.",
        }

    try:
        lines = run_paddleocr(payload)
    except ImportError:
        return {
            "error": "draft_ocr_unavailable",
            "message": "PaddleOCR is not installed. Install paddleocr and paddlepaddle in the Python OCR backend.",
        }
    except Exception as exc:  # pragma: no cover - defensive service boundary
        return {
            "error": "draft_ocr_unavailable",
            "message": f"PaddleOCR failed: {exc}",
        }

    return build_result(lines=lines, source="paddleocr", warnings=[])


def run_paddleocr(payload: dict[str, Any]) -> list[OCRLine]:
    try:
        from paddleocr import PaddleOCR  # type: ignore
    except ImportError as exc:  # pragma: no cover - depends on optional package
        raise ImportError from exc

    image_path = materialize_image(payload)
    ocr = PaddleOCR(use_angle_cls=True, lang="ch", show_log=False)
    raw_result = ocr.ocr(image_path, cls=True)
    lines: list[OCRLine] = []
    for page in raw_result or []:
        for item in page or []:
            if len(item) < 2:
                continue
            box_points, text_payload = item[0], item[1]
            if not text_payload:
                continue
            text = str(text_payload[0]).strip()
            confidence = float(text_payload[1] or 0)
            if text:
                lines.append(OCRLine(text=text, confidence=confidence, box=box_from_points(box_points)))
    return lines


def materialize_image(payload: dict[str, Any]) -> str:
    image_base64 = payload.get("image_base64")
    if image_base64:
        data = base64.b64decode(str(image_base64))
        digest = sha256(data).hexdigest()[:16]
        extension = extension_from_mime(str(payload.get("mime_type") or "image/png"))
        path = os.path.join(os.getcwd(), f".draft_ocr_{digest}{extension}")
        with open(path, "wb") as handle:
            handle.write(data)
        return path
    image_url = str(payload.get("image_url") or "")
    if image_url.startswith("http://") or image_url.startswith("https://"):
        return image_url
    raise ValueError("Unsupported image_url. Use http(s) URL or image_base64.")


def build_result(
    *,
    lines: list[OCRLine],
    source: str,
    warnings: list[str],
) -> dict[str, Any]:
    line_items = [
        {
            "id": f"line-{index + 1}",
            "order": index + 1,
            "text": line.text,
            "confidence": clamp(line.confidence),
            "box": line.box,
            "formulaItems": formula_items_from_text(line.text, index + 1, line.confidence),
        }
        for index, line in enumerate(lines)
    ]
    blocks = build_page_blocks(line_items)
    low_confidence_items = collect_low_confidence_items(blocks)
    confidence = compute_average_confidence(line_items)
    return {
        "id": f"draft-ocr-{sha256('|'.join(item['text'] for item in line_items).encode('utf-8')).hexdigest()[:12]}",
        "source": source,
        "status": "needs_confirmation" if confidence < LOW_CONFIDENCE_THRESHOLD or low_confidence_items else "completed",
        "pageBlocks": blocks,
        "confidence": confidence,
        "lowConfidenceItems": low_confidence_items,
        "extractedProblemText": extract_problem_text(blocks),
        "extractedStudentSteps": extract_student_steps(blocks),
        "requiresStudentConfirmation": confidence < LOW_CONFIDENCE_THRESHOLD or bool(low_confidence_items),
        "confirmationPrompt": "请核对 OCR 识别出的题干、步骤和公式；低置信内容确认前不能进入自动诊断。",
        "warnings": warnings,
    }


def build_page_blocks(line_items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    for index, line in enumerate(line_items):
        text = line["text"]
        block_type = "student_step" if re.match(r"^\s*(\d+[\.\、)]|第.+步)", text) else "problem"
        if index > 0 and block_type == "problem":
            block_type = "scratch"
        blocks.append(
            {
                "id": f"block-{index + 1}",
                "type": block_type,
                "order": index + 1,
                "text": text,
                "confidence": line["confidence"],
                "box": line.get("box"),
                "lineItems": [line],
            }
        )
    return blocks


def formula_items_from_text(text: str, line_order: int, confidence: float) -> list[dict[str, Any]]:
    if not looks_like_formula(text):
        return []
    return [
        {
            "id": f"formula-{line_order}-1",
            "latex": normalize_formula_text(text),
            "text": text,
            "confidence": clamp(confidence),
        }
    ]


def looks_like_formula(text: str) -> bool:
    return bool(re.search(r"[=+\-*/^]|ln|sin|cos|tan|√|∠|⊥|∥|[a-zA-Z]\(", text))


def normalize_formula_text(text: str) -> str:
    return (
        text.replace("（", "(")
        .replace("）", ")")
        .replace("＋", "+")
        .replace("－", "-")
        .replace("×", r"\times ")
        .replace("÷", r"\div ")
    )


def collect_low_confidence_items(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for block in blocks:
        if block["confidence"] < LOW_CONFIDENCE_THRESHOLD:
            items.append(
                {
                    "id": block["id"],
                    "kind": "block",
                    "confidence": block["confidence"],
                    "reason": "识别置信度低，需要学生确认。",
                }
            )
        for line in block["lineItems"]:
            for formula in line.get("formulaItems", []):
                if formula["confidence"] < LOW_CONFIDENCE_THRESHOLD:
                    items.append(
                        {
                            "id": formula["id"],
                            "kind": "formula",
                            "confidence": formula["confidence"],
                            "reason": "公式识别置信度低，需要核对 LaTeX。",
                        }
                    )
    return items


def extract_problem_text(blocks: list[dict[str, Any]]) -> str:
    return "\n".join(block["text"] for block in blocks if block["type"] == "problem").strip()


def extract_student_steps(blocks: list[dict[str, Any]]) -> str:
    return "\n".join(block["text"] for block in blocks if block["type"] in {"student_step", "scratch"}).strip()


def compute_average_confidence(line_items: list[dict[str, Any]]) -> float:
    if not line_items:
        return 0
    return round(sum(float(item["confidence"]) for item in line_items) / len(line_items), 4)


def box_from_points(points: Any) -> dict[str, float] | None:
    if not points:
        return None
    xs = [float(point[0]) for point in points]
    ys = [float(point[1]) for point in points]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    return {"x": min_x, "y": min_y, "width": max_x - min_x, "height": max_y - min_y}


def extension_from_mime(mime_type: str) -> str:
    if mime_type == "image/jpeg":
        return ".jpg"
    if mime_type == "image/webp":
        return ".webp"
    return ".png"


def clamp(value: float) -> float:
    return max(0.0, min(1.0, round(float(value), 4)))
