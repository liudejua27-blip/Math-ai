"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import {
  ArrowUpIcon,
  BrainIcon,
  EyeIcon,
  LockIcon,
  WrenchIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { useLocalStorage, useWindowSize } from "usehooks-ts";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import {
  type ChatModel,
  chatModels,
  DEFAULT_CHAT_MODEL,
  type ModelCapabilities,
} from "@/lib/ai/models";
import type {
  DraftOCRFormulaItem,
  DraftOCRPageBlock,
  DraftOCRResult,
  DraftOCRToolResult,
} from "@/lib/ai/draft-ocr-types";
import type { Attachment, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "../ai-elements/prompt-input";
import { Button } from "../ui/button";
import { PaperclipIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import {
  type SlashCommand,
  SlashCommandMenu,
  slashCommands,
} from "./slash-commands";
import { SuggestedActions } from "./suggested-actions";
import type { VisibilityType } from "./visibility-selector";

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  selectedModelId,
  onModelChange,
  editingMessage,
  onCancelEdit,
  isLoading,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage:
    | UseChatHelpers<ChatMessage>["sendMessage"]
    | (() => Promise<void>);
  className?: string;
  selectedVisibilityType: VisibilityType;
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  editingMessage?: ChatMessage | null;
  onCancelEdit?: () => void;
  isLoading?: boolean;
}) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (!hasAutoFocused.current && width) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
        hasAutoFocused.current = true;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [width]);

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      const finalValue = domValue || localStorageInput || "";
      setInput(finalValue);
    }
  }, [localStorageInput, setInput]);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = event.target.value;
    setInput(val);

    if (val.startsWith("/") && !val.includes(" ")) {
      setSlashOpen(true);
      setSlashQuery(val.slice(1));
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  };

  const handleSlashSelect = (cmd: SlashCommand) => {
    setSlashOpen(false);
    setInput("");
    switch (cmd.action) {
      case "new":
        router.push("/");
        break;
      case "clear":
        setMessages(() => []);
        break;
      case "rename":
        toast("Rename is available from the sidebar chat menu.");
        break;
      case "model": {
        const modelBtn = document.querySelector<HTMLButtonElement>(
          "[data-testid='model-selector']"
        );
        modelBtn?.click();
        break;
      }
      case "theme":
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        break;
      case "delete":
        toast("Delete this chat?", {
          action: {
            label: "Delete",
            onClick: () => {
              fetch(
                `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/chat?id=${chatId}`,
                { method: "DELETE" }
              );
              router.push("/");
              toast.success("Chat deleted");
            },
          },
        });
        break;
      case "purge":
        toast("Delete all chats?", {
          action: {
            label: "Delete all",
            onClick: () => {
              fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/history`, {
                method: "DELETE",
              });
              router.push("/");
              toast.success("All chats deleted");
            },
          },
        });
        break;
      default:
        break;
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [draftOCRResult, setDraftOCRResult] =
    useState<DraftOCRToolResult | null>(null);
  const [draftOCRSourceUrl, setDraftOCRSourceUrl] = useState<string | null>(null);
  const [draftOCRLoadingUrl, setDraftOCRLoadingUrl] = useState<string | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(0);

  const submitForm = useCallback(() => {
    window.history.pushState(
      {},
      "",
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/chat/${chatId}`
    );

    sendMessage({
      role: "user",
      parts: [
        ...attachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text",
          text: input,
        },
      ],
    });

    setAttachments([]);
    setLocalStorageInput("");
    setInput("");

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    input,
    setInput,
    attachments,
    sendMessage,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/files/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  const recognizeDraft = useCallback(async (attachment: Attachment) => {
    if (!attachment.contentType?.startsWith("image")) {
      toast.error("Only image attachments can be recognized as draft paper.");
      return;
    }

    setDraftOCRLoadingUrl(attachment.url);
    setDraftOCRResult(null);
    setDraftOCRSourceUrl(attachment.url);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/draft-ocr`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: attachment.url,
            fileName: attachment.name,
            mimeType: attachment.contentType,
            chatId,
          }),
        }
      );
      const result = (await response.json()) as DraftOCRToolResult;
      setDraftOCRResult(result);
      if ("error" in result) {
        toast.error(result.message);
      }
    } catch (_error) {
      toast.error("Draft OCR failed. Please enter the steps manually.");
      setDraftOCRResult({
        error: "draft_ocr_unavailable",
        message: "Draft OCR failed. Please enter the steps manually.",
      });
    } finally {
      setDraftOCRLoadingUrl(null);
    }
  }, [chatId]);

  const applyDraftOCRToInput = useCallback(async (confirmedResult: DraftOCRToolResult) => {
    if ("error" in confirmedResult) {
      return;
    }

    if (confirmedResult.sampleId) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/learning/draft-ocr-sample`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sampleId: confirmedResult.sampleId,
            confirmedResult,
          }),
        }
      ).catch(() => null);
    }

    const nextText = buildConfirmedDraftPrompt(confirmedResult);
    setInput(nextText);
    setLocalStorageInput(nextText);
    textareaRef.current?.focus();
  }, [setInput, setLocalStorageInput]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (_error) {
        toast.error("Failed to upload files");
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/")
      );

      if (imageItems.length === 0) {
        return;
      }

      event.preventDefault();

      setUploadQueue((prev) => [...prev, "Pasted image"]);

      try {
        const uploadPromises = imageItems
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
          .map((file) => uploadFile(file));

        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) =>
            attachment !== undefined &&
            attachment.url !== undefined &&
            attachment.contentType !== undefined
        );

        setAttachments((curr) => [
          ...curr,
          ...(successfullyUploadedAttachments as Attachment[]),
        ]);
      } catch (_error) {
        toast.error("Failed to upload pasted image(s)");
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      {editingMessage && onCancelEdit && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>Editing message</span>
          <button
            className="rounded px-1.5 py-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              onCancelEdit();
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      {!editingMessage &&
        !isLoading &&
        messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            sendMessage={sendMessage}
          />
        )}

      <input
        className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <div className="relative">
        {slashOpen && (
          <SlashCommandMenu
            onClose={() => setSlashOpen(false)}
            onSelect={handleSlashSelect}
            query={slashQuery}
            selectedIndex={slashIndex}
          />
        )}
      </div>

      <PromptInput
        className="[&>div]:rounded-2xl [&>div]:border [&>div]:border-border/30 [&>div]:bg-card/70 [&>div]:shadow-[var(--shadow-composer)] [&>div]:transition-shadow [&>div]:duration-300 [&>div]:focus-within:shadow-[var(--shadow-composer-focus)]"
        onSubmit={() => {
          if (input.startsWith("/")) {
            const query = input.slice(1).trim();
            const cmd = slashCommands.find((c) => c.name === query);
            if (cmd) {
              handleSlashSelect(cmd);
            }
            return;
          }
          if (!input.trim() && attachments.length === 0) {
            return;
          }
          if (status === "ready" || status === "error") {
            submitForm();
          } else {
            toast.error("Please wait for the model to finish its response!");
          }
        }}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex w-full self-start flex-row gap-2 overflow-x-auto px-3 pt-3 no-scrollbar"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <div className="grid shrink-0 gap-1" key={attachment.url}>
                <PreviewAttachment
                  attachment={attachment}
                  onRemove={() => {
                    setAttachments((currentAttachments) =>
                      currentAttachments.filter((a) => a.url !== attachment.url)
                    );
                    if (draftOCRSourceUrl === attachment.url) {
                      setDraftOCRResult(null);
                      setDraftOCRSourceUrl(null);
                    }
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                />
                {attachment.contentType?.startsWith("image") && (
                  <button
                    className="rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[11px] text-muted-foreground transition hover:text-foreground disabled:opacity-60"
                    disabled={draftOCRLoadingUrl === attachment.url}
                    onClick={() => recognizeDraft(attachment)}
                    type="button"
                  >
                    {draftOCRLoadingUrl === attachment.url
                      ? "识别中"
                      : "识别草稿"}
                  </button>
                )}
              </div>
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        {draftOCRResult && (
          <DraftOCRConfirmationCard
            onApply={applyDraftOCRToInput}
            onDismiss={() => setDraftOCRResult(null)}
            result={draftOCRResult}
          />
        )}
        <PromptInputTextarea
          className="min-h-24 text-[13px] leading-relaxed px-4 pt-3.5 pb-1.5 placeholder:text-muted-foreground/35"
          data-testid="multimodal-input"
          onChange={handleInput}
          onKeyDown={(e) => {
            if (slashOpen) {
              const filtered = slashCommands.filter((cmd) =>
                cmd.name.startsWith(slashQuery.toLowerCase())
              );
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSlashIndex((i) => Math.min(i + 1, filtered.length - 1));
                return;
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setSlashIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                if (filtered[slashIndex]) {
                  handleSlashSelect(filtered[slashIndex]);
                }
                return;
              }
              if (e.key === "Escape") {
                e.preventDefault();
                setSlashOpen(false);
                return;
              }
            }
            if (e.key === "Escape" && editingMessage && onCancelEdit) {
              e.preventDefault();
              onCancelEdit();
            }
          }}
          placeholder={
            editingMessage ? "Edit your message..." : "Ask anything..."
          }
          ref={textareaRef}
          value={input}
        />
        <PromptInputFooter className="px-3 pb-3">
          <PromptInputTools>
            <AttachmentsButton
              fileInputRef={fileInputRef}
              selectedModelId={selectedModelId}
              status={status}
            />
            <ModelSelectorCompact
              onModelChange={onModelChange}
              selectedModelId={selectedModelId}
            />
          </PromptInputTools>

          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : (
            <PromptInputSubmit
              className={cn(
                "h-7 w-7 rounded-xl transition-all duration-200",
                input.trim()
                  ? "bg-foreground text-background hover:opacity-85 active:scale-95"
                  : "bg-muted text-muted-foreground/25 cursor-not-allowed"
              )}
              data-testid="send-button"
              disabled={!input.trim() || uploadQueue.length > 0}
              status={status}
              variant="secondary"
            >
              <ArrowUpIcon className="size-4" />
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.selectedModelId !== nextProps.selectedModelId) {
      return false;
    }
    if (prevProps.editingMessage !== nextProps.editingMessage) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.messages.length !== nextProps.messages.length) {
      return false;
    }

    return true;
  }
);

