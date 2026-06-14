# Math-SEARAG 开源升级清单 2026-06-13

本清单用于把外部开源项目的优势能力改造成 Math-SEARAG 高中数学思维导师的本地能力。原则是：优先 TypeScript-first 适配；重模型、OCR、Lean verifier 保留为 Python/外部服务；不把第三方仓库大段源码直接混入产品代码。

## P0：马上进入产品主线

| 项目 | 主要优点 | 已适配/建议适配到 Math-SEARAG |
| --- | --- | --- |
| Pix2Text | 混合文字和数学公式 OCR，适合草稿纸题干、公式、步骤识别。 | 作为 DraftOCRResult 的上游引擎：`pageBlocks -> lineItems -> formulaItems -> confidence -> rawImageCrop`。低置信结果必须进入确认编辑器。 |
| PaddleOCR | 中文 OCR、文本检测、行识别成熟，适合中文题干和手写批注。 | 放进 Python OCR service，负责中文题干、步骤文字、全角符号和行序识别。 |
| LaTeX-OCR / pix2tex | 图片公式转 LaTeX 能力强，适合作为公式 crop 的专门识别器。 | 给每个 formulaItem 生成 LaTeX candidate，学生确认后再进入 Step Alignment。 |
| OpenR | process supervision、step-aware verifier 思路强。 | 已改写成本地 `process-supervision-calibration.ts`：保留多个首错候选，按 margin、OCR 噪声、条件遗漏、等价变形信号校准置信度。 |
| langchain-ai/agent-chat-ui | 工具调用、thread state、interrupt、review/resume、artifact side panel 的交互思路成熟。 | 已适配为 assistant-ui 风格 `AgentProcessRibbon`：展示 Step Alignment、Tool Calls、VerifierTrace、Review/Resume，但不展示模型隐藏思维链。 |
| OpenR / Safe / LeanAgent / agent-chat-ui | 多候选排序、claim-level verification、可观察工具结果。 | 已改写为 `solution-method-planner.ts`：每题诊断后输出 2-3 种可检查解法，并标注推荐解法、最快解法、风险点和验证重点。 |

## P1：作为强能力升级

| 项目 | 主要优点 | 建议适配 |
| --- | --- | --- |
| LeanAgent / LeanDojo | 检索增强 theorem proving、动态知识库、课程式 verifier 提升。 | 只作为重型 formal review tier：参数恒成立、复杂证明、归纳、圆锥曲线条件转化的高置信复核。 |
| Safe | step-aware formal verification 框架值得借鉴。 | 仅借鉴“每一步转成 claim 再验证”的结构。许可证未确认前不复制源码。 |
| MathVista / MathVerse / MATH-Vision | 视觉数学 benchmark 和图形理解评测体系。 | 用于 Geometry Lab、草稿图、立体几何图上讲解的评测标准，不直接复制数据集进产品。 |

## P2：后续商业化增强

| 项目/方向 | 主要优点 | 建议适配 |
| --- | --- | --- |
| Surya OCR | 版面分析、阅读顺序、多语言 OCR。 | 用于整页草稿纸布局解析，补 Pix2Text/PaddleOCR 的阅读顺序问题。 |
| olmOCR | PDF/PNG/JPEG 到 clean Markdown，支持复杂版面。 | 用于试卷、PDF、长文档题库解析，不作为第一轮草稿纸 MVP 主引擎。 |
| Prover-Agent | informal reasoning + Lean feedback + auxiliary lemma 思路。 | 用于高级题复核和证明题辅助引理生成。 |

## 已落地代码

- `lib/ai/open-source-capability-registry.ts`
  - 记录项目、license、能力区、优先级、可借鉴能力、适配方式、风险说明。
- `lib/ai/process-supervision-calibration.ts`
  - 借鉴 OpenR 的 process supervision 思路，改写为本地首错候选校准器。
- `lib/ai/step-verifier-engine.ts`
  - 已接入 process-supervision 校准结果，不再只依赖单一 strict gate 分数。
- `lib/ai/solution-method-planner.ts`
  - 借鉴 OpenR 的候选排序、Safe/LeanAgent 的 claim-level 验证纪律、agent-chat-ui 的工具结果可观察性，生成推荐解法和最快解法。
- `components/assistant-ui/agent-process-ribbon.tsx`
  - 借鉴 agent-chat-ui 的过程可观察性，以 assistant-ui 风格展示 agent 运行阶段。

## 下一步建议

1. OCR 数据飞轮：保存 raw crop、OCR candidate、学生修改记录、最终诊断结果。
2. Step Alignment 标注回流：把低 margin 或 OCR 噪声样本进入人工标注队列。
3. Lean review tier：先只生成 FormalReviewPlan，不默认执行 Lean。
4. Geometry Lab benchmark：以 MathVista/MathVerse/MATH-Vision 的任务分类建立本地 50 题视觉几何评测集。
