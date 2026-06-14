from __future__ import annotations

from dataclasses import asdict, dataclass
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
    engine: str = "unknown"
    latex: str | None = None


@dataclass(frozen=True)
class EngineReport:
    id: str
    label: str
    status: str
    detail: str


DEFAULT_OCR_ENGINES = ("pix2text", "paddleocr", "latex_ocr")
LAYOUT_ENGINE_REPORTS = (
    EngineReport(
        "marker",
        "Marker",
        "planned",
        "Planned for full-page document/layout conversion after draft OCR is stable.",
    ),
    EngineReport(
        "surya",
        "Surya",
        "planned",
        "Planned for reading order, line detection, and layout verification.",
    ),
    EngineReport(
        "olmocr",
        "olmOCR",
        "planned",
        "Planned for page-to-Markdown OCR fallback and benchmark comparison.",
    ),
)


def recognize_draft(payload: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = payload or {}
    if os.environ.get("MATH_DRAFT_OCR_MOCK") == "true":
        return build_result(
            lines=[
                OCRLine("已知函数 f(x)=xlnx-ax，求参数 a 的取值范围。", 0.91, engine="pix2text"),
                OCRLine("1. 令 f'(x)=lnx+1-a=0，得到 x=e^(a-1)。", 0.88, engine="paddleocr"),
                OCRLine("2. 所以函数一定有极小值，直接代入。", 0.74, engine="paddleocr"),
                OCRLine("f'(x)=\\ln x+1-a", 0.86, engine="latex_ocr", latex="f'(x)=\\ln x+1-a"),
            ],
            source="paddleocr_mock",
            warnings=["Mock OCR mode is enabled."],
            engine_reports=[
                EngineReport("mock", "Mock OCR", "active", "Mock draft OCR returned deterministic sample lines."),
                EngineReport("pix2text", "Pix2Text", "completed", "Mocked as mixed text/formula OCR engine."),
                EngineReport("paddleocr", "PaddleOCR", "completed", "Mocked as Chinese OCR line detector."),
                EngineReport("latex_ocr", "LaTeX-OCR", "completed", "Mocked as formula recognizer."),
                *LAYOUT_ENGINE_REPORTS,
            ],
        )

    if not payload.get("image_base64") and not payload.get("image_url"):
        return {
            "error": "bad_request",
            "message": "Provide image_base64 or image_url for draft OCR.",
        }

    image_path = materialize_image(payload)
    lines, engine_reports = run_hybrid_ocr(image_path)
    if not lines:
        return build_result(
            lines=[],
            source="unavailable",
            warnings=build_engine_warnings(engine_reports),
            engine_reports=[*engine_reports, *LAYOUT_ENGINE_REPORTS],
            status="failed",
        )

    return build_result(
        lines=dedupe_lines(lines),
        source="hybrid",
        warnings=build_engine_warnings(engine_reports),
        engine_reports=[*engine_reports, *LAYOUT_ENGINE_REPORTS],
    )


def run_hybrid_ocr(image_path: str) -> tuple[list[OCRLine], list[EngineReport]]:
    engine_names = tuple(
        item.strip()
        for item in os.environ.get("MATH_DRAFT_OCR_ENGINES", ",".join(DEFAULT_OCR_ENGINES)).split(",")
        if item.strip()
    )
    lines: list[OCRLine] = []
    reports: list[EngineReport] = []
    for engine_name in engine_names:
        runner = {
            "pix2text": run_pix2text,
            "paddleocr": run_paddleocr,
            "latex_ocr": run_latex_ocr,
        }.get(engine_name)
        if runner is None:
            reports.append(EngineReport(engine_name, engine_name, "planned", "Engine is not wired into the draft OCR orchestrator yet."))
            continue
        try:
            engine_lines = runner(image_path)
            lines.extend(engine_lines)
            reports.append(
                EngineReport(
                    engine_name,
                    engine_label(engine_name),
                    "completed" if engine_lines else "unavailable",
                    f"Returned {len(engine_lines)} OCR line(s).",
                )
            )
        except ImportError:
            reports.append(
                EngineReport(
                    engine_name,
                    engine_label(engine_name),
                    "unavailable",
                    install_hint(engine_name),
                )
            )
        except Exception as exc:  # pragma: no cover - defensive optional integrations
            reports.append(
                EngineReport(
                    engine_name,
                    engine_label(engine_name),
                    "failed",
                    f"{engine_label(engine_name)} failed: {exc}",
                )
            )
    return lines, reports


def run_pix2text(image_path: str) -> list[OCRLine]:
    try:
        from pix2text import Pix2Text  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional package
        raise ImportError from exc

    model = Pix2Text()
    if hasattr(model, "recognize"):
        raw_result = model.recognize(image_path)
    else:  # pragma: no cover - compatibility with possible callable versions
        raw_result = model(image_path)
    texts = extract_texts(raw_result)
    return [OCRLine(text=text, confidence=0.8, engine="pix2text") for text in texts if text.strip()]


def run_paddleocr(image_path: str) -> list[OCRLine]:
    try:
        from paddleocr import PaddleOCR  # type: ignore
    except ImportError as exc:  # pragma: no cover - depends on optional package
        raise ImportError from exc

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
                lines.append(OCRLine(text=text, confidence=confidence, box=box_from_points(box_points), engine="paddleocr"))
    return lines


def run_latex_ocr(image_path: str) -> list[OCRLine]:
    try:
        from PIL import Image  # type: ignore
        from pix2tex.cli import LatexOCR  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional package
        raise ImportError from exc

    model = LatexOCR()
    latex = str(model(Image.open(image_path))).strip()
    if not latex:
        return []
    return [OCRLine(text=latex, confidence=0.78, engine="latex_ocr", latex=latex)]


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
    engine_reports: list[EngineReport] | None = None,
    status: str | None = None,
) -> dict[str, Any]:
    result_id = f"draft-ocr-{sha256('|'.join(line.text for line in lines).encode('utf-8')).hexdigest()[:12]}"
    line_items = [
        {
            "id": f"line-{index + 1}",
            "order": index + 1,
            "text": line.text,
            "confidence": clamp(line.confidence),
            "engine": line.engine,
            "rawImageCrop": crop_ref(result_id, f"line-{index + 1}"),
            "box": line.box,
            "formulaItems": formula_items_from_text(line.text, index + 1, line.confidence, line.engine, result_id, line.latex),
        }
        for index, line in enumerate(lines)
    ]
    blocks = build_page_blocks(line_items)
    low_confidence_items = collect_low_confidence_items(blocks)
    confidence = compute_average_confidence(line_items)
    computed_status = "needs_confirmation" if confidence < LOW_CONFIDENCE_THRESHOLD or low_confidence_items else "completed"
    return {
        "id": result_id,
        "source": source,
        "status": status or computed_status,
        "pageBlocks": blocks,
        "confidence": confidence,
        "engineReports": [asdict(report) for report in engine_reports or []],
        "lowConfidenceItems": low_confidence_items,
        "extractedProblemText": extract_problem_text(blocks),
        "extractedStudentSteps": extract_student_steps(blocks),
        "requiresStudentConfirmation": status == "failed" or confidence < LOW_CONFIDENCE_THRESHOLD or bool(low_confidence_items),
        "confirmationPrompt": "请核对 OCR 识别出的题干、步骤和公式；低置信内容确认前不能进入自动诊断。",
        "warnings": warnings,
        "dataFlywheel": {
            "sampleId": result_id,
            "rawCropCount": len(line_items) + sum(len(line.get("formulaItems", [])) for line in line_items),
            "lowConfidenceCount": len(low_confidence_items),
            "issueTags": ["draft_ocr", "function_sample"] if source != "unavailable" else ["draft_ocr_unavailable"],
        },
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
                "rawImageCrop": crop_ref("page", f"block-{index + 1}"),
                "box": line.get("box"),
                "lineItems": [line],
            }
        )
    return blocks


