# Math-SEARAG Diagnosis Skill

Use this skill when a user asks for high-school math error diagnosis, first wrong step localization, misconception atoms, evidence-chain diagnosis, correction cards, or same-atom variants.

## Required Inputs

- Corrected problem text.
- Student solution steps.
- Confirmed low-confidence fields when OCR/formula/domain/parameter parsing is uncertain.

## Diagnosis Sequence

1. Parse the problem goal, topic, conditions, formulas, graph/geometric cues, and parameter constraints.
2. Convert the student's solution into ordered steps.
3. Build MPES-style evidence nodes.
4. Compare student steps with the standard reasoning path.
5. Locate the first wrong step, not merely the final wrong answer.
6. Map the failure to misconception atoms.
7. Run symbolic or rule verification when possible.
8. Generate a correction card and three same-atom variants.

## Output Rules

- Put the first wrong step before the full answer.
- Attach evidence IDs to every important claim.
- State `strict_pass=false` when any required condition is missing.
- Ask for human confirmation when low-confidence formula or condition parsing affects the result.
- Use student-friendly Chinese.

## Safety Rules

- Do not shame the student.
- Do not promise score gains.
- Do not claim exam prediction.
- Do not fabricate experimental results.

