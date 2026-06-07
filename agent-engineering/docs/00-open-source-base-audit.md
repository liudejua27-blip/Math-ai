# 开源 Agent 基座审计

日期：2026-06-05

## 已下载基座

| 用途 | 仓库 | GitHub stars | 本地路径 | 当前提交 |
| --- | --- | ---: | --- | --- |
| 后端 agent 基座 | QwenLM/Qwen-Agent | 16,480 | `opensource-bases/qwen-agent` | `31a4d36d123688581a9e9744427272b33ce940e0` |
| 前端 chat/agent UI 基座 | vercel/ai-chatbot | 20,446 | `opensource-bases/vercel-ai-chatbot` | `2becdb4a56e7683ae08aef927cec1c6c52dfad5e` |
| Agent 工作台参考 | XingYu-Zhong/DeepSeek-GUI | 1,604 | `opensource-bases/deepseek-gui` | `e730a8c` |

## 为什么这样选

Qwen-Agent 是真实 agent 框架，README 明确包含 tool usage、planning、memory、RAG、Code Interpreter、Custom Assistant 等能力，并提供 `qwen_agent.agents.Assistant` 作为可复用 agent 入口。它满足用户要求的“不要自己编写 agent，去 GitHub 下载热门 agent 后改造”。

Vercel AI Chatbot 是 Next.js + AI SDK 的开源聊天应用模板，已包含 `components/ai-elements`、AI SDK v6、工具调用、持久化、认证和文档/代码 artifact 能力。它满足前端“下载 agent/chatbot 基座再美化”的要求。

DeepSeek GUI 是面向 agent 的本地工作台，适合参考三栏布局、runtime 事件可观察性、工具调用状态、审批/拒绝状态和右侧 Inspector。它是 Electron 桌面应用，本项目只参考产品形态和架构边界，不复制 Electron/Kun runtime。

## 改造边界

- 不修改 `opensource-bases/` 里的原始克隆仓库。
- 后端改造只在 `agent-engineering/backend/` 新增 Qwen-Agent `Assistant` 配置和工具挂载。
- 前端改造复制到 `agent-engineering/frontend/` 后进行主题、prompt、工具和文案修改。
- 本地数学诊断工具调用既有 `math-own/backend/compute_engine.py`，不把示例结果包装成真实实验结果。
- DeepSeek GUI、DeepTutor、MathCrew、Manim、GeoGebra 等只进入来源审计和架构参考；商业产品代码优先自研或使用许可明确允许的实现。

## 候选但未采用

| 仓库 | stars | 未采用原因 |
| --- | ---: | --- |
| Significant-Gravitas/AutoGPT | 184,782 | 体量大，产品方向偏通用自治任务，不如 Qwen-Agent 适合数学工具/RAG 改造。 |
| langgenius/dify | 144,015 | 生产工作流平台较重，适合部署平台，不适合当前快速形成“数学思维教练”代码骨架。 |
| microsoft/autogen | 58,717 | 多 agent 编排能力强，但当前 MVP 更需要单个可控 Assistant + 数学诊断工具。 |
| crewAIInc/crewAI | 52,890 | 多角色协作框架，当前首版不需要复杂团队式 agent。 |
