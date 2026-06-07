# Qwen-Agent Math-SEARAG Adapter

This backend does not implement a new agent class. It adapts the open-source
`QwenLM/Qwen-Agent` `Assistant` agent and mounts one local deterministic tool:
`math_searag_diagnose`.

## Base

- Agent base: `../../opensource-bases/qwen-agent`
- Open-source repo: `https://github.com/QwenLM/Qwen-Agent`
- Local math engine: `../../math-own/backend/compute_engine.py`
- Diagnosis skill: `skills/math-searag/SKILL.md`
- Thinking graph skill: `skills/math-thinking-graph/SKILL.md`

## Smoke

```powershell
python .\math_coach_qwen_agent.py --dry-run
```

The dry run exercises the local Math-SEARAG diagnosis tool without an LLM key.

If your default `python` is Python 3.14 or newer, prefer the bundled runtime:

```powershell
& 'C:\Users\86152\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\math_coach_qwen_agent.py --dry-run
```

## LLM Run

Set one of these:

- `DASHSCOPE_API_KEY`, optionally with `QWEN_MODEL=qwen-plus-latest`
- `QWEN_MODEL_SERVER` for an OpenAI-compatible local Qwen/vLLM/Ollama endpoint

Then run:

```powershell
python .\math_coach_qwen_agent.py --query "请诊断这道导数题的第一处错误。"
```

## Frontend workflow environment

The Next.js frontend is now TypeScript-first. It can run the diagnosis workflow
without this Python backend. This backend is kept as an optional verifier for
symbolic math, OCR, geometry computation, and Qwen-Agent compatibility.

Use these defaults for local development:

```text
MATH_AGENT_BACKEND_URL=http://127.0.0.1:8008
MATH_PYTHON_VERIFIER_ENABLED=true
MATH_REQUIRE_PYTHON_VERIFIER=false
MATH_DIAGNOSIS_MODEL=deepseek/deepseek-v4-flash
MATH_REVIEW_MODEL=deepseek/deepseek-v4-pro
MATH_TEACHING_STYLE=socratic
MATH_VISUAL_MODE=html_card
```

When `MATH_PYTHON_VERIFIER_ENABLED=true`, the workflow tries `/api/analyze` and
merges the Python verification summary into the TypeScript diagnosis. If the
Python service is offline, the product still returns a TypeScript diagnosis
unless `MATH_REQUIRE_PYTHON_VERIFIER=true`.

The workflow route normalizes input, runs the TypeScript rules engine, optionally
merges Python verification, builds Socratic questions, builds a
`MathThinkingGraphSpec`, and returns a safe HTML correction-card spec.
