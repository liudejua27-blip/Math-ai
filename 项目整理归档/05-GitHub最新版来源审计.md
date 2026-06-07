# GitHub 最新版来源审计

本次已通过 GitHub 获取并浅克隆以下最新项目到：

`opensource-bases/education-agent-candidates/`

## 1. DeepTutor

- 仓库：[HKUDS/DeepTutor](https://github.com/HKUDS/DeepTutor)
- 本地位置：`opensource-bases/education-agent-candidates/DeepTutor`
- 当前 HEAD：`c4d4766`
- 最新提交时间：2026-05-28
- 许可证：Apache-2.0
- 可借鉴内容：
  - Agent-native personalized tutoring。
  - TutorBot、Skills、Memory、Knowledge Base、RAG、Visualize/Animator。
  - 三层 Memory、可审计工作台、多用户隔离。
  - 以 CLI/Skill/Tool 方式驱动学习系统。
- 对本项目的启发：
  - 我们应采用“可组合能力 + 学生记忆 + 知识库 + 可视化工具”的架构。
  - 但要垂直收窄到中国高中数学，尤其是错因诊断、几何可视化和高考题型。

## 2. MathCrew

- 仓库：[freesoft/MathCrew](https://github.com/freesoft/MathCrew)
- 本地位置：`opensource-bases/education-agent-candidates/MathCrew`
- 当前 HEAD：`5e01c25`
- 最新提交时间：2026-02-27
- 许可证：PolyForm Strict 1.0.0
- 可借鉴内容：
  - 多 Agent 流程：Manager、Creator、Helper、Analyst。
  - Problem Bank 缓存题目，降低 LLM 成本。
  - 错题后 scaffolded practice。
  - 多学生档案、XP、徽章、Dashboard。
- 商业风险：
  - 许可证对教育机构、教培、商业使用有明确限制。
  - 只能学习思路，不能直接复制代码进入商业产品，除非获得授权。

## 3. GeoGebra Integration

- 仓库：[geogebra/integration](https://github.com/geogebra/integration)
- 本地位置：`opensource-bases/education-agent-candidates/geogebra-integration`
- 当前 HEAD：`7aa4205`
- 最新提交时间：2026-05-21
- 可借鉴内容：
  - Web 页面嵌入 GeoGebra Math Apps。
  - JavaScript API 控制构造、参数、图像。
  - 适合函数图像、平面几何、动态参数拖动。
- 商业风险：
  - GeoGebra README 明确提示非商业用途可复制分发，商业化需要单独确认许可。
  - 商业版可先做自研 SVG/Three.js，GeoGebra 作为教学研究或可选外部工具。

## 4. Manim

- 仓库：[ManimCommunity/manim](https://github.com/ManimCommunity/manim)
- 本地位置：`opensource-bases/education-agent-candidates/manim`
- 当前 HEAD：`33424fe`
- 最新提交时间：2026-06-03
- 许可证：MIT
- 可借鉴内容：
  - 程序化生成精美数学动画。
  - 适合生成课程级短视频、知识点动画、函数变化过程。
- 对本项目的启发：
  - 实时交互用 HTML/SVG/Three.js。
  - 高质量可分享讲解视频用 Manim 异步生成。

## 5. 结论

| 来源 | 是否可直接商用借鉴 | 建议 |
| --- | --- | --- |
| DeepTutor | 较友好 | 参考架构和能力体系，可深度学习 |
| MathCrew | 风险高 | 只参考思路，不复制代码 |
| GeoGebra | 需确认许可 | 研究/原型可用，商业版优先自研 |
| Manim | 友好 | 可用于异步动画生成模块 |

项目路线应是：学习 DeepTutor 的 agent-native 框架，吸收 MathCrew 的错题闭环思路，用 Three.js/GSAP/Manim/受控 scene spec 建自己的数学可视化引擎。

