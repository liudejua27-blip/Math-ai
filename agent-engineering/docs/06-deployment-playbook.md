# Math-SEARAG Deployment Playbook

This playbook is for publishing Math-SEARAG Learning Agent to a controlled
high-school education pilot.

## Repository

- GitHub repository: `liudejua27-blip/Math-ai`
- Product app root: `agent-engineering/frontend`
- Python verifier root: `math-own`
- Root GitHub Actions workflow: `.github/workflows/release-gate.yml`

The nested `agent-engineering/frontend/.github` workflow directory was removed
because GitHub Actions only reads workflows from the repository root.

## CI Gate

Every push to `main` runs:

```text
Frontend release gate:
  pnpm run release:env
  pnpm exec tsc --noEmit --incremental false
  pnpm run test:ai
  node scripts/release-smoke.mjs

Python verifier regression:
  python -m unittest discover -s tests
```

The frontend smoke test checks `/api/health`, `/workbench-preview`, and
`/geometry-lab` with browser automation. If the dedicated `agent-browser` CLI is
not available, the project uses Playwright through `release-smoke.mjs`.

## Vercel Project Settings

Create or update the Vercel project with:

```text
Framework Preset: Next.js
Root Directory: agent-engineering/frontend
Install Command: corepack pnpm install --frozen-lockfile
Build Command: corepack pnpm run build
Output Directory: .next
```

The current `vercel.json` lives in `agent-engineering/frontend` and declares the
Next.js framework.

## Required Production Environment

Configure these in Vercel before production deploy:

```text
AUTH_SECRET
AI_GATEWAY_API_KEY
POSTGRES_URL
REDIS_URL
```

Strongly recommended:

```text
BLOB_READ_WRITE_TOKEN
MATH_AGENT_BACKEND_URL
MATH_PYTHON_VERIFIER_ENABLED=true
MATH_REQUIRE_PYTHON_VERIFIER=false
MATH_DIAGNOSIS_MODEL=deepseek/deepseek-v4-flash
MATH_REVIEW_MODEL=deepseek/deepseek-v4-pro
MATH_TEACHING_STYLE=socratic
MATH_VISUAL_MODE=html_card
```

Run the strict gate after production variables are configured:

```powershell
cd agent-engineering/frontend
corepack pnpm run release:env:strict
```

## Python Verifier Deployment

For the first pilot, keep Python as a small verifier/toolbox service.

Local verifier:

```powershell
cd math-own
python backend/server.py --host 127.0.0.1 --port 8008
```

Production options:

- internal VM or container behind a private URL
- serverless Python function if cold-start latency is acceptable
- school-local deployment for privacy-sensitive pilots

Point `MATH_AGENT_BACKEND_URL` at the verifier health endpoint host. If the
verifier is not available, the frontend must show `not_checked` and must not
pretend symbolic verification passed.

## School Pilot Checklist

- GitHub Actions release gate is green on `main`.
- `corepack pnpm run release:env:strict` passes in the production environment.
- `/api/health` reports `releaseReady.minimumConfigReady=true`.
- `/workbench-preview` and `/geometry-lab` render on desktop and mobile.
- Human review process exists for low-confidence or high-stakes cases.
- Student data collection follows `05-education-safety-policy.md`.
- Teachers understand that the system is a thinking coach, not an official
  grading authority.
