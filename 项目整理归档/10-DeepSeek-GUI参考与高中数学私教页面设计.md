# DeepSeek GUI 参考与高中数学私教页面设计

## 本轮新增来源

已从 GitHub 下载并审计：

- 仓库：`XingYu-Zhong/DeepSeek-GUI`
- 本地位置：`opensource-bases/deepseek-gui`
- 用途：参考其 agent 工作台、前端状态管理、运行时事件展示和工具调用可观察性。

结论：DeepSeek GUI 是 Electron 桌面项目，不适合直接并入当前 Next.js Web App；但它的“工作台式界面 + runtime 事件流 + 工具调用可见”非常适合改造高中数学私教。

## 高中数学私教页面定位

页面不是“拍照搜题聊天框”，而是“数学思维训练工作台”。

核心交互顺序：

1. 学生输入题目和自己的解题步骤。
2. 系统进行 step alignment，精确定位第一错句、第一错步、第一错表达式。
3. 严格门禁和 verifier trace 判断关键数学 claim。
4. SocraticPolicy 决定是否追问、确认条件、进入人工复核或生成变式。
5. 输出订正卡、同因变式和学习画像更新。

## 页面结构

```text
顶部：模型、模式、后端/verifier 状态、置信度和复核提示
左侧：学生画像、最近题目、错因原子、本周训练计划
中间：题目输入、学生步骤、苏格拉底对话、订正卡、变式题
右侧：第一错步、错因原子、严格门禁、验证链、图谱、画像更新、几何实验
```

## Agent 架构升级

参考 DeepSeek GUI 后，本项目的 agent 设计应坚持：

- UI 只展示结构化结果和事件，不在前端硬写诊断逻辑。
- TypeScript workflow 是主控，统一管理 agent、tool calling、错因规则、教学策略和 UI 协议。
- Python 只保留为数学验证微服务，服务 SymPy、OCR、几何计算等强项。
- 每一次诊断都留下 evidence、strict gate、verifier trace、policy decision、learner memory delta，服务后续论文实验和产品评测。

## 当前优先级

P0：

- 继续增强 D03、D05、Q03、G02 等样例的错因识别。
- 让 A11、A18、A34 等错因原子稳定进入输出，而不是被截断或被宽松规则漏判。
- 将“整体门禁失败”升级为 step alignment，精确到学生具体步骤。

P1：

- 三栏工作台 UI。
- Agent Inspector。
- 工具事件时间线。
- 可保存 HTML 讲解卡。

P2：

- 3D 几何游戏化。
- 图上讲解和动画讲解。
- OCR 与图片题输入。
- 多模型复核与教师后台。

