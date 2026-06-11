# Codex-Web Inspired Agent Host

Reference: https://github.com/0xcaff/codex-web

This document translates the "Codex Desktop in the browser" idea into Math-SEARAG terms.

## Core Idea

The browser should be a control plane, not the agent brain. Math-SEARAG should keep the student UI in the browser while the long-running diagnosis runtime, tools, approvals, persistence, and trace replay live behind a controlled host boundary.

## What Math-SEARAG Already Has

- Browser workbench: the student uses the Next.js workbench as the learning control surface.
- Runtime host: `MathAgentRuntime` owns diagnosis runs, status, control actions, and trace replay.
- Event stream: `/api/math-diagnosis/events` streams runtime/workflow/tool events into the UI.
- Inspector: `AgentInspector` shows live events, verifier traces, learner memory, and control actions.
- Tool boundary: Python verifier access goes through a typed runtime adapter.
- Persistence boundary: final diagnosis sessions and learning memory are written by server-side queries.

## Browserized Host Contract

The browserized host model is represented by `browserized-agent-host.ts`.

- `browser_console`: student controls the learning run from the browser.
- `controlled_runtime`: MathAgentRuntime runs on the server side.
- `event_stream`: SSE carries observable execution events.
- `trace_replay`: replayable events can be inspected after a run.
- `persistent_history`: final diagnosis results can be recovered from history.
- `human_approval`: evidence confirmation, review, retry, and rejection remain explicit actions.
- `tool_bridge`: Python verifier and future OCR/geometry tools stay behind adapters.

## What Not To Copy

- Do not copy codex-web source files without license review.
- Do not expose unrestricted shell or filesystem access to students.
- Do not run arbitrary model-generated JavaScript in the browser.
- Do not treat the browser as a trusted agent runtime.

## Next Steps

1. Move runtime run records from in-memory singleton to durable storage.
2. Add `/api/math-runtime/runs/:id` for reconnect and trace replay.
3. Add approval records for confirm evidence, reject diagnosis, request human review, and resume.
4. Add a teacher-safe trace export that hides raw implementation details.
5. Add a sandboxed tool bridge only for controlled OCR/geometry/verifier tasks.
