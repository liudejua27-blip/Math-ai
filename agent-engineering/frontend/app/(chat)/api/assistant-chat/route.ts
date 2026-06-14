import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
} from "ai";
import { checkBotId } from "botid/server";
import { z } from "zod";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDiagnoseMathThinkingTool } from "@/lib/ai/tools/diagnose-math-thinking";
import { isProductionEnvironment } from "@/lib/constants";
import {
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

const assistantChatBodySchema = z.object({
  id: z.string().min(1),
  messages: z.array(z.custom<ChatMessage>()),
  trigger: z.string().optional(),
  messageId: z.string().optional(),
  metadata: z
    .object({
      selectedChatModel: z.string().optional(),
      selectedVisibilityType: z.enum(["private", "public"]).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  let requestBody: z.infer<typeof assistantChatBodySchema>;

  try {
    requestBody = assistantChatBodySchema.parse(await request.json());
  } catch (_) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const [, session] = await Promise.all([checkBotId().catch(() => null), auth()]);

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  await checkIpRateLimit(ipAddress(request));

  const userType: UserType = session.user.type;
  const messageCount = await getMessageCountByUserId({
    id: session.user.id,
    differenceInHours: 1,
  });

  if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
    return new ChatbotError("rate_limit:chat").toResponse();
  }

  const selectedChatModel =
    requestBody.metadata?.selectedChatModel ?? DEFAULT_CHAT_MODEL;
  const chatModel = allowedModelIds.has(selectedChatModel)
    ? selectedChatModel
    : DEFAULT_CHAT_MODEL;
  const selectedVisibilityType =
    requestBody.metadata?.selectedVisibilityType ?? "private";

  const chat = await getChatById({ id: requestBody.id });
  let titlePromise: Promise<string> | null = null;
  const lastMessage = requestBody.messages.at(-1);

  if (chat) {
    if (chat.userId !== session.user.id) {
      return new ChatbotError("forbidden:chat").toResponse();
    }
  } else if (lastMessage?.role === "user") {
    await saveChat({
      id: requestBody.id,
      userId: session.user.id,
      title: "New chat",
      visibility: selectedVisibilityType,
    });
    titlePromise = generateTitleFromUserMessage({ message: lastMessage });
  }

  if (lastMessage?.role === "user") {
    const messagesFromDb = chat
      ? await getMessagesByChatId({ id: requestBody.id })
      : [];
    const existingMessageIds = new Set(messagesFromDb.map((item) => item.id));
    if (!existingMessageIds.has(lastMessage.id)) {
      await saveMessages({
        messages: [
          {
            chatId: requestBody.id,
            id: lastMessage.id,
            role: "user",
            parts: lastMessage.parts,
            attachments: [],
            createdAt: new Date(),
          },
        ],
      });
    }
  }

  const { longitude, latitude, city, country } = geolocation(request);
  const requestHints: RequestHints = { longitude, latitude, city, country };
  const modelConfig = chatModels.find((model) => model.id === chatModel);
  const modelCapabilities = await getCapabilities();
  const capabilities = modelCapabilities[chatModel];
  const isReasoningModel = capabilities?.reasoning === true;
  const supportsTools = capabilities?.tools === true;
  const modelMessages = await convertToModelMessages(requestBody.messages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model: getLanguageModel(chatModel),
        system: systemPrompt({ requestHints, supportsTools }),
        messages: modelMessages,
        stopWhen: stepCountIs(5),
        experimental_activeTools:
          isReasoningModel && !supportsTools ? [] : ["diagnoseMathThinking"],
        providerOptions: {
          ...(modelConfig?.gatewayOrder && {
            gateway: { order: modelConfig.gatewayOrder },
          }),
          ...(modelConfig?.reasoningEffort && {
            openai: { reasoningEffort: modelConfig.reasoningEffort },
          }),
        },
        tools: {
          diagnoseMathThinking: createDiagnoseMathThinkingTool({
            studentId: session.user.id,
            chatId: requestBody.id,
          }),
        },
        experimental_telemetry: {
          isEnabled: isProductionEnvironment,
          functionId: "assistant-ui-stream-text",
        },
      });

      writer.merge(result.toUIMessageStream({ sendReasoning: isReasoningModel }));

      if (titlePromise) {
        try {
          const title = await titlePromise;
          writer.write({ type: "data-chat-title", data: title });
          updateChatTitleById({ chatId: requestBody.id, title });
        } catch (_) {
          /* title generation is non-fatal */
        }
      }
    },
    generateId: generateUUID,
    originalMessages: requestBody.messages,
    onFinish: async ({ messages }) => {
      const existingMessages = await getMessagesByChatId({ id: requestBody.id });
      const existingMessageIds = new Set(existingMessages.map((item) => item.id));
      const messagesToSave = messages
        .filter((message) => !existingMessageIds.has(message.id))
        .map((message) => ({
          id: message.id,
          role: message.role,
          parts: message.parts,
          createdAt: new Date(),
          attachments: [],
          chatId: requestBody.id,
        }));

      if (messagesToSave.length > 0) {
        await saveMessages({ messages: messagesToSave });
      }
    },
  });

  return createUIMessageStreamResponse({ stream });
}

export async function GET() {
  return new Response(null, { status: 204 });
}
