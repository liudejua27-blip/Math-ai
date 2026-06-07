# Math-SEARAG Learning Agent 2.0 战略迁移

日期：2026-06-06

## 1. 迁移结论

项目不再只是“诊断系统”，而是升级为：

> **Math-SEARAG Learning Agent：一个以第一断点诊断为核心、以错因原子记忆为长期画像、以苏格拉底策略为教学行为、以 VerifierTrace 为可信基础、以视觉证据链和认知图谱为解释层、以同因变式和 Geometry Lab 为迁移训练的高中数学学习系统。**

## 2. 总体架构

```text
题目 + 学生步骤 + 图像/公式
        ↓
Structured Evidence / MPES
        ↓
First Wrong Step Diagnosis
        ↓
VerifierTrace + Strict Gate
        ↓
Misconception Atom
        ↓
SocraticPolicyEngine 决定怎么引导
        ↓
MathCognitiveGraph 展示推理路径
        ↓
LearnerMemory 更新学生画像
        ↓
同因变式 / Geometry Lab / 复习计划
```

## 3. 七个核心引擎

### 3.1 SocraticPolicyEngine

负责决定教学行为，而不是数学计算：

- 没有学生步骤时，请求步骤。
- 图形证据低置信度时，请求确认。
- 诊断低置信度时，进入人工复核。
- 有第一错步时，先追问和纠偏，不直接给完整答案。
- 错因稳定后，生成订正卡、同因变式或 Geometry Lab 推荐。

### 3.2 LearnerMemoryEngine

三层记忆：

- `AtomMemory`：错因原子复发率、迁移率、自我修正率、掌握度。
- `TopicMemory`：题型/知识点掌握状态。
- `StrategyMemory`：学生是否跳过定义域、分类讨论、端点比较、几何约束等策略性检查。

### 3.3 VisualEvidencePipeline

原则：

```text
VLM/OCR 可以识别，但不能最终裁判。
视觉信息必须变成 evidence。
低置信度图形关系必须确认。
图上讲解必须绑定 evidence_id。
```

### 3.4 VerifierTraceEngine

三层验证：

- Level 1：TypeScript strict gate。
- Level 2：Python/SymPy verifier。
- Level 3：Geometry/proof verifier，后续可接 Lean/SMT/几何符号引擎。

### 3.5 MathCognitiveGraphEngine

三类图：

- `Problem Graph`：题目条件、公式、目标、图形关系、变量约束。
- `Reasoning Graph`：学生步骤、标准步骤、第一断点、strict gate、VerifierTrace。
- `Learner Graph`：错因原子、历史复发、变式迁移、掌握度、推荐训练。

### 3.6 StructuredFormulaEvidenceEngine

数学 OCR 不能只存 LaTeX，还要保存：

- formula tree
- operator tree
- spatial relation
- confidence
- source bbox
- low confidence tokens
- user confirmation

### 3.7 RemediationLoopEngine

闭环：

```text
诊断 -> 追问 -> 订正 -> 同因变式 -> 迁移检测 -> 画像更新
```

## 4. 数据库表方向

P0 应优先设计：

- `diagnosis_jobs`
- `misconception_atoms`
- `atom_memory`
- `verifier_traces`
- `visual_evidence`
- `formula_evidence`
- `variant_transfer_records`
- `cognitive_graphs`

## 5. 优先级

第一优先级：

```text
SocraticPolicyEngine
VerifierTraceEngine
LearnerMemoryEngine
```

第二优先级：

```text
MathCognitiveGraphEngine
StructuredFormulaEvidenceEngine
VisualEvidencePipeline
```

第三优先级：

```text
Geometry Lab
GSAP 动画
3D 游戏化
```

## 6. 产品判断

产品核心不再是“讲题”，而是：

```text
越来越懂学生为什么错，
越来越能引导学生自己改正，
越来越能证明学生是否真正迁移。
```
