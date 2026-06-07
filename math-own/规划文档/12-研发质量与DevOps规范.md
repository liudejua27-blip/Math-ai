# 研发质量与 DevOps 规范

更新时间：2026-05-15

## 目标

企业级项目不是“能跑一次”，而是多人协作、可测试、可部署、可监控、可回滚、可审计。

本规范用于把 Math-SEARAG/高考数学私人思维教练从研究原型推进到企业级工程。

## 分支策略

| 分支 | 用途 |
| --- | --- |
| main | 稳定生产版本 |
| develop | 日常集成版本 |
| feature/* | 单功能开发 |
| experiment/* | 模型和 prompt 实验 |
| release/* | 发布候选 |
| hotfix/* | 紧急修复 |

## 代码目录规范

后端、AI、前端分层清楚：

```text
backend/
  app/
  tests/
  migrations/
frontend/
  src/
  tests/
ai/
  src/
  scripts/
  configs/
  tests/
infra/
  docker/
  k8s/
  terraform-or-bicep/
docs/
```

## 质量门禁

每次合并必须通过：

- 单元测试
- 类型检查
- 代码格式化
- 安全扫描
- API schema 检查
- Prompt 输出格式测试
- 固定 smoke test

AI 相关改动额外通过：

- 固定 10 题回归集
- JSON 输出成功率
- Unsupported Step Rate 不上升
- 平均成本不超过阈值

## 测试分层

| 测试 | 内容 |
| --- | --- |
| Unit Test | 纯函数、Schema 校验、指标计算 |
| Integration Test | OCR -> Schema -> Retrieval -> Generation -> Verification |
| Golden Test | 固定输入得到结构化输出，允许语义字段变化但关键字段稳定 |
| Regression Test | 历史失败样本不能复发 |
| E2E Test | 用户上传错题到生成报告完整流程 |
| Load Test | 批量试卷与高并发上传 |
| Security Test | 鉴权、越权、文件上传、注入、敏感信息泄露 |

## API 规范

- REST API 使用 OpenAPI 文档。
- 所有接口返回统一错误结构。
- 所有写操作带 request_id。
- 长任务返回 job_id。
- 任何模型生成结果都不可直接覆盖原始数据，必须保留版本。

错误结构示例：

```json
{
  "error": {
    "code": "LOW_CONFIDENCE_PARSE",
    "message": "公式识别置信度较低，需要用户确认。",
    "request_id": "...",
    "details": {}
  }
}
```

## 配置规范

配置分层：

- default.yaml
- local.yaml
- staging.yaml
- production.yaml
- tenant overrides

敏感配置只放密钥管理或环境变量，不写入仓库。

## 日志规范

必须结构化记录：

- request_id
- user_id_hash
- tenant_id
- problem_id
- job_id
- model_name
- prompt_version
- latency
- error_code

不得记录：

- 明文 API key
- 明文手机号
- 未脱敏身份证等敏感信息

## 发布流程

1. develop 合并完成。
2. 自动测试和评测通过。
3. 生成 release candidate。
4. staging 环境试运行。
5. 小流量灰度。
6. 监控质量、成本、延迟。
7. 全量发布。
8. 保留回滚版本。

## 环境规划

| 环境 | 用途 |
| --- | --- |
| local | 本地开发 |
| dev | 联调 |
| staging | 发布前验证 |
| production | 生产 |
| research | 论文实验和离线评测 |

研究环境和生产环境必须隔离，避免实验脚本误操作用户数据。

## 文档规范

每个模块必须有：

- README
- 输入输出说明
- 配置说明
- 错误码说明
- 测试说明
- 已知限制

AI 模块额外有：

- Prompt 版本说明
- 评测集结果
- 失败样本列表
- 风险说明

## 企业级 Definition of Done

一个功能完成必须满足：

- 代码合并。
- 测试通过。
- 文档更新。
- 指标可观测。
- 错误可追踪。
- 权限检查完成。
- 数据表迁移完成。
- 回滚方案明确。
- 对应产品验收标准通过。

## 团队协作建议

| 角色 | 职责 |
| --- | --- |
| 产品负责人 | PRD、优先级、验收 |
| 后端工程师 | API、数据库、任务队列 |
| 前端工程师 | 学生端、老师端、后台 |
| AI 工程师 | OCR、RAG、LLM、验证器 |
| 数据/标注负责人 | MPES、Kappa、数据集版本 |
| 教研专家 | 标准解法、错因原子、变式题质量 |
| 测试工程师 | 自动化、回归、E2E |
| 安全合规 | 隐私、权限、审计 |

## 首批工程里程碑

| 里程碑 | 标准 |
| --- | --- |
| M0 | 项目骨架、CI、路径规范完成 |
| M1 | 10 题本地闭环可跑 |
| M2 | 50 题 pilot 评估自动生成 |
| M3 | 学生端 MVP 可演示 |
| M4 | 老师端批量导入原型 |
| M5 | 安全合规和日志审计基础完成 |
| M6 | 企业试点版本上线 |
