# 前端改造方案

## 基座

前端从 `vercel/ai-chatbot` 改造成 `Math-SEARAG Learning Agent` 工作台，保留 Next.js App Router、AI SDK v6、AI Elements、shadcn/ui、artifact 和聊天持久化结构。

## 产品形态

学生端首页不应只是聊天框，而应逐步升级为学习工作台：

```text
今日任务：
1. 订正昨天的 A07 定义域意识弱
2. 完成 2 道同因变式
3. Geometry Lab：线面角投影训练
```

## 页面规划

| 页面 | 作用 |
| --- | --- |
| Chat / Diagnosis | 输入题目和学生步骤，完成首错诊断和追问 |
| Diagnosis Detail | 左题目步骤，中第一断点追问，右证据链/图谱，底部订正卡/变式 |
| Visual Evidence Confirmation | 确认低置信度公式、几何关系、图形对象 |
| Learner Profile | 错因复发率、同因迁移率、自我修正率、本周训练计划 |
| Geometry Lab | 正方体/三棱锥等空间几何关卡 |
| Teacher Dashboard | 班级错因热力图、题型薄弱点、训练布置 |

## 视觉风格

方向：安静、理性、面向高三学生的学习工作台。

- 深色优先但不使用紫色 AI 渐变。
- 用青绿、琥珀、红色分别表示证据、待确认、首错。
- 保留紧凑聊天区，旁路扩展为证据链、严格门禁、错因原子、订正卡。
- 数学公式必须走 KaTeX/Streamdown/AI Elements 渲染。

## 前端工具调用策略

用户给出题目和步骤时，前端 agent 必须优先调用：

```text
diagnoseMathThinking(problemText, studentSteps, confirmedEvidence)
```

返回后由 `SocraticPolicyEngine` 决定展示顺序：

1. 如果无步骤：请求学生步骤。
2. 如果证据低置信：请求确认。
3. 如果有第一断点：先追问，不给完整答案。
4. 如果通过追问修正：展示订正卡。
5. 如果错因稳定：生成同因变式。
6. 如果几何错因明显：推荐 Geometry Lab。

## 新增组件方向

```text
components/learner-memory/
  learner-profile-page.tsx
  atom-memory-panel.tsx
  topic-memory-panel.tsx
  weekly-plan-panel.tsx

components/visual-evidence/
  visual-evidence-confirmation.tsx
  formula-token-confirmation.tsx

components/diagnosis/
  verifier-trace-panel.tsx
  socratic-policy-panel.tsx
  remediation-loop-panel.tsx
```
