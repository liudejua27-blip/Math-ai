# 后端计算服务

这是给当前网站原型使用的本地计算后端，目标是先跑通学生端高中数学闭环：试卷识别、解题思路识别、思路判断、第一处错误定位、更优解题路径、详细步骤图片数据、知识点与错因分析。

## 启动

```powershell
python backend/server.py --host 127.0.0.1 --port 8008
```

启动后前端会自动请求：

- `GET /api/health`
- `GET /api/capabilities`
- `POST /api/analyze`
- `GET /api/report/{job_id}`

## 设计要点

- 计算核心在 `compute_engine.py`，不依赖 Web 框架，后续可平滑迁移到 FastAPI/Celery。
- 如果环境里有 SymPy，会优先做符号验证；没有 SymPy 时使用规则验证兜底。
- HTTP 服务基于 Python 标准库，方便在空环境里直接运行。
- `POST /api/analyze` 输出 `student_coach`，包含 `paper_recognition`、`thought_recognition`、`thought_judgement`、`better_approach`、`solution_image_steps`、`knowledge_points`、`error_causes`、`daily_plan`。
- 低置信度、缺少必要条件或验证不足时，会返回 `strict_pass=false` 与 `need_human_review=true`，避免把不完整解法包装成正确结论。
