# Learning Agent 工程实施路线

日期：2026-06-06

## 第 1-2 周：SocraticPolicyEngine + VerifierTrace

交付：

- `SocraticPolicyEngine.ts`
- `VerifierTrace` schema
- 诊断结果加入 `verifierTraces`
- 诊断卡显示验证路径

验收：

- 无学生步骤时不做错因诊断。
- 有学生步骤时先追问和定位第一断点。
- 失败 claim 必须有 VerifierTrace。

## 第 3-4 周：LearnerMemoryEngine

交付：

- `AtomMemory` schema
- `TopicMemory` schema
- `StrategyMemory` schema
- 每次诊断更新画像
- 学生画像页 v0.1

验收：

- 能显示 A07 等错因的复发率。
- 能显示同因变式迁移率。
- 能推荐下一组训练。

## 第 5-6 周：VisualEvidencePipeline + FormulaEvidence

交付：

- `FormulaEvidence` schema
- `VisualEvidenceObject` schema
- 低置信度确认 UI
- MPES v1.0

验收：

- 公式上下标、根号、分母低置信度可确认。
- 几何关系可确认。
- confirmed evidence 才能进入正式诊断。

## 第 7-8 周：MathCognitiveGraph 2.0

交付：

- `ProblemGraph`
- `ReasoningGraph`
- `LearnerGraph`
- `GraphRecommendation`

验收：

- 能解释为什么推荐这道变式。
- 能解释为什么进入 Geometry Lab。
- 能解释为什么认为某个 atom 是复发错因。

## 第 9-12 周：论文 Pilot + 产品内测

交付：

- 100 题 pilot。
- 2 名老师标注。
- 5-7 个 baseline。
- 30 名学生内测。
- 论文实验表 v0.1。

验收：

- First Wrong Step Accuracy。
- Misconception Atom Accuracy。
- Self-Repair Rate。
- Variant Transfer Rate。
- Teacher Agreement。

## 工程模块目录建议

```text
agent-engineering/frontend/lib/learning-agent/
  socratic-policy-engine.ts
  learner-memory-types.ts
  learner-memory-engine.ts
  verifier-trace-types.ts
  remediation-loop-engine.ts

agent-engineering/frontend/lib/evidence/
  formula-evidence-types.ts
  visual-evidence-types.ts
  mpes-types.ts

agent-engineering/frontend/components/learner-memory/
  learner-profile-page.tsx
  atom-memory-panel.tsx
  topic-memory-panel.tsx
  weekly-plan-panel.tsx

agent-engineering/frontend/components/visual-evidence/
  visual-evidence-confirmation.tsx
  formula-token-confirmation.tsx
```
