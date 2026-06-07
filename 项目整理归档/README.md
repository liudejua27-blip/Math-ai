# 2026 最新版项目整理归档

本目录是当前项目的权威入口。项目已从“Math-SEARAG 诊断系统”升级为“Math-SEARAG Learning Agent”。

## 推荐阅读顺序

1. `00-当前权威总纲_20260606.md`
2. `08-Math-SEARAG-Learning-Agent-2.0战略迁移.md`
3. `02-Agent与可视化技术架构.md`
4. `09-Learning-Agent工程实施路线_20260606.md`
5. `06-研究数据与论文改写计划_20260606.md`
6. `04-论文与研究升级路线.md`
7. `03-3D几何游戏化与图上讲解方案.md`
8. `05-GitHub最新版来源审计.md`
9. `07-文件治理与删除记录_20260606.md`

## 新版一句话定位

打造一个面向中国高中数学错题诊断的可验证、可视化、个性化引导式学习 Agent：不只是给答案，而是读懂题目与学生步骤，定位第一处思维断点，生成证据链、错因原子、追问、订正卡、同因变式，并通过长期记忆和 Geometry Lab 训练学生迁移能力。

## 三条产品硬规则

```text
没有学生步骤，不做错因诊断。
有学生步骤，先找第一断点。
不先给完整答案，先给追问、纠偏、订正和迁移训练。
```

## 最新核心判断

- 商业突破口不是“拍照搜题”，而是“高考数学错题复盘 + 思维诊断 + 引导式学习 + 长期画像”。
- 技术突破口不是单一大模型，而是“TypeScript 工作流 + 结构化数学证据 + VerifierTrace + LearnerMemory + 受控可视化协议”。
- 第一优先级是 `SocraticPolicyEngine`、`VerifierTraceEngine`、`LearnerMemoryEngine`。
- 第二优先级是 `MathCognitiveGraphEngine`、`StructuredFormulaEvidenceEngine`、`VisualEvidencePipeline`。
- 第三优先级是 `Geometry Lab`、GSAP 动画和 3D 游戏化。
