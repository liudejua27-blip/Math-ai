# Math-SEARAG Education Safety Policy

This document defines the minimum safety policy before Math-SEARAG Learning
Agent is shown to real high-school students.

## Product Boundary

Math-SEARAG is a high-school mathematics thinking coach. It diagnoses student
reasoning, highlights the first wrong step, asks Socratic questions, generates
safe correction cards, and recommends same-cause variants.

It is not a replacement for a teacher, a grading authority, a mental health
assistant, or an exam cheating tool.

## Required Tutoring Rules

- If the student provides only a problem, ask for their steps first.
- If steps exist, call the diagnosis workflow before giving instruction.
- Show the first wrong step, evidence, and verifier status before explanation.
- Do not show a full solution when `canShowFullSolution=false`.
- Use Socratic prompts before direct correction whenever confidence is adequate.
- If confidence is low or `needHumanReview=true`, ask for confirmation or route
  to a teacher/operator review state.
- If the Python verifier is unavailable, display `not_checked`; never imply a
  mathematical claim has passed verification.

## Data And Privacy

- Do not commit `.env` files, API keys, database URLs, raw student exports, or
  private school data.
- Store only the minimum learner data needed for diagnosis and progress:
  misconception atom, topic, mastery delta, transfer result, timestamp, and
  anonymized student id where possible.
- Avoid collecting real names, school ids, phone numbers, parent contact
  details, payment data, or exact classroom rosters in the product prototype.
- Delete or anonymize pilot records when they are no longer needed for product
  validation.

## Human Review

Human review is required when any of the following are true:

- `needHumanReview=true`
- verifier traces contain `fail` or `not_checked` for a key mathematical claim
- the diagnosis result conflicts with the student's stated reasoning
- the student is preparing for a live exam or high-stakes assessment
- the model recommends a remediation path outside the current syllabus

## Geometry And Visual Safety

- Geometry visuals must use structured `GeometrySceneSpec`.
- The model may not generate arbitrary `script`, `code`, or `javascript` fields.
- Every task must bind `correctRefs` and evidence ids.
- Visual hints should show relations, planes, auxiliary lines, and viewpoints;
  they should not bypass the reasoning step with a finished answer.

## Release Gate

Before a school pilot:

```powershell
cd agent-engineering/frontend
corepack pnpm run release:env:strict
corepack pnpm run test:release

cd ../../math-own
python -m unittest discover -s tests
```

The pilot operator should also check `/api/health`, `/workbench-preview`, and
`/geometry-lab` in the deployed environment.
