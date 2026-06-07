# Math-SEARAG Agent Engineering

本目录是正式工程化路线，不再只是旧版 Qwen-Agent + Vercel Chatbot 改造实验。新版目标是承接“中国高中数学思维教练”的核心 Agent、WebApp 和可视化讲解能力。

## 当前定位

- `backend/`：Qwen-Agent 兼容层、Python 数学验证微服务、后续 OCR/几何/SymPy 能力。
- `frontend/`：Next.js 学习工作台，承接 TypeScript 核心 workflow、tool calling、思维图谱、图上讲解、3D 几何实验室、错因档案。
- `docs/`：工程设计、开源来源审计、前端设计说明。

## 新版工程目标

1. 用 TypeScript/Vercel AI SDK 统一管理 agent、tool calling、workflow 和 UI。
2. 保留 `math-own/backend/compute_engine.py` 作为可选数学验证微服务，而不是产品主流程依赖。
3. 把简单规则、错因原子、思维图谱协议迁入 TypeScript。
4. 增加 `visual_spec` 输出，让 Agent 可以生成受控的 SVG/Three.js/GSAP 讲解脚本。
5. 增加 durable workflow：解析、确认、检索、解题、验证、诊断、可视化、变式训练分步执行。
6. 增加学生画像：错因原子、题型掌握度、同因变式迁移率。
7. 增加商业版安全边界：低置信度降级、未成年人数据保护、教师审核。

## 开源来源

旧底座：

- `../opensource-bases/qwen-agent`
- `../opensource-bases/vercel-ai-chatbot`

新版研究候选：

- `../opensource-bases/education-agent-candidates/DeepTutor`
- `../opensource-bases/education-agent-candidates/MathCrew`
- `../opensource-bases/education-agent-candidates/geogebra-integration`
- `../opensource-bases/education-agent-candidates/manim`
- `../opensource-bases/education-agent-candidates/fireworks-tech-graph`
- `../opensource-bases/education-agent-candidates/nature-skills`
- `../opensource-bases/education-agent-candidates/Nature-Paper-Skills`

注意：候选库仅作研究和架构参考，商业产品是否能直接使用代码必须看许可证。

## 思维图谱升级

本轮新增 `MathThinkingGraphSpec` 和前端安全 SVG 渲染器。诊断工具会把题目、第一断点、严格门禁、错因原子和同因变式组织成一张可视化思维图，作为后续接入 Fireworks 风格导出、GSAP 高亮动画和 3D 几何讲解的统一底层协议。

## TypeScript-first 迁移

本轮新增 `frontend/lib/ai/math-rules-engine.ts`。前端 workflow 现在先运行 TypeScript 规则引擎，生成题型识别、严格门禁、错因原子、苏格拉底追问、思维图谱和订正卡。Python 服务只作为可选 verifier：可用时补充符号验证证据，不可用时产品仍能完整返回诊断。

## 后端 smoke

```powershell
& 'C:\Users\86152\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' .\backend\math_coach_qwen_agent.py --dry-run
```

## 前端 smoke

```powershell
cd frontend
corepack pnpm install
corepack pnpm exec tsc --noEmit
```

正式接入时建议新增：

```text
MATH_AGENT_BACKEND_URL=http://127.0.0.1:8008
MATH_PYTHON_VERIFIER_ENABLED=true
MATH_REQUIRE_PYTHON_VERIFIER=false
MATH_VISUAL_SPEC_ENABLED=true
MATH_WORKFLOW_MODE=durable
```
