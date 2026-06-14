import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { customProvider, gateway } from "ai";
import { isTestEnvironment } from "../constants";
import { titleModel } from "./models";

const deepSeekProvider = createOpenAICompatible({
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
  name: "deepseek",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

function shouldUseDeepSeekOfficial(modelId: string) {
  return (
    Boolean(process.env.DEEPSEEK_API_KEY?.trim()) &&
    !modelId.includes("/") &&
    modelId.startsWith("deepseek-")
  );
}

function toGatewayModelId(modelId: string) {
  if (!modelId.includes("/") && modelId.startsWith("deepseek-")) {
    return `deepseek/${modelId}`;
  }
  return modelId;
}

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  if (shouldUseDeepSeekOfficial(modelId)) {
    return deepSeekProvider.chatModel(modelId);
  }

  return gateway.languageModel(toGatewayModelId(modelId));
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  if (shouldUseDeepSeekOfficial(titleModel.id)) {
    return deepSeekProvider.chatModel(titleModel.id);
  }
  return gateway.languageModel(toGatewayModelId(titleModel.id));
}
