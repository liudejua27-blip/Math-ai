# Draft OCR Data Flywheel

本文件定义 Math-SEARAG 的草稿纸 OCR 数据飞轮。目标不是简单“接入一个 OCR”，而是让真实学生草稿纸持续改进首错定位、Step Alignment 和 VerifierTrace。

## 为什么需要数据飞轮

普通拍照搜题只追求把题干识别出来。Math-SEARAG 要识别的是学生的真实解题过程，因此必须保存：

- 原始图片或图片引用：用于追溯版面、字迹、公式位置。
- raw crop refs：保存 block、line、formula 的裁剪引用，便于后续人工标注和错误分析。
- OCR 初始结果：包括 `pageBlocks -> lineItems -> formulaItems -> confidence`。
- 学生确认结果：学生逐行修改后的题干、步骤和 LaTeX。
- 诊断结果：尤其是 `predictedFirstWrongStep` 和后续人工确认的 `confirmedFirstWrongStep`。
- 噪声标签：统计哪类 OCR 噪声最容易造成首错误判。

## 当前落地

数据库新增 `DraftOCRSample` 表：

- `rawResultJson`：保存原始 `DraftOCRResult`。
- `confirmedResultJson`：保存学生确认后的结果。
- `rawCropRefsJson`：保存 block/line/formula 的裁剪引用。
- `lowConfidenceItemsJson`：保存低置信 OCR 项。
- `editSummaryJson`：记录学生改了多少行、题干和步骤是否被修改。
- `issueStatsJson`：记录 `spacedLatex`、`fullWidthSymbol`、`stepIndexNoise`、`deltaOrInequalityNoise`、`geometryReferenceNoise` 等问题。
- `diagnosisSessionId` 和 `predictedFirstWrongStep`：把 OCR 样本接到 MathDiagnosisResult。

前端确认编辑器会把 OCR 样本 ID 写入输入内容：

```text
【OCR样本ID】
...
```

系统 prompt 要求 `diagnoseMathThinking` 透传 `draftOCRSampleId`，从而把一次草稿纸识别、一次学生确认和一次首错定位绑定到同一个样本。

## 评测闭环

`lib/evaluation/ocr-diagnosis-dataset.ts` 使用“脏 raw OCR + 干净 confirmed 文本”的结构：

- raw OCR 行保留空格公式、全角符号、步骤编号、几何引用等噪声。
- confirmed 文本模拟学生确认后的干净题干与步骤。
- 每个样本带 `noiseTags`。

`lib/evaluation/ocr-diagnosis-runner.ts` 输出：

- `firstWrongStepAccuracy`
- `atomRecall`
- `issueBreakdown`

`issueBreakdown` 会按噪声类型统计首错失败和错因失败。后续接入真实草稿纸后，优先优化失败率最高的噪声类型。

## GitHub 项目借鉴

- [Surya](https://github.com/datalab-to/surya)：借鉴版面分析、阅读顺序、多语言 OCR、表格/手写文档结构能力，用于把草稿纸拆成稳定的 block、line、formula。
- [olmOCR](https://github.com/allenai/olmocr)：借鉴 PDF/PNG/JPEG 到 clean Markdown 的线性化思路，特别是公式、表格、手写和复杂版式场景。

这些项目用于 OCR 与版面解析层；首错定位仍由 Math-SEARAG 的 Step Alignment、VerifierTrace 和数学 verifier 决定，避免把 OCR 结果直接当成数学判断。

## 下一步

1. 收集真实草稿纸样本，按年级、题型、字迹清晰度、拍摄角度分桶。
2. 在确认编辑器中增加“这一步实际第一错步是？”的轻量标注入口。
3. 把 `confirmedFirstWrongStep` 回写 `DraftOCRSample`。
4. 每周跑 `ocr-diagnosis` 评测，生成噪声类型失败榜。
5. 将高失败噪声反哺 OCR prompt、公式归一化、Step Alignment 容错规则和 verifier claim 拆分。