function DraftOCRConfirmationCard({
  result,
  onApply,
  onDismiss,
}: {
  result: DraftOCRToolResult;
  onApply: (confirmedResult: DraftOCRToolResult) => void;
  onDismiss: () => void;
}) {
  if ("error" in result) {
    return (
      <div className="mx-3 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-2 text-amber-950 text-xs dark:bg-amber-950/20 dark:text-amber-100">
        <div className="font-medium">草稿 OCR 暂不可用</div>
        <div className="mt-1 leading-5">{result.message}</div>
        <button className="mt-2 underline" onClick={onDismiss} type="button">
          关闭
        </button>
      </div>
    );
  }

  return (
    <DraftOCREditorCard
      onApply={onApply}
      onDismiss={onDismiss}
      result={result}
    />
  );
}

type EditableDraftFormula = {
  id: string;
  latex: string;
  confidence: number;
};

type EditableDraftLine = {
  id: string;
  blockId: string;
  blockType: DraftOCRPageBlock["type"];
  text: string;
  confidence: number;
  formulas: EditableDraftFormula[];
};

function DraftOCREditorCard({
  result,
  onApply,
  onDismiss,
}: {
  result: DraftOCRResult;
  onApply: (confirmedResult: DraftOCRResult) => void;
  onDismiss: () => void;
}) {
  const initialLines = useMemo(() => buildEditableDraftLines(result), [result]);
  const [lines, setLines] = useState<EditableDraftLine[]>(initialLines);
  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);
  const lowConfidenceCount = lines.filter(
    (line) =>
      line.confidence < 0.82 ||
      line.formulas.some((formula) => formula.confidence < 0.82)
  ).length;

  const updateLine = useCallback(
    (lineId: string, patch: Partial<EditableDraftLine>) => {
      setLines((current) =>
        current.map((line) =>
          line.id === lineId ? { ...line, ...patch } : line
        )
      );
    },
    []
  );

  const updateFormula = useCallback(
    (lineId: string, formulaId: string, latex: string) => {
      setLines((current) =>
        current.map((line) =>
          line.id === lineId
            ? {
                ...line,
                formulas: line.formulas.map((formula) =>
                  formula.id === formulaId ? { ...formula, latex } : formula
                ),
              }
            : line
        )
      );
    },
    []
  );

  const confirmedResult = useMemo(
    () => buildEditedDraftResult(result, lines),
    [result, lines]
  );

  return (
    <div className="mx-3 rounded-lg border border-border/70 bg-background/85 px-3 py-2 text-xs shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">草稿 OCR 确认编辑器</div>
          <div className="mt-1 text-muted-foreground leading-5">
            置信度 {Math.round(result.confidence * 100)}% · {result.source} ·
            需重点核对 {lowConfidenceCount || result.lowConfidenceItems.length} 项
          </div>
          <div className="mt-1 text-muted-foreground leading-5">
            {result.sampleId
              ? `样本已进入 OCR 数据飞轮：${result.sampleId.slice(0, 8)}`
              : "当前仅本地确认，登录并配置数据库后可进入 OCR 数据飞轮。"}
          </div>
        </div>
        <button
          className="text-muted-foreground transition hover:text-foreground"
          onClick={onDismiss}
          type="button"
        >
          关闭
        </button>
      </div>
      <div className="mt-2 rounded-md border border-amber-300/40 bg-amber-50/60 px-2 py-1.5 text-amber-900 leading-5 dark:bg-amber-950/20 dark:text-amber-200">
        低置信 OCR 必须先确认。可逐行修改题干、学生步骤和公式 LaTeX，再进入首错定位。
      </div>
      <div className="mt-2 grid max-h-72 gap-2 overflow-y-auto rounded-md bg-muted/30 p-2">
        {lines.map((line) => (
          <div
            className={cn(
              "rounded-md border bg-background/80 p-2",
              line.confidence < 0.82
                ? "border-amber-300/60"
                : "border-border/60"
            )}
            key={line.id}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <select
                className="rounded-md border border-border/70 bg-background px-1.5 py-1 text-[11px]"
                onChange={(event) =>
                  updateLine(line.id, {
                    blockType: event.target.value as DraftOCRPageBlock["type"],
                  })
                }
                value={line.blockType}
              >
                <option value="problem">题干</option>
                <option value="student_step">学生步骤</option>
                <option value="formula">公式</option>
                <option value="scratch">草稿备注</option>
                <option value="unknown">待判断</option>
              </select>
              <span className="text-muted-foreground">
                置信度 {Math.round(line.confidence * 100)}%
              </span>
              {line.confidence < 0.82 && (
                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  请核对
                </span>
              )}
            </div>
            <textarea
              className="min-h-14 w-full resize-y rounded-md border border-border/60 bg-background px-2 py-1.5 leading-5 outline-none transition focus:border-foreground/50"
              onChange={(event) => updateLine(line.id, { text: event.target.value })}
              value={line.text}
            />
            {line.formulas.length > 0 && (
              <div className="mt-2 grid gap-1.5">
                {line.formulas.map((formula) => (
                  <label className="grid gap-1" key={formula.id}>
                    <span className="text-muted-foreground">
                      公式 LaTeX · 置信度 {Math.round(formula.confidence * 100)}%
                    </span>
                    <input
                      className="rounded-md border border-border/60 bg-background px-2 py-1.5 font-mono text-[12px] outline-none transition focus:border-foreground/50"
                      onChange={(event) =>
                        updateFormula(line.id, formula.id, event.target.value)
                      }
                      value={formula.latex}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {result.engineReports && result.engineReports.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {result.engineReports.map((engine) => (
            <span
              className={cn(
                "rounded-md border px-2 py-1 text-[11px]",
                engine.status === "completed" || engine.status === "active"
                  ? "border-emerald-300/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-200"
                  : engine.status === "planned"
                    ? "border-border bg-muted/40 text-muted-foreground"
                    : "border-amber-300/50 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-200"
              )}
              key={engine.id}
              title={engine.detail}
            >
              {engine.label}: {engine.status}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 text-amber-700 text-xs leading-5 dark:text-amber-300">
        {result.confirmationPrompt}
      </div>
      <button
        className="mt-2 rounded-md bg-foreground px-3 py-1.5 font-medium text-background text-xs"
        onClick={() => onApply(confirmedResult)}
        type="button"
      >
        我已逐行核对，填入输入框
      </button>
    </div>
  );
}

function buildConfirmedDraftPrompt(result: DraftOCRResult) {
  const formulas = result.pageBlocks
    .flatMap((block) =>
      block.lineItems.flatMap((line) =>
        line.formulaItems.map((formula) => formula.latex.trim()).filter(Boolean)
      )
    )
    .filter(Boolean);

  return [
    "请根据我确认后的草稿 OCR 内容进行数学思维诊断。",
    "",
    "【题目】",
    result.extractedProblemText || "（请在这里补充题目）",
    "",
    "【我的解题步骤】",
    result.extractedStudentSteps || "（请在这里补充自己的解题步骤）",
    "",
    ...(formulas.length
      ? ["【公式 LaTeX 校对】", formulas.map((formula) => `- ${formula}`).join("\n"), ""]
      : []),
    ...(result.sampleId ? ["【OCR样本ID】", result.sampleId, ""] : []),
    "【OCR确认】",
    result.requiresStudentConfirmation
      ? "我已逐行核对低置信 OCR 内容。请先按这些步骤做首错定位，低置信处需要在证据链中标注。"
      : "OCR 内容已确认。请进行首错定位、错因原子、验证链和同因变式。",
  ].join("\n");
}

function buildEditableDraftLines(result: DraftOCRResult): EditableDraftLine[] {
  return result.pageBlocks.flatMap((block) =>
    block.lineItems.length
      ? block.lineItems.map((line) => ({
          id: line.id,
          blockId: block.id,
          blockType: block.type,
          text: line.text,
          confidence: line.confidence,
          formulas: line.formulaItems.map((formula) => ({
            id: formula.id,
            latex: formula.latex,
            confidence: formula.confidence,
          })),
        }))
      : [
          {
            id: `${block.id}-line-1`,
            blockId: block.id,
            blockType: block.type,
            text: block.text,
            confidence: block.confidence,
            formulas: [],
          },
        ]
  );
}

function buildEditedDraftResult(
  result: DraftOCRResult,
  lines: EditableDraftLine[]
): DraftOCRResult {
  const pageBlocks = lines.map((line, index) =>
    rebuildDraftLineBlock(result, line, index)
  );
  const extractedProblemText = pageBlocks
    .filter((block) => block.type === "problem")
    .map((block) => block.text)
    .filter(Boolean)
    .join("\n");
  const extractedStudentSteps = pageBlocks
    .filter((block) => block.type === "student_step" || block.type === "formula")
    .map((block) => block.text)
    .filter(Boolean)
    .join("\n");

  return {
    ...result,
    pageBlocks,
    status: "needs_confirmation",
    extractedProblemText,
    extractedStudentSteps,
    requiresStudentConfirmation: true,
    confirmationPrompt: "学生已在确认编辑器中逐行核对 OCR 内容。",
    lowConfidenceItems: result.lowConfidenceItems,
  };
}

function rebuildDraftLineBlock(
  result: DraftOCRResult,
  line: EditableDraftLine,
  index: number
): DraftOCRPageBlock {
  const originalBlock = result.pageBlocks.find((block) => block.id === line.blockId);
  const originalLine = originalBlock?.lineItems.find((item) => item.id === line.id);
  const formulaItems = line.formulas.map((formula) => {
    const originalFormula =
      originalLine?.formulaItems.find((item) => item.id === formula.id) ??
      ({ id: formula.id, text: formula.latex } as DraftOCRFormulaItem);
    return {
      ...originalFormula,
      latex: formula.latex,
      text: formula.latex,
    };
  });

  return {
    ...(originalBlock ?? {
      id: line.blockId,
      order: index + 1,
      text: line.text,
      confidence: line.confidence,
      lineItems: [],
    }),
    id: `${line.blockId}-${line.id}`,
    type: line.blockType,
    order: index + 1,
    text: line.text,
    confidence: line.confidence,
    lineItems: [
      {
        ...(originalLine ?? {
          id: line.id,
          order: index + 1,
          confidence: line.confidence,
          formulaItems: [],
        }),
        text: line.text,
        formulaItems,
      },
    ],
  };
}

function PureAttachmentsButton({
  fileInputRef,
  status,
  selectedModelId,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
  selectedModelId: string;
}) {
  const { data: modelsResponse } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 }
  );

  const caps: Record<string, ModelCapabilities> | undefined =
    modelsResponse?.capabilities ?? modelsResponse;
  const hasVision = caps?.[selectedModelId]?.vision ?? false;

  return (
    <Button
      className={cn(
        "h-7 w-7 rounded-lg border border-border/40 p-1 transition-colors",
        hasVision
          ? "text-foreground hover:border-border hover:text-foreground"
          : "text-muted-foreground/30 cursor-not-allowed"
      )}
      data-testid="attachments-button"
      disabled={status !== "ready" || !hasVision}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureModelSelectorCompact({
  selectedModelId,
  onModelChange,
}: {
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: modelsData } = useSWR(
    `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/models`,
    (url: string) => fetch(url).then((r) => r.json()),
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 }
  );

  const capabilities: Record<string, ModelCapabilities> | undefined =
    modelsData?.capabilities ?? modelsData;
  const dynamicModels: ChatModel[] | undefined = modelsData?.models;
  const activeModels = dynamicModels ?? chatModels;

  const selectedModel =
    activeModels.find((m: ChatModel) => m.id === selectedModelId) ??
    activeModels.find((m: ChatModel) => m.id === DEFAULT_CHAT_MODEL) ??
    activeModels[0];
  const [provider] = selectedModel.id.split("/");

  return (
    <ModelSelector onOpenChange={setOpen} open={open}>
      <ModelSelectorTrigger asChild>
        <Button
          className="h-7 max-w-[200px] justify-between gap-1.5 rounded-lg px-2 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          data-testid="model-selector"
          variant="ghost"
        >
          {provider && <ModelSelectorLogo provider={provider} />}
          <ModelSelectorName>{selectedModel.name}</ModelSelectorName>
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList>
          {(() => {
            const curatedIds = new Set(chatModels.map((m) => m.id));
            const allModels = dynamicModels
              ? [
                  ...chatModels,
                  ...dynamicModels.filter((m) => !curatedIds.has(m.id)),
                ]
              : chatModels;

            const grouped: Record<
              string,
              { model: ChatModel; curated: boolean }[]
            > = {};
            for (const model of allModels) {
              const key = curatedIds.has(model.id)
                ? "_available"
                : model.provider;
              if (!grouped[key]) {
                grouped[key] = [];
              }
              grouped[key].push({ model, curated: curatedIds.has(model.id) });
            }

            const sortedKeys = Object.keys(grouped).sort((a, b) => {
              if (a === "_available") {
                return -1;
              }
              if (b === "_available") {
                return 1;
              }
              return a.localeCompare(b);
            });

            const providerNames: Record<string, string> = {
              alibaba: "Alibaba",
              anthropic: "Anthropic",
              "arcee-ai": "Arcee AI",
              bytedance: "ByteDance",
              cohere: "Cohere",
              deepseek: "DeepSeek",
              google: "Google",
              inception: "Inception",
              kwaipilot: "Kwaipilot",
              meituan: "Meituan",
              meta: "Meta",
              minimax: "MiniMax",
              mistral: "Mistral",
              moonshotai: "Moonshot",
              morph: "Morph",
              nvidia: "Nvidia",
              openai: "OpenAI",
              perplexity: "Perplexity",
              "prime-intellect": "Prime Intellect",
              xiaomi: "Xiaomi",
              xai: "xAI",
              zai: "Zai",
            };

            return sortedKeys.map((key) => (
              <ModelSelectorGroup
                heading={
                  key === "_available"
                    ? "Available"
                    : (providerNames[key] ?? key)
                }
                key={key}
              >
                {grouped[key].map(({ model, curated }) => {
                  const logoProvider = model.id.split("/")[0];
                  return (
                    <ModelSelectorItem
                      className={cn(
                        "flex w-full",
                        model.id === selectedModel.id &&
                          "border-b border-dashed border-foreground/50",
                        !curated && "opacity-40 cursor-default"
                      )}
                      key={model.id}
                      onSelect={() => {
                        if (!curated) {
                          return;
                        }
                        onModelChange?.(model.id);
                        setCookie("chat-model", model.id);
                        setOpen(false);
                        setTimeout(() => {
                          document
                            .querySelector<HTMLTextAreaElement>(
                              "[data-testid='multimodal-input']"
                            )
                            ?.focus();
                        }, 50);
                      }}
                      value={model.id}
                    >
                      <ModelSelectorLogo provider={logoProvider} />
                      <ModelSelectorName>{model.name}</ModelSelectorName>
                      <div className="ml-auto flex items-center gap-2 text-foreground/70">
                        {capabilities?.[model.id]?.tools && (
                          <WrenchIcon className="size-3.5" />
                        )}
                        {capabilities?.[model.id]?.vision && (
                          <EyeIcon className="size-3.5" />
                        )}
                        {capabilities?.[model.id]?.reasoning && (
                          <BrainIcon className="size-3.5" />
                        )}
                        {!curated && (
                          <LockIcon className="size-3 text-muted-foreground/50" />
                        )}
                      </div>
                    </ModelSelectorItem>
                  );
                })}
              </ModelSelectorGroup>
            ));
          })()}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
}

const ModelSelectorCompact = memo(PureModelSelectorCompact);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <Button
      className="h-7 w-7 rounded-xl bg-foreground p-1 text-background transition-all duration-200 hover:opacity-85 active:scale-95 disabled:bg-muted disabled:text-muted-foreground/25 disabled:cursor-not-allowed"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

const StopButton = memo(PureStopButton);
