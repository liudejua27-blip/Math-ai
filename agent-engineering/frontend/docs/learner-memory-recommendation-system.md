# LearnerMemory Recommendation System

## 目标

LearnerMemory 不再只是展示学生画像，而是直接驱动学习路径：

- 下一题推荐：表层同因题、结构变式题、迁移题、Geometry Lab 或综合复查。
- 追问难度：微脚手架、标准追问、迁移追问、挑战迁移。
- 讲解风格：小步纠偏、苏格拉底追问、先看图再推理、先做变式。
- 完整解析权限：只有低复发风险且订正、迁移稳定时才开放。
- 复习计划：高风险明天复查，中风险 3 天后复查，低风险进入周复盘。
- 主动提醒：通过 heartbeat 生成下一次 check-in 的学生可读提醒。

## 借鉴来源

[DeepTutor](https://github.com/HKUDS/DeepTutor) 的价值不在于某段具体代码，而在于产品架构思想：

- persistent tutor：导师要记住学生长期状态，而不是只回答当前问题。
- workspace context：每个学生应有独立学习上下文，包含历史、技能、记忆和会话状态。
- memory-driven behavior：记忆不只是展示给用户看，还要影响后续行动。
- heartbeat/check-in：系统应主动提醒复盘，而不是只等待学生再次提问。

本项目只吸收这些思想，代码仍保持自研的 TypeScript-first 架构。

## 当前实现

核心文件：

- `lib/ai/learner-recommendation-engine.ts`
- `lib/ai/learner-memory-types.ts`
- `lib/ai/diagnosis-enhancement-engine.ts`
- `lib/ai/math-diagnosis-workflow.ts`
- `components/learning-workbench/workbench-sidebar.tsx`
- `components/learning-workbench/math-diagnosis-panels.tsx`

推荐输入来自 `LearnerMemoryDelta`：

- `recurrenceRate30d`
- `recurrenceRateLast10`
- `transferRate`
- `selfRepairRate`
- `mastery`
- `updatedAtoms`

推荐输出为 `LearnerRecommendation`：

- `nextProblem`
- `adaptiveTeaching`
- `reviewPlan`
- `heartbeat`
- `recurrencePrediction`

## 决策规则

复发预测分数：

```text
score =
  recurrenceRate30d * 0.45
  + recurrenceRateLast10 * 0.25
  + (1 - transferRate) * 0.18
  + (1 - selfRepairRate) * 0.12
```

风险等级：

- `high`: score >= 0.68
- `medium`: score >= 0.4
- `low`: score < 0.4

策略影响：

- 高复发或低自我修复：下一题降到表层同因题，追问进入微脚手架，暂不开放完整解析。
- 低迁移率：下一题进入结构变式，重点验证换题后是否还会复发。
- 几何错因：优先推荐 Geometry Lab，并切换为 visual-first 讲解方式。
- 低风险且迁移、订正稳定：允许在学生尝试后开放完整解析。

## 持久化

每次诊断保存时，`StudentProfile.masterySummary` 会写入：

- `learnerRecommendation`
- `nextProblemRecommendation`
- `heartbeat`
- `reviewPlan`
- `recurrencePrediction`

正式工作台左侧会优先读取最新诊断结果；刷新后则从 `StudentProfile.masterySummary` 恢复最近一次推荐。

## 下一步

- 把 heartbeat 接入后台任务或 Vercel Cron，生成每日/三日/每周提醒。
- 建立学生独立 workspace，把错因、草稿 OCR、订正记录、变式结果统一成学习上下文。
- 评测推荐质量：下一题完成率、复发下降率、迁移成功率、完整解析开放后的复错率。
- 将推荐系统扩展到家长/老师端，但只展示人话报告，不展示技术 trace。
