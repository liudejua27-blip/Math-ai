import { auth } from "@/app/(auth)/auth";
import {
  getMathAgentRuntime,
  mathDiagnosisRequestSchema,
} from "@/lib/ai/runtime/math-agent-runtime";

export const maxDuration = 60;

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = mathDiagnosisRequestSchema.safeParse(json);

  if (!parsed.success) {
    return Response.json(
      {
        error: "bad_request",
        message: "Invalid math diagnosis event request.",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const session = await auth().catch(() => null);
  const shouldPersist = json?.persist !== false;
  const encoder = new TextEncoder();
  const runtime = getMathAgentRuntime();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const item of runtime.diagnoseEvents({
          ...parsed.data,
          studentId: shouldPersist
            ? parsed.data.studentId ?? session?.user?.id
            : undefined,
          chatId: shouldPersist ? parsed.data.chatId : undefined,
        })) {
          controller.enqueue(
            encoder.encode(`event: ${item.type}\ndata: ${JSON.stringify(item)}\n\n`)
          );
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `event: runtime_failed\ndata: ${JSON.stringify({
              error: error instanceof Error ? error.message : "Runtime failed.",
            })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
