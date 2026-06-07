# 论文 + AI 数学私教项目

当前权威入口：

`项目整理归档/00-当前权威总纲_20260606.md`

## 当前项目主体

本项目已经完成战略迁移：

> 从 **Math-SEARAG 诊断系统** 升级为 **Math-SEARAG Learning Agent：面向高中数学错题诊断的可验证、可视化、个性化引导式学习系统**。

它不是“拍照搜题”，也不是“直接给答案”的聊天机器人。核心价值是把学生错误转化为可定位、可验证、可训练、可长期追踪的思维对象。

## 三条产品硬规则

```text
没有学生步骤，不做错因诊断。
有学生步骤，先找第一断点。
不先给完整答案，先给追问、纠偏、订正和迁移训练。
```

## 当前目录用途

| 路径 | 当前用途 |
| --- | --- |
| `项目整理归档/` | 当前权威文档入口：产品、研究、工程、商业化与文件治理 |
| `agent-engineering/` | 正式工程主体：Next.js/Vercel AI SDK、TypeScript 学习工作流、Geometry Lab |
| `math-own/` | Python verifier/toolbox：SymPy、OCR、几何计算、数值采样 |
| `math相关论文/` | 文献资料库：AI 教育、RAG、数学推理、多模态数学、形式化验证等 |
| `opensource-bases/` | 开源来源审计与参考代码，不作为产品源码直接演化 |

## 当前整合方向

2026-06-07 起，前端形态固定为 DeepSeek GUI 式深度工作台：

- 左侧学习导航：学生画像、错因原子、训练计划和题型入口。
- 中央诊断画布：题目、学生步骤、苏格拉底对话、订正卡和同因变式。
- 右侧 Agent Inspector：第一错步、严格门禁、VerifierTrace、画像更新、Geometry Lab 推荐和工具事件时间线。

几何模块不是娱乐游戏，而是借鉴游戏创作中的 3D 场景、交互镜头、步骤动画和任务反馈，服务高中立体几何理解。

## Learning Agent 2.0 七个引擎

1. `SocraticPolicyEngine`：决定追问、提示、订正卡、变式、Geometry Lab、人工复核。
2. `LearnerMemoryEngine`：长期记录错因复发率、迁移率、自我修正率和掌握度。
3. `VisualEvidencePipeline`：把图像/几何识别结果转成可确认、可审计的 evidence。
4. `VerifierTraceEngine`：为关键数学 claim 生成验证路径。
5. `MathCognitiveGraphEngine`：生成题目图、推理图、学习者图。
6. `StructuredFormulaEvidenceEngine`：管理公式树、空间关系、低置信度 token。
7. `RemediationLoopEngine`：完成诊断、追问、订正、变式、迁移、画像闭环。

## 当前技术路线

- TypeScript/Vercel AI SDK 管理 agent、tool calling、workflow、错因原子、策略、记忆、图谱协议和 UI。
- Python 只保留为 verifier/toolbox：SymPy、OCR、几何计算、数值采样等。
- Geometry Lab 使用 `GeometrySceneSpec` 白名单协议，第一版已落地正方体/三棱锥 12 个关卡；后续再接 Three.js/R3F。
- 论文方向升级为“可验证、可视化、个性化引导式高中数学思维 Agent”，必须补真实数据、双标注、Kappa、baseline、消融和统计检验。

## 本地验证

```powershell
cd agent-engineering/frontend
corepack pnpm exec tsc --noEmit
corepack pnpm exec tsx .\lib\ai\math-rules-engine.test.ts
corepack pnpm exec tsx .\lib\geometry\geometry-levels.test.ts

cd ..\..\math-own
python -m unittest discover -s tests
```
