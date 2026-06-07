# Math-SEARAG Learning Agent Frontend

本工程已经从通用 Vercel AI Chatbot 模板改造成 `Math-SEARAG Learning Agent` 的前端主体。

## 当前定位

> 面向高中数学错题诊断的可验证、可视化、个性化引导式学习系统。

三条产品硬规则：

```text
没有学生步骤，不做错因诊断。
有学生步骤，先找第一断点。
不先给完整答案，先给追问、纠偏、订正和迁移训练。
```

## 当前已落地

- `lib/ai/math-diagnosis-workflow.ts`：诊断工作流入口，统一返回 `MathDiagnosisResult`。
- `lib/ai/math-rules-engine.ts`：TypeScript 侧错因原子、严格门禁、图谱与变式题生成。
- `components/chat/math-diagnosis-card.tsx`：诊断卡，展示第一断点、错因、追问、订正卡、Geometry Lab 推荐。
- `lib/geometry/geometry-scene-types.ts`：`GeometrySceneSpec v1.0`、尝试记录和推荐协议。
- `lib/geometry/geometry-levels.ts`：12 个 Geometry Lab MVP 关卡，P0 先做正方体与三棱锥。
- `components/geometry-lab/*`：可控几何训练 UI，第一版使用 SVG 投影渲染，后续可替换为 Three.js/R3F。
- `app/geometry-lab/page.tsx`：几何训练入口。

## 下一轮工程重点

第一优先级：

- `SocraticPolicyEngine`
- `VerifierTraceEngine`
- `LearnerMemoryEngine`

第二优先级：

- `MathCognitiveGraphEngine`
- `StructuredFormulaEvidenceEngine`
- `VisualEvidencePipeline`

第三优先级：

- Geometry Lab 深化
- GSAP 订正卡动画
- Three.js/R3F 立体几何渲染

## 建议新增目录

```text
lib/learning-agent/
  socratic-policy-engine.ts
  learner-memory-types.ts
  learner-memory-engine.ts
  verifier-trace-types.ts
  remediation-loop-engine.ts

lib/evidence/
  formula-evidence-types.ts
  visual-evidence-types.ts
  mpes-types.ts

components/learner-memory/
components/visual-evidence/
components/diagnosis/
```

## 本地验证

```bash
corepack pnpm exec tsc --noEmit
corepack pnpm exec tsx ./lib/ai/math-rules-engine.test.ts
corepack pnpm exec tsx ./lib/geometry/geometry-levels.test.ts
```

## 运行

```bash
pnpm install
pnpm dev
```

Geometry Lab 本地入口：

```text
http://localhost:3000/geometry-lab?level=G1-4
```
