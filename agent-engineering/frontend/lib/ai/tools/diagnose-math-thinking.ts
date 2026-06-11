import { tool } from "ai";
import { z } from "zod";
import { runMathAgentDiagnosis } from "../runtime/math-agent-runtime";

export function createDiagnoseMathThinkingTool({
  studentId,
  chatId,
}: {
  studentId?: string;
  chatId?: string;
} = {}) {
  return tool({
    description:
      "Run the Math-SEARAG thinking diagnosis workflow for a high-school math problem and student steps. Use this before giving a final answer when the user asks for error diagnosis, first wrong step, misconception atoms, evidence chain, Socratic guidance, correction cards, or variants.",
    inputSchema: z.object({
      problemText: z.string().describe("Corrected problem text."),
      studentSteps: z
        .string()
        .describe("Student's step-by-step solution attempt."),
      confirmedEvidence: z
        .array(z.string())
        .describe("Confirmed low-confidence fields or evidence IDs.")
        .optional(),
      teachingStyle: z
        .literal("socratic")
        .describe("Teaching style. The first MVP only supports Socratic guidance.")
        .optional(),
      visualMode: z
        .literal("html_card")
        .describe("Visualization mode. The first MVP only supports HTML cards.")
        .optional(),
    }),
    execute: async ({
      problemText,
      studentSteps,
      confirmedEvidence,
      teachingStyle,
      visualMode,
    }) =>
      runMathAgentDiagnosis({
        problemText,
        studentSteps,
        studentId,
        chatId,
        confirmedEvidence,
        teachingStyle: teachingStyle ?? "socratic",
        visualMode: visualMode ?? "html_card",
      }),
  });
}

export const diagnoseMathThinking = createDiagnoseMathThinkingTool();
