# Math-SEARAG 中国大陆正式上线清单

本清单用于把当前本地 MVP 推进到中国大陆公开自助访问、免费使用的生产版。默认云平台为阿里云，主模型为 DeepSeek 官方 API，Python 服务只承担 OCR、SymPy/Verifier 和后续几何计算。

## 1. 生产资源

- Web 主应用：阿里云 ECS/容器服务，运行 Next.js。
- Python 微服务：独立 ECS/容器，暴露 `/health`、`/ocr/draft`、`/verify/math`。
- 数据库：阿里云 RDS PostgreSQL，执行 `lib/db/migrations` 全量迁移。
- Redis：阿里云 Redis，用于限流、运行态和可恢复流。
- 对象存储：阿里云 OSS 私有 bucket，用于草稿纸图片、OCR raw crop 和导出文件。
- 日志监控：阿里云日志服务或等价 APM，日志必须脱敏。

## 2. 必备环境变量

```text
AUTH_SECRET=
POSTGRES_URL=
REDIS_URL=
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
MATH_AGENT_BACKEND_URL=
ALI_OSS_REGION=
ALI_OSS_BUCKET=
ALI_OSS_ACCESS_KEY_ID=
ALI_OSS_ACCESS_KEY_SECRET=
MATH_DIAGNOSIS_MODEL=deepseek-v4-flash
MATH_REVIEW_MODEL=deepseek-v4-pro
MATH_TEACHING_STYLE=socratic
MATH_VISUAL_MODE=html_card
MATH_REQUIRE_DRAFT_OCR=false
MATH_DRAFT_OCR_ENGINES=pix2text,paddleocr,latex_ocr
MATH_READINESS_DEEPSEEK_LIVE=true
```

`AI_GATEWAY_API_KEY` 只作为国际 staging fallback，不是中国大陆生产必需项。

## 3. 发布门禁

上线前必须在 staging 域名执行：

```bash
corepack pnpm run release:env:strict
corepack pnpm exec tsc --noEmit --incremental false
corepack pnpm run test:ai
corepack pnpm run test:release
python -m unittest discover -s tests
```

`test:release` 现在默认使用严格环境变量检查。没有真实 Postgres、Redis、DeepSeek、Python 后端和 OSS 配置时，不应判定为可生产上线。

## 4. API 验收

- `GET /api/health`：服务存活和基本配置。
- `GET /api/readiness`：Postgres、Redis、DeepSeek、Python、OSS 配置全部通过。
- `POST /api/privacy/export`：登录用户导出自己的聊天、诊断、OCR、学习画像和周报。
- `POST /api/privacy/delete`：提交 `confirm=DELETE_MY_DATA` 后删除账号和学习数据。
- Python `GET /health`：OCR/Verifier 服务存活。
- Python `POST /ocr/draft`：草稿纸识别。
- Python `POST /verify/math`：数学验证。

## 5. 合规与产品提示

- 完成 ICP 备案后再绑定大陆正式域名。
- 发布前准备正式隐私政策、用户协议、未成年人监护人提示和数据用途说明。
- OCR 图片默认私有存储，不允许生产环境继续使用公开文件上传口。
- 日志不得输出原始草稿纸图片、完整题目、API key、cookie、数据库连接串或隐藏 prompt。
- Agent Inspector 只展示可读 trace 和验证结果，不展示隐藏推理链。

## 6. 公开免费版风控

- 按 IP、账号、OCR 上传大小和每日诊断次数做限流。
- DeepSeek API 失败时给出可读降级，不丢失学生输入。
- Python verifier 不可用时必须显示 `not_checked`，不能伪造通过。
- OCR 低置信必须先让学生确认，不能直接诊断。
- 对异常上传、批量请求和攻击流量保留封禁能力。

## 7. 回滚策略

- 生产发布先走 staging，完成 smoke 后再切正式域名。
- 保留上一版本镜像和数据库迁移前快照。
- 如果 DeepSeek 或 Python 服务不可用，先降级为文本输入诊断和 `not_checked` 验证状态。
- 如果数据库或 Redis 不可用，停止公开入口，保留只读公告页。

