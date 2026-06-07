# 数据标注与 MPES 规范

更新时间：2026-05-15

## MPES 定义

MPES 是 Math Problem Evidence Schema，目标是把一道数学题从非结构化图片或文本，转成可检索、可引用、可验证、可追踪的证据对象。

## 核心对象

| 类型 | ID 前缀 | 含义 | 示例 |
| --- | --- | --- | --- |
| 题干条件 | C | 文字条件、范围、已知量、求解目标 | `x > 0`，`求 a 的取值范围` |
| 公式 | F | 原题公式或推导公式 | `f(x)=ln x-ax` |
| 图形线索 | G | 几何图、坐标图、表格、图像关系 | `AB 垂直 CD` |
| 学生步骤 | S | 学生自己的解题过程 | `令 f'(x)=0 得 x=a` |
| 知识/错因原子 | A | 定义域、分类讨论、端点比较等 | `导数零点与极值` |
| 验证结果 | V | 符号或规则验证结果 | `求导错误` |
| 正确路径 | P | 标准解题步骤 | `先求定义域` |
| 错误定位 | E | 错误发生点与错因 | `S2 代数变形错误` |

## 推荐 JSON 结构

```json
{
  "problem_id": "MATH_0001",
  "source": {
    "image_path": "data/raw/images/MATH_0001.png",
    "source_type": "student_wrong_problem",
    "copyright_status": "internal_annotation"
  },
  "problem_meta": {
    "grade": "高三",
    "topic": "导数",
    "problem_type": "multi_step_derivative",
    "difficulty": "hard"
  },
  "problem_text": {
    "ocr_raw_text": "...",
    "corrected_text": "...",
    "language": "zh"
  },
  "conditions": [],
  "formulas": [],
  "figure_clues": [],
  "student_steps": [],
  "solution_path": [],
  "atoms": [],
  "verification": [],
  "error_locations": [],
  "relations": []
}
```

## 必填字段

每题必须至少包含：

- problem_id
- source_image 或 source_pdf
- ocr_raw_text
- corrected_text
- formulas
- conditions
- student_steps
- standard_answer
- reasoning_chain
- 每个关键步骤的 evidence_id
- misconception_atoms
- hallucination_labels
- annotator_id
- reviewer_id

## 错因原子体系 v0.1

### 基础运算原子

- 移项
- 配方
- 因式分解
- 通分
- 指数对数运算
- 分式方程变形
- 符号正负判断

### 概念原子

- 定义域意识
- 值域意识
- 单调性
- 奇偶性
- 导数几何意义
- 极值与最值区分
- 概率事件理解
- 向量数量积

### 方法原子

- 分类讨论
- 数形结合
- 换元
- 构造函数
- 参数分离
- 端点比较
- 临界值分析

### 题型策略原子

- 导数压轴题分参
- 圆锥曲线联立消元
- 韦达定理应用
- 立体几何建系
- 数列递推转化
- 概率统计建模

## 幻觉标签体系

| 标签 | 定义 |
| --- | --- |
| formula_hallucination | 答案中出现证据中不存在或错误的公式 |
| condition_misuse | 使用了不存在、错误或绑定错误的条件 |
| condition_omission | 漏掉关键条件，如定义域、参数范围、端点 |
| unsupported_step | 某一步无法被任何证据支持 |
| reasoning_jump | 推理链跳步，缺少必要中间依据 |
| calculation_error | 符号计算或代数变形错误 |
| atom_misdiagnosis | 错因原子归类错误 |
| answer_leakage | 检索或 prompt 中泄漏标准答案 |

## 标注流程

1. 标注员 A 完成 OCR 修正、公式、条件、标准答案、步骤、错因原子。
2. 标注员 B 复核，特别检查证据 ID 与错因原子。
3. 冲突进入仲裁。
4. 计算 Kappa。
5. 生成 gold_schema.jsonl。

## 数据清单文件

建议维护 `dataset_manifest.csv`：

| 字段 | 说明 |
| --- | --- |
| problem_id | 唯一编号 |
| source | 来源 |
| copyright_status | 版权状态 |
| grade | 年级 |
| topic | 章节 |
| problem_type | 题型 |
| difficulty | 难度 |
| has_figure | 是否有图 |
| has_student_steps | 是否有学生步骤 |
| split | train/dev/test/external |
| annotation_status | raw/annotated/reviewed |
| annotator_id | 标注者 |
| reviewer_id | 复核者 |

## 质量控制

- 每题至少双人标注。
- 核心字段 Kappa 目标 0.75+。
- 幻觉类型和错因原子 Kappa 目标 0.8+。
- OCR 原始输出必须保留，不要只保留修正版。
- 任何人工修正都要记录字段和理由。
- Evidence corpus 与测试题严格分离。
