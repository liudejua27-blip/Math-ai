# Geometry Reasoning Engine v0.2

Geometry Lab 已经有 3D/R3F 可视化，但 v0.2 的目标是让它开始具备“几何推理引擎”的骨架，而不只是展示图形。

## 本轮新增

- `lib/geometry/geometry-reasoning-engine.ts`
  - 从 `GeometrySceneSpec` 推导几何对象：点、线、面。
  - 生成基础约束：平行、垂直、从属、投影、截面。
  - 为三个高频场景提供专门 solver：
    - 正方体线面角
    - 三棱锥二面角
    - 截面/辅助面构造
  - 输出即时反馈、辅助线/辅助面候选、Step Alignment evidence、LearnerMemory signal。

- Geometry Lab UI
  - 任务面板从“展示正确对象”升级为“候选对象 + 推理链 + 即时反馈”。
  - 误选对象会给出可读反馈。
  - 证据链面板展示可写回 Step Alignment 的几何 claim。
  - Geometry Attempt 保存时后端会重新运行推理引擎，不完全相信前端传入的 `passed/correctCount`。

## 当前 solver 范围

### 正方体线面角

关键逻辑：

1. 确认目标平面。
2. 找斜线端点在平面上的垂足。
3. 连接垂足和斜线另一端，得到投影。
4. 线面角转化为斜线与投影的夹角。

当前 `G1-4` 的关键对象是 `AC`，`A1C` 和 `ABCD` 可以作为证据，但不能单独算目标命中。

### 三棱锥二面角

关键逻辑：

1. 确认二面角公共棱。
2. 构造垂直于公共棱的辅助截面。
3. 在辅助截面里观察平面角。

当前 `G2-2` 的关键对象是辅助截面 `POM`，`PM/OM` 是辅助证据。

### 截面/辅助面构造

关键逻辑：

1. 确认给定点。
2. 在同一平面内连接可连接点。
3. 利用平行面和平行交线补全截面。
4. 检查截面是否经过所有给定点。

当前 `G1-6` 的关键对象是 `ABCDiag`。

## 如何写回学习闭环

`evaluateGeometrySelection` 会输出：

- `stepAlignmentEvidence`：几何 claim、refs、status。
- `learnerMemorySignal`：目标错因原子、空间迁移增量、是否需要复习。
- `wrongRefs`：学生误选对象。
- `suggestedAuxiliaries`：下一步应该看的辅助线/辅助面。

这些内容会进入 Geometry Attempt 的 `metadata`，后续可用于：

- 诊断历史回看
- Step Alignment 几何 claim trace
- LearnerMemory 的空间想象、投影意识、二面角转化、截面构造画像
- 周报中的“不是粗心，而是空间对象转化反复出错”

## 视觉数学评测参考

- [MathVerse](https://github.com/ZrrSkywalker/MathVerse)：借鉴“是否真正理解图形，而不是只读文字”的评测思想，对应本项目的 `object_grounding_accuracy`。
- [MATH-Vision / MATH-V](https://github.com/mathllm/MATH-V)：借鉴按学科和难度分桶的视觉数学评测，对应本项目的 `geometry_solver_accuracy_by_scene_type`。
- [MathVista](https://github.com/lupantech/MathVista)：借鉴视觉上下文中的多类型推理评测，对应本项目的 `visual_reasoning_transfer_rate`。

这些仓库只作为评测思想参考，不直接作为产品代码或题库来源。

## 下一步

1. 把 `GeometrySceneSpec` 的对象关系扩展到显式 `constraints` 字段，但继续保持白名单协议。
2. 增加真实几何 solver：
   - 线面角 solver
   - 二面角 solver
   - 截面构造 solver
   - 空间向量 solver
3. 将 Geometry Attempt 的 `stepAlignmentEvidence` 正式合并进诊断详情页的 claim trace。
4. 建立视觉数学评测集：每个样本包含图形对象、学生选择、正确辅助构造、预期错因。
5. 用真实学生误选数据训练推荐：下一题推荐、追问难度、是否进入复习计划。
