# MVP 技术架构

更新时间：2026-05-15

## MVP 目标

第一版只做一个最小可验证闭环：

> 上传一道错题 -> 识别题目与学生步骤 -> 生成 MPES -> 定位错误步骤 -> 归因错因原子 -> 符号验证讲解 -> 生成 3 道变式题 -> 更新思维档案。

不要第一版就做完整教育平台、老师端、家长端、社交对战和大规模题库。

## 系统分层

### 第 1 层：输入层

输入类型：

- 错题图片
- 试卷 PDF
- 学生手写步骤图片
- 手动输入题目
- 手动输入学生步骤

第一版优先级：图片 + 手动步骤输入。

### 第 2 层：公式感知解析层

任务：

- OCR 题干文字
- 公式识别为 LaTeX
- 图形区域检测
- 学生步骤识别或录入
- 低置信度字段标红
- 用户确认关键证据

建议工具：

| 能力 | 工具候选 |
| --- | --- |
| OCR | PaddleOCR、Mathpix、Azure OCR、Pix2Text |
| 公式识别 | LaTeX-OCR、Mathpix、Pix2Text |
| 文档解析 | PaddleOCR-VL 或其他文档解析模型 |
| 手写步骤 | 第一版可人工输入，后续再自动识别 |

注意：不要直接复制旧脚本中的 `Path("../data")` 写法。Python 项目必须用 `PROJECT_ROOT = Path(__file__).resolve().parents[1]` 统一定位。

### 第 3 层：结构化证据层

输出 MPES：

- conditions
- formulas
- figure_clues
- student_steps
- atoms
- verification
- solution_path
- error_locations
- relations

保存格式：JSON / JSONL。

### 第 4 层：检索与生成层

第一版建议先做：

- evidence corpus 检索
- MPES 内部证据选择
- LLM 生成带 evidence_id 的讲解

不要用测试题互相检索当知识库。

### 第 5 层：验证层

第一版优先验证：

- 求导是否正确
- 方程解是否代入成立
- 表达式是否等价
- 条件是否被使用
- 变式题答案是否可验证

工具：SymPy + Python 数值采样。

### 第 6 层：学习闭环层

记录：

- 学生错因原子
- 变式题作答结果
- 掌握度变化
- 高频错误模式

## 推荐项目结构

```text
math-searag/
├── README.md
├── requirements.txt
├── .env.example
├── configs/
│   ├── default.yaml
│   ├── models.yaml
│   └── prompts.yaml
├── data/
│   ├── raw/
│   │   ├── images/
│   │   └── pdfs/
│   ├── processed/
│   ├── schemas/
│   ├── annotations/
│   ├── evidence_corpus/
│   └── results/
├── src/
│   ├── parser/
│   │   ├── ocr_parser.py
│   │   ├── formula_parser.py
│   │   └── schema_builder.py
│   ├── retrieval/
│   │   ├── text_retriever.py
│   │   ├── formula_retriever.py
│   │   └── graph_retriever.py
│   ├── generation/
│   │   ├── prompts.py
│   │   └── answer_generator.py
│   ├── verification/
│   │   ├── sympy_checker.py
│   │   ├── condition_checker.py
│   │   └── reasoning_checker.py
│   ├── diagnosis/
│   │   ├── atom_classifier.py
│   │   └── step_aligner.py
│   ├── evaluation/
│   │   ├── metrics.py
│   │   └── report.py
│   └── utils/
│       ├── paths.py
│       ├── io.py
│       └── logging.py
├── scripts/
│   ├── run_ocr.py
│   ├── build_schema.py
│   ├── run_retrieval.py
│   ├── run_diagnosis.py
│   ├── run_verification.py
│   └── evaluate.py
└── app/
    ├── backend/
    └── frontend/
```

## 后端 API 草案

| API | 功能 |
| --- | --- |
| `POST /problems/upload` | 上传题目图片/PDF |
| `POST /problems/{id}/confirm` | 用户确认 OCR/公式字段 |
| `POST /problems/{id}/student-steps` | 提交学生解题步骤 |
| `POST /problems/{id}/analyze` | 生成 MPES、解法、错因诊断 |
| `POST /problems/{id}/verify` | 执行符号验证 |
| `POST /problems/{id}/variants` | 生成变式题 |
| `GET /users/{id}/profile` | 获取数学思维档案 |
| `GET /reports/weekly` | 获取周报 |

## 数据库核心表

| 表 | 说明 |
| --- | --- |
| users | 用户信息 |
| problems | 原题与来源 |
| problem_evidence | C/F/G/S/A/V/P/E 证据对象 |
| evidence_relations | 证据关系边 |
| student_steps | 学生步骤 |
| solution_paths | 标准路径 |
| misconception_atoms | 错因原子 |
| verification_results | 符号验证结果 |
| variant_questions | 变式题 |
| mastery_profiles | 掌握度画像 |
| learning_reports | 周报 |

## LLM Prompt 输出格式

所有 LLM 输出必须结构化，不能只输出自然语言。

```json
{
  "answer": "...",
  "solution_steps": [
    {
      "step_id": "P1",
      "content": "...",
      "used_evidence_ids": ["C1", "F1"],
      "verification_required": true
    }
  ],
  "student_error_alignment": [
    {
      "student_step_id": "S2",
      "matched_correct_step_id": "P2",
      "is_error": true,
      "error_reason": "...",
      "atom_ids": ["A12"]
    }
  ],
  "confidence": 0.0,
  "need_human_confirmation": []
}
```

## 第一周任务

| 天 | 任务 | 验收标准 |
| --- | --- | --- |
| Day 1 | 建项目结构与路径工具 | 所有脚本用 PROJECT_ROOT，不用 `../data` |
| Day 2 | 跑通 OCR/公式识别 demo | 输出 raw text、LaTeX、置信度 |
| Day 3 | 设计 MPES JSON v0.1 | 5 道题人工校验通过 |
| Day 4 | 实现学生步骤输入与步骤对齐初版 | 能定位简单代数错误 |
| Day 5 | 接 SymPy 验证 | 能验证求导、方程代入、等价表达式 |
| Day 6 | 生成 3 道变式题并验证 | 变式题有答案与验证记录 |
| Day 7 | 输出 MVP 报告 | 有日志、失败案例、下一步清单 |

## 工程注意事项

- API key 放 `.env`，不能写进代码或日志。
- 每次运行保存 config、模型名、prompt、输入、输出、时间戳。
- Evaluation 不要用平均相似度冒充 accuracy。
- MRR/NDCG 必须基于人工 relevance label。
- Generation 和 Verification 要保留原始模型输出，方便追查。
- 所有失败案例保留，不能只展示成功样例。
