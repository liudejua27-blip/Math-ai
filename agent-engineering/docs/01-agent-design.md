# Math-SEARAG Learning Agent 设计

## 产品定位

Math-SEARAG Learning Agent 是高中数学思维诊断型 AI 私教工作台。

它不是搜题工具，也不是直接给答案的聊天机器人。核心目标是让学生知道：

- 自己从哪一步开始错
- 为什么这一步错
- 这个错误属于哪个错因原子
- 如何通过追问和订正修复
- 如何迁移到下一类题

一句话定位：

> 中国高中数学第一款“思维诊断型 AI 私教 Agent”：会看学生草稿、定位第一错步、追问、验证、画图、记住错因，并安排同因变式训练。

## 三条产品红线

```text
没有学生步骤，不做错因诊断。
有学生步骤，先找第一断点。
不先给完整答案，先给追问、纠偏、订正和迁移训练。
```

这三条规则必须进入系统 prompt、工具调用策略、UI 文案、教师端说明和商业宣传。

## 工程边界

| 目录 | 角色 |
| --- | --- |
| `agent-engineering/` | 正式产品主工程：Next.js、Vercel AI SDK、TypeScript workflow、学习工作台、Geometry Lab |
| `math-own/` | Python 数学验证微服务：SymPy、公式验证、复杂几何计算、OCR 后处理 |
| `opensource-bases/` | 开源参考与许可证审计区，不作为商业产品源码直接演化 |

技术路线继续坚持：

```text
Next.js + TypeScript + Vercel AI SDK = 产品主控
Python = 数学验证工具箱
Qwen-Agent = 后端 agent 结构参考和兼容层
DeepSeek / 多模型 = 对话、推理、讲解生成
GeometrySceneSpec = 可视化安全协议
Evaluation Harness = 产品质量门禁
```

## 七个 Agent 子系统

### 1. Input Normalizer

负责接收题目、学生步骤、图片 OCR 后文本、公式结构化和低置信字段标记。

输入：

- `problemText`
- `studentSteps`
- `imageEvidence`
- `formulaEvidence`
- `confirmedEvidence`

输出：

- 标准化题目文本
- 标准化学生步骤
- 公式 token / LaTeX / 结构化表达式
- 低置信 evidence 节点

### 2. Step Alignment Engine

负责逐句、逐步、逐表达式定位第一断点。

核心要求：

- 从整体门禁失败进一步定位到学生哪一句先错
- 不把后续连锁错误误判为第一错步
- 每个错误判断必须绑定 evidence id
- 无学生步骤时只能返回 `request_steps`

### 3. Strict Gate / VerifierTrace Engine

负责判断关键数学 claim 是否通过验证。

每个 trace 必须包含：

- `claim`
- `verifier`
- `status`
- `evidenceIds`
- `failureReason`
- `confidence`

P0 verifier 层级：

1. TypeScript strict gate
2. Python/SymPy verifier
3. geometry constraint checker

Python verifier 不可用时必须显示 `not_checked`，不能假装通过。

### 4. SocraticPolicy Engine

决定当前教学动作：

- `request_steps`
- `confirm_evidence`
- `first_wrong_step`
- `micro_scaffold`
- `show_correction_card`
- `generate_variant`
- `enter_geometry_lab`
- `human_review`

有第一错步时，默认 `canShowFullSolution=false`。

### 5. LearnerMemory Engine

更新学生错因画像、专题掌握度和迁移率。

核心画像字段：

- 高频错因原子
- 最近复发错因
- 题型掌握度
- 定义域意识
- 分类讨论能力
- 几何空间想象能力
- 变式迁移成功率
- 订正后复错率
- 本周学习状态

### 6. RemediationLoop Engine

生成同因变式训练闭环：

1. 表层变式
2. 结构变式
3. 迁移变式
4. Boss 综合题

训练结果回写 LearnerMemory，用于计算 recurrence rate、transfer rate 和 mastery。

### 7. Visual Explanation Engine

负责可视化讲解：

- HTML 订正卡
- 思维图谱
- Geometry Lab scene spec
- 后续 GSAP / 3D 动画步骤

所有可视化必须使用白名单协议。模型不能直接生成任意 `script`、`code` 或 `javascript` 字段。

## 输出合同

正式诊断结果使用 `MathDiagnosisResult`：

- `firstWrongStep`
- `firstWrongReason`
- `misconceptionAtoms`
- `evidenceNodes`
- `strictChecks`
- `verifierTraces`
- `policyDecision`
- `socraticQuestions`
- `correctionCard`
- `variants`
- `learnerMemoryDelta`
- `remediationPlan`
- `recommendedGeometryLabs`
- `workbenchEvents`

这些字段也是论文、评测和教师端分析的数据基础。

## 开源参考边界

| 来源 | 借鉴 | 不做 |
| --- | --- | --- |
| Vercel AI Chatbot / AI SDK | Next.js、TypeScript 对话、tool calling、流式 UI、AI workflow | 不保持通用聊天壳 |
| DeepSeek GUI | 工作台布局、事件流、工具调用可观察性、任务面板 | 不搬 Electron runtime |
| Qwen-Agent | 工具调用、planning、RAG、Assistant 结构 | 不让 Python agent 接管主流程 |
| DeepTutor | 个性化 tutoring、skill、memory、知识库结构 | 不照搬学术 demo |
| Manim | 异步数学动画和讲解视频生成 | P0 不做重视频生成 |
| GeoGebra | 几何交互与图形表达参考 | 商业化前谨慎处理许可 |
| MathCrew | 自适应练习和错题闭环思路 | 不直接复制代码 |

## 与论文的连接

Agent 日志必须保留：

- `problem_id`
- `student_id`
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

这些字段支撑 baseline、消融实验、自我修正率、迁移率、教师一致性和可复现评测。
