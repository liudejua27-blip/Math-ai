# Math-SEARAG UI Architecture Notes

## References

- assistant-ui: https://github.com/assistant-ui/assistant-ui
- ChatGPT-Next-Web / NextChat: https://github.com/ChatGPTNextWeb/NextChat
- chatgpt-web: https://github.com/Chanzhaoyu/chatgpt-web

## What We Borrowed

These repositories are used as architecture and product references, not source-code bases.

- assistant-ui: thread-first UI, runtime abstraction, composer/action separation, tool-call visibility, and reusable assistant primitives.
- NextChat / gpt-web style projects: lightweight session shell, compact settings/actions, fast chat navigation, and clear conversation state.

## What Math-SEARAG Implements Instead

- `ChatShell` remains the product workbench root instead of adopting a generic chat shell.
- `MathAgentRuntime` remains the agent runtime source of truth for diagnosis events.
- `AgentInspector` remains the right-side observability surface.
- `AgentRunRibbon` is the center-canvas runtime strip inspired by assistant-ui's thread/runtime discipline.
- `agent-run-view-model.ts` converts raw `WorkbenchEvent[]` into UI-ready phase, status, and tool receipt state.

## Guardrails

- Do not copy Electron runtime code from any GUI project.
- Do not copy repository source files without a license review.
- Keep Math-SEARAG domain concepts first: Step Alignment, VerifierTrace, SocraticPolicy, LearnerMemory, RemediationLoop, and Geometry Lab.
- Keep the runtime observable: tool start/end/failure, verification, policy, memory, persistence, control actions, and replayable trace events.

## Next UI Direction

- Convert more message UI into reusable thread primitives: `MathThread`, `MathComposer`, `MathToolReceipt`, `MathActionBar`.
- Add keyboard-accessible action bar items for: confirm evidence, reject diagnosis, request review, continue variant, and replay trace.
- Add a teacher/parent report view that consumes the same diagnosis result but hides technical trace details by default.
