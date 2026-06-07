# Math-SEARAG Learning Agent 设计

## 定位

产品名：Math-SEARAG Learning Agent / 高中数学思维训练平台

目标不是拍照搜题，也不是把学生带到完整答案，而是把学生的解题过程诊断为可训练、可验证、可追踪的数学思维能力原子。

## 三条硬规则

```text
没有学生步骤，不做错因诊断。
有学生步骤，先找第一断点。
不先给完整答案，先给追问、纠偏、订正和迁移训练。
```

## Learning Agent 七个引擎

| 引擎 | 工程责任 |
| --- | --- |
| `SocraticPolicyEngine` | 决定 request_steps、confirm_evidence、first_wrong_step、socratic_hint、show_correction_card、generate_variant、enter_geometry_lab、human_review |
| `LearnerMemoryEngine` | 维护 AtomMemory、TopicMemory、StrategyMemory、weeklySummary |
| `VisualEvidencePipeline` | 把图像/几何关系转为可确认、可审计 evidence |
| `VerifierTraceEngine` | 为关键数学 claim 生成 verifier trace |
| `MathCognitiveGraphEngine` | 生成 Problem Graph、Reasoning Graph、Learner Graph |
| `StructuredFormulaEvidenceEngine` | 管理公式树、空间关系、低置信度 token 和确认状态 |
| `RemediationLoopEngine` | 管理诊断、追问、订正、变式、迁移、画像更新闭环 |

## 输入合同

- `problemText`：题干文本。
- `studentSteps`：学生分步解题过程；为空时不能做错因诊断。
- `confirmedEvidence`：用户确认过的低置信字段或证据 ID。
- `visualEvidence`：图形/几何/函数图 evidence。
- `formulaEvidence`：LaTeX、公式树、空间关系和置信度。
- `learnerMemory`：学生错因原子、题型和策略记忆。

## 输出合同

- `firstWrongStep`：第一处错误步骤。
- `misconceptionAtoms`：错因原子。
- `evidenceNodes`：证据节点。
- `strictChecks`：TypeScript strict gate。
- `verifierTraces`：关键数学 claim 的验证路径。
- `socraticPolicyDecision`：教学策略决定。
- `thinkingGraph` / `mathCognitiveGraph`：思维/认知图。
- `correctionCard`：订正卡。
- `variants`：同因变式。
- `learnerMemoryDelta`：画像更新。
- `recommendedGeometryLabs`：几何训练推荐。

## VerifierTrace 要求

关键数学结论不能只由 LLM 口头判断。每个高风险 claim 应绑定：

- verifier
- status
- evidenceIds
- failureReason
- confidence

P0 verifier 层级：

1. TypeScript strict gate。
2. Python/SymPy verifier。
3. geometry constraint checker。

## 行为红线

- 没有学生步骤时，不做错因定位。
- 低置信 OCR/公式/图形字段必须先确认。
- 没有 evidence_id 的关键结论不能输出为确定结论。
- `strict_pass=false` 或 `needHumanReview=true` 时，必须提示人工复核或补充条件。
- 不输出“保证提分”“押题”“国内最强已达成”等表达。

## 与论文的连接

Agent 日志要保留：

- `problem_id`
- `prompt_version`
- `model_name`
- `retrieved_evidence_ids`
- `verifier_traces`
- `socratic_policy_mode`
- `first_wrong_step`
- `misconception_atoms`
- `variant_transfer_records`
- `learner_memory_delta`
- `need_human_review`

这些字段会成为论文中 baseline、消融实验、自我修正率、迁移率和教师一致性的可复现证据。
