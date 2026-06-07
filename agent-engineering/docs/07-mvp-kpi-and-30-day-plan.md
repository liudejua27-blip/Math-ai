# MVP、KPI 与 30 天执行计划

本文根据 `回答(3).md` 整理，用于把 Math-SEARAG 从强工程原型推进到可试点、可传播、可收费的高中数学 Agent 产品。

## 北极星目标

让高中生在真实题目和真实步骤中感到：

```text
它比搜题软件更懂我。
它知道我为什么错。
它能安排我下一步该练什么。
```

北极星指标：

```text
Verified Learning Repair Rate
= 有学生步骤的诊断会话中，完成第一错步定位、订正卡、同因变式，并在后续变式中证明同一错因被修复的比例。
```

这个指标同时要求诊断、讲解、训练和学习画像闭环成立，比单纯 DAU 或答题量更贴近产品价值。

## KPI 体系

### 1. 学习效果 KPI

| 指标 | 定义 | 目标用途 |
| --- | --- | --- |
| First Wrong Step Accuracy | 首错定位与人工标注一致的比例 | 验证思维诊断是否可信 |
| Atom Accuracy | 错因原子与人工标注一致的比例 | 验证错因体系是否有效 |
| Strict Gate Accuracy | 严格门禁 pass/fail 与人工/符号验证一致比例 | 防止错误讲解 |
| Variant Transfer Rate | 学生完成同因变式且不再犯同一错因的比例 | 衡量是否真的修复思维 |
| Recurrence Rate | 同一错因在后续会话复发的比例 | 衡量弱点是否被长期解决 |
| Self-Correction Rate | 学生在追问后自行修正第一错步的比例 | 衡量苏格拉底策略质量 |

### 2. 产品使用 KPI

| 指标 | 定义 | 目标用途 |
| --- | --- | --- |
| Diagnosis Activation Rate | 新用户首次完成有效诊断的比例 | 衡量首屏是否可用 |
| Step Submission Rate | 输入题目后愿意提交学生步骤的比例 | 衡量“先写思路”规则是否被接受 |
| Correction Card Completion Rate | 用户看完订正卡并进入变式的比例 | 衡量讲解是否有行动力 |
| Weekly Return Rate | 一周内回访并继续诊断/训练的比例 | 衡量留存 |
| Geometry Lab Engagement | 几何推荐后进入并完成任务的比例 | 衡量视觉差异化价值 |

### 3. 商业 KPI

| 指标 | 定义 | 目标用途 |
| --- | --- | --- |
| Free-to-Pro Intent Rate | 免费用户触达 Pro 权益入口并表现付费意向的比例 | 衡量订阅潜力 |
| Parent Report Share Rate | 周报被导出/分享给家长的比例 | 衡量家长端传播力 |
| Teacher Dashboard Trial Rate | 老师试用班级错因看板的比例 | 衡量小 B 入口 |
| School Pilot Conversion | 试点学校从体验到正式合作的比例 | 衡量大 B 路线 |

### 4. 安全与质量 Guardrails

| 指标 | 红线 |
| --- | --- |
| No-Step Diagnosis Violation | 无步骤时不得输出第一错步 |
| Full Solution Violation | `canShowFullSolution=false` 时不得直接给完整答案 |
| Unverified Claim Rate | 未验证数学 claim 不得显示为 pass |
| Human Review Exposure | 低置信和高风险 case 必须显示人工复核状态 |
| Harmful Feedback Rate | 不得出现“你很笨”等伤害性评价 |
| Minor Data Export/Delete Coverage | 学生数据必须可导出、可删除、可审计 |

## MVP 数据模型

当前已在前端工程数据库层新增学习闭环表，并接入诊断 workflow 的持久化。下一步重点是把这些数据完整呈现在正式学习工作台、诊断历史和学生画像页中。

### `student_profile`

```text
id
user_id
grade
target_exam
weekly_state
mastery_summary_json
privacy_level
created_at
updated_at
```

### `diagnosis_session`

```text
id
user_id
chat_id
problem_text
student_steps
result_json
first_wrong_step
confidence
need_human_review
created_at
```

### `workbench_event`

```text
id
diagnosis_session_id
event_type
payload_json
created_at
```