def formula_items_from_text(text: str, line_order: int, confidence: float, engine: str, result_id: str, latex: str | None = None) -> list[dict[str, Any]]:
    if not looks_like_formula(text):
        return []
    return [
        {
            "id": f"formula-{line_order}-1",
            "latex": latex or normalize_formula_text(text),
            "text": text,
            "confidence": clamp(confidence),
            "engine": engine,
            "rawImageCrop": crop_ref(result_id, f"formula-{line_order}-1"),
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


def crop_ref(result_id: str, item_id: str) -> str:
    return f"crop://draft-ocr/{result_id}/{item_id}"


def clamp(value: float) -> float:
    return max(0.0, min(1.0, round(float(value), 4)))


def extract_texts(raw_result: Any) -> list[str]:
    if raw_result is None:
        return []
    if isinstance(raw_result, str):
        return [line.strip() for line in raw_result.splitlines() if line.strip()]
    if isinstance(raw_result, dict):
        texts: list[str] = []
        for key in ("text", "markdown", "latex"):
            value = raw_result.get(key)
            if isinstance(value, str) and value.strip():
                texts.extend(extract_texts(value))
        for key in ("items", "blocks", "lines", "result"):
            value = raw_result.get(key)
            if value is not None:
                texts.extend(extract_texts(value))
        return texts
    if isinstance(raw_result, (list, tuple)):
        texts: list[str] = []
        for item in raw_result:
            texts.extend(extract_texts(item))
        return texts
    return []


def dedupe_lines(lines: list[OCRLine]) -> list[OCRLine]:
    best_by_key: dict[str, OCRLine] = {}
    for line in lines:
        key = normalize_dedupe_key(line.text)
        if not key:
            continue
        existing = best_by_key.get(key)
        if existing is None or line.confidence > existing.confidence:
            best_by_key[key] = line
    return list(best_by_key.values())


def normalize_dedupe_key(text: str) -> str:
    return re.sub(r"\s+", "", text).lower()


def build_engine_warnings(reports: list[EngineReport]) -> list[str]:
    warnings: list[str] = []
    for report in reports:
        if report.status in {"unavailable", "failed"}:
            warnings.append(report.detail)
    return warnings


def engine_label(engine_name: str) -> str:
    return {
        "pix2text": "Pix2Text",
        "paddleocr": "PaddleOCR",
        "latex_ocr": "LaTeX-OCR",
    }.get(engine_name, engine_name)


def install_hint(engine_name: str) -> str:
    hints = {
        "pix2text": "Pix2Text is not installed. Install pix2text in the Python OCR backend.",
        "paddleocr": "PaddleOCR is not installed. Install paddleocr and paddlepaddle in the Python OCR backend.",
        "latex_ocr": "LaTeX-OCR is not installed. Install pix2tex and Pillow in the Python OCR backend.",
    }
    return hints.get(engine_name, f"{engine_name} is not installed.")
