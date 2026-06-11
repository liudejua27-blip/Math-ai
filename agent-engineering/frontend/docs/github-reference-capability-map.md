# GitHub Reference Capability Map

This document records which Math-SEARAG capabilities are inspired by which GitHub projects, what was borrowed conceptually, what was implemented locally, and what still needs improvement.

## Current Position

Math-SEARAG is no longer a generic chat app. It is becoming a browser-based math learning workbench:

- TypeScript-first Next.js workbench.
- Python verifier and OCR toolbox behind server-side adapters.
- Observable MathAgentRuntime with SSE events.
- Student-facing diagnosis loop: draft OCR -> student confirmation -> Step Alignment -> first wrong step -> VerifierTrace -> SocraticPolicy -> LearnerMemory -> variants.

The rule for open-source references is strict: use architecture ideas, interaction patterns, and evaluation concepts; do not copy code into product source without license review.

## Capability Map

| Math-SEARAG capability | GitHub reference | What we use from it | Local implementation |
| --- | --- | --- | --- |
| AI chat/thread experience | [assistant-ui/assistant-ui](https://github.com/assistant-ui/assistant-ui) | Thread-first UI, composer/action separation, runtime-aware tool visibility, reusable assistant primitives | `AgentRunRibbon`, `AgentInspector`, `agent-run-view-model.ts` |
| Browserized agent host | [0xcaff/codex-web](https://github.com/0xcaff/codex-web) | Browser as control plane, backend on controlled machine, reconnectable long-running agent sessions | `browserized-agent-host.ts`, SSE runtime events, browserized host chip |
| Agent planning/tool/memory reference | [QwenLM/Qwen-Agent](https://github.com/QwenLM/Qwen-Agent) | Tool usage, planning, memory, RAG, assistant backend structure | TypeScript workflow as product runtime, Qwen-Agent kept as backend adapter reference |
| Frontend base | Vercel AI Chatbot / AI SDK ecosystem | Next.js chat shell, streaming, tool calling, model gateway workflow | `ChatShell`, `diagnoseMathThinking`, Vercel AI SDK route/tool flow |
| Mixed draft OCR | [breezedeus/Pix2Text](https://github.com/breezedeus/pix2text) | Layout/text/formula OCR, image-to-Markdown/LaTeX idea, Mathpix-like open source direction | `draft_ocr.py` hybrid chain, `DraftOCRResult`, OCR confirmation card |
| Chinese text OCR | [PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Chinese OCR, line detection, robust text extraction | Python `/api/draft-ocr` PaddleOCR runner |
| Formula OCR | [lukas-blecher/LaTeX-OCR](https://github.com/lukas-blecher/LaTeX-OCR) | Formula image to LaTeX conversion | `latex_ocr` optional runner in OCR chain |
| Full-page document parsing | [datalab-to/marker](https://github.com/datalab-to/marker) | PDF/image to Markdown, layout/table/formula extraction direction | Planned engine report and adapter slot |
| Layout/reading order OCR | [datalab-to/surya](https://github.com/datalab-to/surya) | Reading order, layout detection, OCR validation | Planned engine report and adapter slot |
| Page OCR benchmark/fallback | [allenai/olmocr](https://github.com/allenai/olmocr) | Full page OCR to structured text/Markdown, complex document fallback | Planned engine report and adapter slot |
| Formal proof feedback loops | [lean-dojo/LeanAgent](https://github.com/lean-dojo/LeanAgent) | Search, proof feedback, verifier-guided correction | Future VerifierTrace and proof-style evaluation inspiration |
| Prover-style agent loop | [kAIto47802/Prover-Agent](https://github.com/kAIto47802/Prover-Agent) | Generate -> verify -> repair loop | Future strict verifier and math reasoning eval reference |
| Multimodal math eval | [ZrrSkywalker/MathVerse](https://github.com/ZrrSkywalker/MathVerse) | Evaluate visual mathematical reasoning beyond text-only answers | Future OCR/geometry/multimodal eval set reference |
| Math vision benchmark | [mathllm/MATH-V](https://github.com/mathllm/MATH-V) | Geometry/diagram/math vision benchmark thinking | Future Geometry Lab and draft OCR benchmark reference |

## Feature Status

| Area | Status | What works now | What still needs work |
| --- | --- | --- | --- |
| Workbench UI | Strong Alpha | Three-column workbench, resizable panels, runtime ribbon, Inspector, mobile drawer | More polished empty states, onboarding, keyboard shortcuts, parent/teacher report surfaces |
| Runtime observability | Strong Alpha | SSE live events, timeline, runtime controls, trace replay concept | Durable run storage, reconnect after server restart, real approval records |
| Draft OCR | Alpha | Upload/paste image, OCR confirmation card, Pix2Text/PaddleOCR/LaTeX-OCR engine chain, low-confidence confirmation gate | Install and benchmark real engines, crop storage policy, handwriting-specific dataset, line-to-step correction UI |
| Step Alignment | Useful but needs data | Claim-level traces and first wrong step mapping | More handwritten OCR noise tolerance, expression-level alignment, multi-claim split inside a single handwritten line |
| VerifierTrace | Good foundation | TypeScript strict gates, Python verifier adapter, claim traces | More symbolic verification, geometry verifier, parameter-range verifier, external proof-style feedback |
| LearnerMemory | Foundation exists | AtomMemory, recurrence, transferRate, selfRepairRate, weekly report schema | Make memory actively drive next-question recommendation, review schedule, difficulty and solution visibility |
| Geometry Lab | Differentiated prototype | Cube/pyramid labs, scene spec validator, completion writeback | 3D/R3F scenes, GSAP step animation, stronger line-plane angle and dihedral angle flows |
| Commercial readiness | Not ready | Technical MVP and demos pass | Production env, monitoring, rate limits, privacy policy, minor data deletion/export, cost controls |

## Most Important Missing Pieces

1. Durable runtime state  
   `MathAgentRuntime` still uses in-memory run records. Move run state, control actions, and trace events to Redis/Postgres so students can reconnect and continue.

2. OCR benchmark dataset  
   Create a small internal dataset:
   - original draft image
   - OCR result
   - student-corrected text
   - first wrong step
   - teacher-verified diagnosis

3. OCR confirmation editor  
   Current OCR confirmation fills the composer. Next step should allow line-by-line editing:
   - edit problem text
   - edit each student step
   - edit formula LaTeX
   - mark uncertain lines as confirmed

4. Step Alignment under OCR noise  
   OCR output will be messy. Add normalization for:
   - `lnx` vs `ln x`
   - `e^(a-1)` vs `e^{a-1}`
   - missing step numbers
   - duplicated formulas
   - Chinese punctuation and handwritten symbols

5. Evaluation harness for OCR-to-diagnosis  
   Extend existing evals from clean text into image-derived text:
   - OCR confidence accuracy
   - formula extraction accuracy
   - first wrong step after OCR
   - false diagnosis rate when OCR is low confidence

6. Real production controls  
   Add:
   - model cost guardrails
   - upload size and abuse limits
   - image retention policy
   - parent/teacher human-readable report
   - manual review queue for low-confidence/low-trust diagnosis

## Recommended Next Implementation Order

1. OCR confirmation editor: turn `DraftOCRResult.pageBlocks` into editable line cards.
2. Durable runtime: persist run records and SSE trace to Redis/Postgres.
3. OCR eval set: add 20 sample draft cases before adding more OCR engines.
4. Step Alignment OCR mode: align by confirmed line IDs and formula IDs.
5. Geometry Lab 3D P0: one cube line-plane-angle scene and one triangular-pyramid dihedral-angle scene.
6. Parent/teacher weekly report: human-readable only, no technical trace by default.

## License And Product Guardrails

- Treat every GitHub project as a reference until license review is complete.
- Keep OCR engines behind Python adapters; do not expose arbitrary model-generated code to the browser.
- Do not diagnose from low-confidence OCR without student confirmation.
- Keep VerifierTrace visible for trust, but hide technical trace in parent-facing reports unless explicitly requested.
