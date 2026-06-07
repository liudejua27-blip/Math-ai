# 数据治理与 MLOps 评测平台

更新时间：2026-05-15

## 目标

企业级 AI 教育产品不能只靠一次 prompt 调好。必须建立数据、模型、prompt、评测、回流、灰度和回滚体系。

目标：

- 每道题可追溯。
- 每次模型输出可复现。
- 每个版本上线前有评测门禁。
- 失败样本能回流到数据集。
- 论文实验和产品评测使用同一套指标底座。

## 数据资产分层

| 数据集 | 用途 | 是否可进论文 |
| --- | --- | --- |
| Raw Uploads | 用户上传原始数据 | 默认不可，需授权和脱敏 |
| Cleaned Problems | OCR 修正后的题目 | 可在脱敏授权后使用 |
| Gold MPES | 人工复核结构化证据 | 论文核心数据 |
| Evidence Corpus | 教材、定理、公式、例题 | RAG 证据库 |
| Evaluation Set | 固定评测集 | 版本门禁 |
| Failure Set | 失败样本集合 | 回归测试 |
| External Set | 外部公开集 | 泛化验证 |

## 数据版本管理

每个数据集版本必须记录：

- dataset_name
- version
- sample_count
- source_policy
- annotation_guideline_version
- annotator_count
- kappa
- created_at
- changelog

示例：

```json
{
  "dataset_name": "math_error_diagnosis_pilot",
  "version": "v0.2",
  "sample_count": 50,
  "annotation_guideline_version": "mpes_v0.2",
  "kappa": 0.78,
  "split": {"dev": 20, "test": 30}
}
```

## Prompt 与模型版本管理

每次调用保存：

- prompt_id
- prompt_version
- model_provider
- model_name
- decoding_config
- input_schema_version
- output_schema_version
- safety_policy_version

Prompt 不允许直接散落在代码里，应放入版本化配置。

## 自动评测门禁

每次改 prompt、模型、OCR、Schema、路由器，都要跑评测。

| 门禁 | 指标 | 失败动作 |
| --- | --- | --- |
| 正确性 | Answer Accuracy 不下降超过阈值 | 阻止上线 |
| 证据性 | Unsupported Step Rate 不上升 | 阻止上线 |
| 安全性 | Harmful Output Rate 为 0 | 阻止上线 |
| 成本 | 平均单题成本不超过阈值 | 需要审批 |
| 延迟 | P95 不超过阈值 | 灰度或回滚 |
| 格式 | JSON 结构化输出成功率 | 低于阈值阻止上线 |

## 人工评测流程

AI 自动评测不能替代人工评测。建议建立三层评测：

1. 自动评测：格式、证据 ID、SymPy 验证、字符串/表达式等价。
2. 教研评测：答案、步骤、错因原子、变式题质量。
3. 用户评测：学生是否看懂，老师是否认可，家长是否愿意付费。

## 失败样本回流

失败样本分类：

- OCR 错误
- 公式识别错误
- 条件遗漏
- 检索错配
- 路由错误
- LLM 推理跳步
- 验证器误判
- 错因原子误判
- 变式题不可解或答案错
- 内容安全问题

每个失败样本必须进入 failure_set，并绑定根因。

## 线上监控指标

### AI 质量

- JSON 输出成功率
- Evidence 引用率
- Verification Pass Rate
- Low Confidence Rate
- Manual Correction Rate
- User Reported Wrong Rate

### 工程稳定性

- OCR job success rate
- LLM timeout rate
- queue backlog
- P50/P95 latency
- cost per problem
- retry rate

### 学习效果

- 变式题完成率
- 变式题通过率
- 错因复发率
- 周报打开率
- 学生复用率

## 论文实验与产品数据的关系

论文实验必须用冻结版本：

- 冻结数据集版本。
- 冻结 prompt 版本。
- 冻结模型版本。
- 冻结评估脚本版本。
- 冻结随机种子。

产品线上数据可以持续回流，但不能随意混入论文测试集。

## 标注平台需求

企业级标注后台应支持：

- 原图和 OCR 对照。
- 公式 LaTeX 编辑。
- 条件 C、公式 F、图形 G、步骤 S 标注。
- 拖拽建立关系边。
- 错因原子选择。
- 标准路径编辑。
- 冲突复核。
- Kappa 自动计算。
- 导出 gold_schema.jsonl。

## MLOps 里程碑

| 阶段 | 交付物 |
| --- | --- |
| v0.1 | 本地评估脚本、固定 10 题 smoke test |
| v0.2 | 50 题 pilot set、评测报告自动生成 |
| v0.3 | Prompt 版本管理、失败样本回流 |
| v0.4 | 标注后台、Kappa 统计 |
| v1.0 | 线上监控、灰度、回滚、成本看板 |

## 企业级验收

- 任意模型版本上线前能跑固定评测集。
- 任意线上问题能定位到 prompt、模型、输入证据和验证结果。
- 任意失败样本能进入回归测试。
- 论文中的表格能由脚本从冻结日志复现。