事件类型：

- `diagnosis_started`
- `student_steps_aligned`
- `strict_gate_checked`
- `verifier_trace_added`
- `policy_decided`
- `correction_card_ready`
- `learner_memory_delta_ready`
- `remediation_plan_ready`
- `geometry_lab_recommended`
- `diagnosis_completed`

### `atom_memory`

```text
id
student_profile_id
atom_id
atom_label
recurrence_count
last_seen_at
mastery
transfer_rate
status
updated_at
```

### `remediation_record`

```text
id
diagnosis_session_id
student_profile_id
variant_level
variant_text
result
atom_ids_json
transfer_success
created_at
```

### `weekly_learning_report`

```text
id
student_profile_id
week_start
summary_json
top_recurring_atoms_json
recommended_plan_json
created_at
```

## 30 天执行计划

### 第 1 周：正式学习工作台上线

目标：让 `/workbench-preview` 升级为正式可用学习页。

任务：

- 接通正式 auth / guest auth / database
- 保存每一次 `MathDiagnosisResult`，当前数据库表和 workflow 持久化已落地
- 保存 `workbenchEvents`，当前会随诊断会话写入 `WorkbenchEvent`
- 右侧 Inspector 可折叠、可复制、可导出
- 移动端优化为“主画布 + 底部 Inspector 抽屉”

验收：

- 新用户能完成一次真实诊断
- 诊断结果可在历史中重新打开
- 无步骤时只请求步骤，不编造诊断

### 第 2 周：长期学习画像

目标：让产品开始记住学生。

任务：

- 建 `student_profile`，已落地为 `StudentProfile`
- 建 `atom_memory`，已落地为 `AtomMemory`
- 建 `diagnosis_session`，已落地为 `DiagnosisSession`
- 建 `remediation_record`，已落地为 `RemediationRecord`
- 生成“本周复发错因”
- 生成“本周数学思维报告”

验收：

- 同一学生多次诊断后能看到高频错因变化
- A07/A08/A34 等错因能形成复发和修复记录
- 周报能用人话解释弱点，而不是堆技术词

### 第 3 周：Geometry Lab 强化

目标：做出能传播的图上讲解体验。

任务：

- A34 二面角错误自动推荐 Geometry Lab
- 正方体、三棱锥关卡做成可交互版本
- 支持关键线面高亮
- 加入 GSAP 步骤动画
- 录制 3 个产品 demo 视频

验收：

- GeometrySceneSpec validator 继续拒绝任意 JS 字段
- 几何错因能触发具体可视化任务
- 桌面和移动端不遮挡主诊断流程

### 第 4 周：真实试点和评测

目标：从 demo 变成试点产品。

任务：

- 找 20-50 名高中生真实试用
- 收集至少 200 条学生步骤
- 建立人工标注集
- 指标从 demo 10 题扩展到 100 题
- 评估 First Wrong Step Accuracy、Atom Accuracy、Strict Gate Accuracy、Transfer Rate

验收：

- 真实样本评测报告可复现
- 人工标注协议明确
- 低置信和人工复核 case 有单独列表
- 不把 10 题 demo 的 1.0 指标当作商业或论文强结论

## 版本包装

### 免费版

- 每天 3 次思维诊断
- 基础错因原子
- 基础订正卡
- 基础变式题
- Geometry Lab 体验关卡

### Pro 订阅版

- 无限诊断
- 长期错因画像
- 每周思维报告
- 高考专题训练
- 错因复发提醒
- 同因变式训练
- Geometry Lab 完整版

### 教师版

- 班级错因热力图
- 学生分层报告
- 自动生成分层作业
- 典型错因讲评课件
- 校本题库接入

### 学校版

- 年级数据看板
- 教研分析
- 题库/试卷系统接入
- 校内私有知识库
- 数据权限和审计

## 发布前必须满足

- GitHub Actions release gate 通过
- `corepack pnpm run test:release` 通过
- `python -m unittest discover -s tests` 通过
- `/api/health` 显示 `releaseReady.minimumConfigReady=true`
- Vercel 预发布环境可访问
- 有未成年人数据保护、人工复核、可删除/可导出机制
- 至少完成 20-50 名学生的小规模试点准备
