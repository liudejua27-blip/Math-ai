# math-own 工程说明

`math-own` 是当前已有的高中数学诊断与思维教练原型，定位是“可运行的小型 Web + Python 后端”。新版路线中，它不是最终商业工程，但非常重要：它是验证 Math-SEARAG 诊断闭环、错因原子和讲解卡的最轻量实验场。

## 目录用途

- `index.html`：前端入口页面，提供数学诊断原型的主要交互界面。
- `assets/`：前端静态资源。
  - `app.js`：页面交互逻辑、题目输入、结果渲染、讲解卡展示。
  - `styles.css`：页面样式。
- `backend/`：Python 后端逻辑。
  - `server.py`：本地服务入口。
  - `compute_engine.py`：核心计算与诊断逻辑。
  - `math_rules.py`：数学规则、诊断规则或评分依据。
  - `README.md`：后端局部说明。
- `tests/`：后端单元测试，当前用于验证计算引擎。
- `规划文档/`：历史产品规划、技术路线、Prompt/Agent 设计材料。
- `.vscode/`：本地编辑器配置。

## 新版升级方向

1. 增加 `visual_spec` 字段：让诊断结果不仅有文字，还能驱动 SVG/Three.js/GSAP 讲解。
2. 增加题型模板：函数、导数、立体几何、解析几何。
3. 增加错因原子库：审题、定义域、分类讨论、数形结合、空间想象等。
4. 增加 demo dataset：至少 10 道真实高中数学题，作为论文和产品共同样本。
5. 把稳定能力迁移到 `agent-engineering/backend`，让商业版前端调用。

## 推荐测试命令

在 `math-own` 目录运行：

```powershell
python -m unittest discover -s tests
```

本次整理已确认测试通过。

## 整理原则

- 保留源码结构，不随意移动 `backend/`、`assets/`、`tests/`。
- 删除或忽略 `__pycache__/`、`*.pyc` 等生成文件。
- `规划文档/` 暂时保留，后续把仍有价值的内容迁移进 `项目整理归档/06_最新版商业方案_20260606/`。
