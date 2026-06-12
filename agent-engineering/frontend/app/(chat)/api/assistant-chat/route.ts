import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  streamText,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { getLanguageModel } from "@/lib/ai/providers";

export const maxDuration = 60;

const assistantSystemPrompt = `你是 Math-SEARAG AI 数学思维导师，面向中国高中数学学习。
核心规则：
1. 如果学生只给题目、没有写自己的步骤，先请学生补充解题思路，不直接给完整答案。
2. 如果学生写了步骤，先定位第一错步，再解释错因原子、验证链和下一步追问。
3. 用苏格拉底追问帮助学生自己修正；只有在学生确认订正后，再给同因变式。
4. 对图片、草稿纸或低置信 OCR 内容，必须先要求学生确认识别结果，不能直接诊断。
5. 回答要专业、简洁、有高中数学老师的判断力。`;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const messages = extractMessages(body);
  const lastUserText = extractLastUserText(messages);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (!canUseGateway()) {
        writeFallbackMessage(writer, buildLocalFallback(lastUserText));
        return;
      }

      try {
        const result = streamText({
          model: getLanguageModel(
            process.env.MATH_DIAGNOSIS_MODEL || DEFAULT_CHAT_MODEL
          ),
          system: assistantSystemPrompt,
          messages: await convertToModelMessages(messages),
        });

        writer.merge(result.toUIMessageStream({ sendReasoning: false }));
      } catch {
        writeFallbackMessage(
          writer,
          "当前模型网关不可用，我先按本地数学私教规则处理：请把题目和你的逐步解法贴上来。我会先找第一错步，再给你追问、订正路径和同因变式。"
        );
      }
    },
    generateId,
  });

  return createUIMessageStreamResponse({ stream });
}

function canUseGateway() {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim()
  );
}

function extractMessages(body: unknown): UIMessage[] {
  if (!body || typeof body !== "object") {
    return [];
  }

  const candidate = body as {
    messages?: unknown;
    message?: unknown;
  };

  if (Array.isArray(candidate.messages)) {
    return candidate.messages as UIMessage[];
  }

  if (candidate.message && typeof candidate.message === "object") {
    return [candidate.message as UIMessage];
  }

  return [];
}

function extractLastUserText(messages: UIMessage[]) {
  const message = [...messages].reverse().find((item) => item.role === "user");
  if (!message) {
    return "";
  }

  const parts = message.parts ?? [];
  const textFromParts = parts
    .map((part) => {
      if (part.type === "text") {
        return part.text;
      }
      return "";
    })
    .join("\n")
    .trim();

  if (textFromParts) {
    return textFromParts;
  }

  const legacyContent = (message as unknown as { content?: unknown }).content;
  return typeof legacyContent === "string" ? legacyContent : "";
}

function buildLocalFallback(lastUserText: string) {
  if (!lastUserText.trim()) {
    return "你好，我是 AI 数学思维导师。请把题目和你的解题步骤发给我。如果是草稿纸图片，请先上传图片，我会先让你确认识别出的题干、步骤和公式。";
  }

  const looksLikeSteps = /步骤|第一步|第二步|所以|因为|=>|=|≤|>=|求导|设/.test(
    lastUserText
  );

  if (!looksLikeSteps) {
    return `我看到了你的题目，但还没有看到你的解题过程。\n\n为了做“首错定位”，请你补充至少 2-3 行自己的思路，例如：\n\n1. 我先设 ...\n2. 然后把 ... 代入 ...\n3. 所以我得到 ...\n\n你补充步骤后，我会按“第一错步 -> 错因 -> 追问 -> 订正卡 -> 同因变式”的顺序诊断。`;
  }

  return `我已经收到你的题目和步骤。下一步我会按 Math-SEARAG 的诊断流程处理：\n\n1. 逐行对齐学生步骤，拆出每个数学 claim。\n2. 找到最早不成立的一句或一个表达式。\n3. 判断错因是定义域遗漏、等价变形错误、分类讨论缺失、条件转化错误，还是计算门禁失败。\n4. 给出一个追问，先帮你自己修正，而不是直接灌完整答案。\n\n本地预览模式不会编造验证结果；接入 AI Gateway 和 Python verifier 后，这里会显示完整 VerifierTrace 与订正卡。`;
}

function writeFallbackMessage(
  writer: UIMessageStreamWriter<UIMessage>,
  text: string
) {
  const id = generateId();
  writer.write({ type: "start" });
  writer.write({ type: "text-start", id });
  for (const delta of chunkText(text)) {
    writer.write({ type: "text-delta", id, delta });
  }
  writer.write({ type: "text-end", id });
  writer.write({ type: "finish", finishReason: "stop" });
}

function chunkText(text: string) {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += 48) {
    chunks.push(text.slice(index, index + 48));
  }
  return chunks;
}
