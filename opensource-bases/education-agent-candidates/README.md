# Education Agent Candidates

本目录保存 2026-06-06 通过 GitHub 浅克隆的最新版研究候选库，用于学习架构、功能和许可证边界。

## 候选库

| 目录 | 仓库 | 当前用途 | 商业化注意 |
| --- | --- | --- | --- |
| `DeepTutor/` | https://github.com/HKUDS/DeepTutor | 学习 agent-native tutoring、Memory、RAG、Visualize、Skill 体系 | Apache-2.0，较适合参考架构 |
| `MathCrew/` | https://github.com/freesoft/MathCrew | 学习多 Agent 错题练习、Problem Bank、scaffold 训练 | PolyForm Strict，不建议直接复制到商业产品 |
| `geogebra-integration/` | https://github.com/geogebra/integration | 学习 GeoGebra Web 嵌入与 API 控制 | 商业使用需确认许可 |
| `manim/` | https://github.com/ManimCommunity/manim | 学习程序化数学动画生成 | MIT，可作为异步动画方向参考 |
| `fireworks-tech-graph/` | https://github.com/yizhiyanhua-ai/fireworks-tech-graph | 参考自然语言到技术图、SVG/PNG 输出和图谱验证流程，已抽象为项目内 `MathThinkingGraphSpec` | MIT，可参考协议和工作流，产品前端仍使用自研安全渲染器 |
| `nature-skills/` | https://github.com/Yuan1z0825/nature-skills | 参考多 skill 安装、共享上下文和论文/科研图工作流 | MIT，内容偏医学科研，仅抽取 skill 组织方式 |
| `Nature-Paper-Skills/` | https://github.com/Boom5426/Nature-Paper-Skills | 参考 claim-driven、figure-planner、paper-workflow 等论文工作流 | MIT，适合改造为数学教育论文写作与图文对齐流程 |

## 使用原则

- 这些仓库是研究候选，不是产品源码的一部分。
- 不在未审计许可证的情况下复制代码进入 `agent-engineering` 或 `math-own`。
- 优先吸收架构思想：Agent 工作流、题库缓存、可视化讲解、学生记忆、RAG 证据链。
- 商业版核心代码应自研，尤其是高中数学题型模板、错因原子库和 3D 几何讲解引擎。
