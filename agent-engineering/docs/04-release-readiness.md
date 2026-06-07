# Math-SEARAG Release Readiness

This checklist is the release gate for using Math-SEARAG Learning Agent in a
high-school education pilot.

## Release Target

- Product: Math-SEARAG Learning Agent
- Audience: high-school students, teachers, and internal pilot operators
- Primary workflow: student steps -> first wrong step -> verifier trace ->
  Socratic guidance -> correction card -> variants -> learner memory delta
- Visual workflow: Geometry Lab for structured solid-geometry explanation

## Required Environment

Frontend:

```text
AUTH_SECRET
AI_GATEWAY_API_KEY
BLOB_READ_WRITE_TOKEN
POSTGRES_URL
REDIS_URL
MATH_AGENT_BACKEND_URL
MATH_PYTHON_VERIFIER_ENABLED
MATH_REQUIRE_PYTHON_VERIFIER
MATH_DIAGNOSIS_MODEL
MATH_REVIEW_MODEL
MATH_TEACHING_STYLE
MATH_VISUAL_MODE
```

Python verifier:

```text
MATH_AGENT_BACKEND_URL=http://127.0.0.1:8008
```

For Vercel production, configure `AUTH_SECRET`, storage, database, Redis, and AI
Gateway in the Vercel project. Do not commit `.env` files.

## Pre-release Commands

GitHub Actions:

```text
.github/workflows/release-gate.yml
```

Frontend:

```powershell
cd agent-engineering/frontend
corepack pnpm install
corepack pnpm run test:release
```

Production environment gate:

```powershell
cd agent-engineering/frontend
corepack pnpm run release:env:strict
```

Python verifier:

```powershell
cd math-own
python -m unittest discover -s tests
```

Manual browser smoke:

```text
/api/health
/workbench-preview
/geometry-lab
```

## Education Safety Gates

- No student steps: request steps; do not fabricate first wrong step.
- With student steps: call diagnosis workflow before giving explanation.
- No direct full solution when `canShowFullSolution=false`.
- Low confidence or `needHumanReview=true`: display review state.
- Python verifier unavailable: show `not_checked`, never pretend pass.
- Geometry scene specs must reject arbitrary executable fields.
- Student data and secrets must stay outside the repository.
- Follow `agent-engineering/docs/05-education-safety-policy.md` before any real
  student pilot.

## Publishing Notes

- `opensource-bases/` is an audit/reference area; full third-party clones are
  excluded from Git.
- `workbench-preview` is an unauthenticated local/demo page for visual and
  release smoke tests. The real chat route still uses auth and persistence.
- For a school pilot, add a human review process before broad student rollout.
- Deployment details live in `agent-engineering/docs/06-deployment-playbook.md`.
