# 论文 + AI 数学私教项目

当前项目已经从“单题诊断 demo”升级为：

> **Math-SEARAG Learning Agent：面向高中数学思维诊断的可验证、可视化、个性化学习系统。**

它不是“拍照搜题”，也不是“直接给答案”的聊天机器人。核心价值是把学生的错误步骤转化为可定位、可验证、可训练、可长期追踪的数学思维对象。

## 项目主体

| 路径 | 用途 |
| --- | --- |
| `项目整理归档/` | 当前权威文档入口：产品、论文、工程、商业化与资料治理 |
| `agent-engineering/` | 正式工程主体：Next.js、Vercel AI SDK、TypeScript 学习工作流、Geometry Lab |
| `math-own/` | Python verifier/toolbox：SymPy、OCR、几何计算、数值采样等 |
| `math相关论文/` | 文献资料库：AI 教育、RAG、数学推理、多模态数学、形式化验证等 |
| `opensource-bases/` | 开源来源审计和架构参考区，不作为产品源码直接演化 |

## 产品规则

```text
没有学生步骤，不做错因诊断。
有学生步骤，先找第一断点。
不先给完整答案，先给追问、纠偏、订正和迁移训练。
```

## 当前工程方向

前端采用 DeepSeek GUI 式深度工作台：

- 左侧：学生画像、错因原子、训练计划和题型入口。
- 中间：题目、学生步骤、苏格拉底对话、订正卡和同因变式。
- 右侧：Agent Inspector，展示第一错步、严格门禁、VerifierTrace、证据链、画像更新、Geometry Lab 推荐和工具事件时间线。

后端主控采用 TypeScript/Vercel AI SDK：

- TypeScript 管理 agent、tool calling、workflow、错因原子、策略、记忆、图谱协议和 UI。
- Python 只保留为 verifier/toolbox，承担 SymPy、OCR、几何计算、数值采样等 TS 不擅长的能力。
- Geometry Lab 使用白名单 `GeometrySceneSpec`，禁止模型生成任意可执行 JS。

## 核心引擎

1. `SocraticPolicyEngine`：决定追问、提示、订正卡、变式、Geometry Lab、人工复核。
2. `LearnerMemoryEngine`：记录错因复发率、迁移率、自我修正率和掌握度。
3. `VerifierTraceEngine`：为关键数学 claim 生成验证链。
4. `StepAlignmentEngine`：从整体门禁失败精确到学生哪一句、哪一步、哪一个表达式先错。
5. `MathCognitiveGraphEngine`：生成题目图、推理图、学习者图。
6. `StructuredFormulaEvidenceEngine`：管理公式树、空间关系和低置信度 evidence。
7. `RemediationLoopEngine`：完成诊断、追问、订正、变式、迁移、画像闭环。

## 本地验证

```powershell
cd agent-engineering/frontend
corepack pnpm exec tsc --noEmit --incremental false
corepack pnpm run test:ai
corepack pnpm run test:release

cd ..\..\math-own
python -m unittest discover -s tests
```

## 发布准备

发布前阅读：

- `agent-engineering/docs/04-release-readiness.md`
- `agent-engineering/docs/05-education-safety-policy.md`
- `agent-engineering/docs/06-deployment-playbook.md`
- `agent-engineering/docs/07-mvp-kpi-and-30-day-plan.md`

当前最高优先级：

```text
把 DeepSeek 式三栏工作台从预览页变成正式主产品页，
并把已落地的诊断会话、Workbench Events、AtomMemory 和变式记录展示到真实用户历史与学习画像中。
```

GitHub Actions 发布门禁：

```text
.github/workflows/release-gate.yml
```

生产环境严格校验：

```powershell
cd agent-engineering/frontend
corepack pnpm run release:env:strict
```

核心健康检查：

```text
GET /api/health
GET /workbench-preview
GET /geometry-lab
```
