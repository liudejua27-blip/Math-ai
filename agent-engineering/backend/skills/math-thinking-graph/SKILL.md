# Math Thinking Graph Skill

Use this skill when the agent needs to turn a high-school math diagnosis into a visible thinking graph, correction path, or explanation diagram.

This project skill adapts the diagram-first workflow pattern from `fireworks-tech-graph` and the role-routing pattern from Nature-style skill repositories, but narrows both to high-school math tutoring.

## Inputs

- Corrected problem text.
- Ordered student steps.
- First wrong step, if known.
- Misconception atoms.
- Strict checks and evidence nodes.
- Same-atom variants.

## Subagents

- `Problem Mapper`: extract goal, known conditions, hidden domain constraints, formula cues, and geometry cues.
- `Step Alignment Critic`: align student steps to the standard reasoning path and stop at the first unsupported step.
- `Evidence Gatekeeper`: attach every important claim to evidence, strict checks, or a confidence downgrade.
- `Misconception Coach`: map the failed step to one or more teachable misconception atoms.
- `Variant Designer`: generate variants that train the same atom rather than random neighboring skills.
- `Graph Renderer`: convert the diagnosis into a safe `MathThinkingGraphSpec`, never executable JavaScript.

## Graph Protocol

Return a JSON object with:

```json
{
  "type": "math_thinking_graph",
  "title": "思维图谱：定位 S2",
  "nodes": [
    {
      "id": "problem",
      "label": "题目",
      "kind": "problem",
      "status": "neutral",
      "description": "题目摘要"
    }
  ],
  "edges": [
    {
      "from": "problem",
      "to": "S2",
      "label": "推理对齐",
      "kind": "fails"
    }
  ]
}
```

Allowed node kinds: `problem`, `step`, `evidence`, `check`, `atom`, `variant`.

Allowed statuses: `pass`, `fail`, `warn`, `neutral`.

Allowed edge kinds: `supports`, `fails`, `causes`, `trains`.

## Layout Rules

1. Put the problem at the far left.
2. Put the first wrong step immediately after the problem.
3. Put failed or warning strict checks after the wrong step.
4. Put misconception atoms after the checks.
5. Put variants at the far right.
6. Keep labels short; put long text in `description`.
7. If confidence is low, use `warn` and ask for confirmation instead of forcing a fail node.

## Teaching Rules

- The graph is a thinking aid, not decoration.
- Use it to show where the student's reasoning disconnected from valid conditions.
- Do not show the full final answer before first wrong step diagnosis.
- Do not shame the student.
- Do not invent evidence nodes.
- Do not output raw SVG or executable JavaScript unless a trusted renderer requests it.

