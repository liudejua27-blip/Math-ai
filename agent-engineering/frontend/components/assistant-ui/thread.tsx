import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";
import { MarkdownText } from "@/components/assistant-ui/markdown-text";
import { ToolFallback } from "@/components/assistant-ui/tool-fallback";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DraftOCRConfirmation } from "./draft-ocr-confirmation";
import {
  ActionBarMorePrimitive,
  ActionBarPrimitive,
  AuiIf,
  type AssistantState,
  BranchPickerPrimitive,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DownloadIcon,
  MicIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import type { FC } from "react";

const isNewChatView = (state: AssistantState) =>
  state.thread.messages.length === 0 &&
  (!state.thread.isLoading || state.threads.isLoading);

export const Thread: FC<{ chatId: string }> = ({ chatId }) => {
  const isEmpty = useAuiState(isNewChatView);

  return (
    <ThreadPrimitive.Root
      className="aui-root aui-thread-root bg-background @container flex h-full flex-col"
      style={{
        ["--thread-max-width" as string]: "44rem",
        ["--composer-padding" as string]: "8px",
      }}
    >
      <ThreadPrimitive.Viewport
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
        data-slot="aui_thread-viewport"
        turnAnchor="top"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-(--thread-max-width) flex-1 flex-col px-4 pt-4",
            isEmpty && "justify-center"
          )}
        >
          <AuiIf condition={isNewChatView}>
            <ThreadWelcome />
          </AuiIf>

          <div
            className="mb-14 flex flex-col gap-y-6 empty:hidden"
            data-slot="aui_message-group"
          >
            <ThreadPrimitive.Messages>
              {() => <ThreadMessage />}
            </ThreadPrimitive.Messages>
          </div>

          <ThreadPrimitive.ViewportFooter
            className={cn(
              "aui-thread-viewport-footer bg-background flex flex-col gap-4 overflow-visible pb-4 md:pb-6",
              !isEmpty && "sticky bottom-0 mt-auto rounded-t-xl"
            )}
          >
            <ThreadScrollToBottom />
            <Composer chatId={chatId} />
            <AuiIf condition={(state) => isNewChatView(state) && state.composer.isEmpty}>
              <ThreadSuggestions />
            </AuiIf>
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
};

const ThreadMessage: FC = () => {
  const role = useAuiState((state) => state.message.role);
  const isEditing = useAuiState((state) => state.message.composer.isEditing);

  if (isEditing) {
    return <EditComposer />;
  }

  return role === "user" ? <UserMessage /> : <AssistantMessage />;
};

const ThreadScrollToBottom: FC = () => (
  <ThreadPrimitive.ScrollToBottom asChild>
    <TooltipIconButton
      className="aui-thread-scroll-to-bottom dark:border-border dark:bg-background dark:hover:bg-accent absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      tooltip="回到底部"
      variant="outline"
    >
      <ArrowDownIcon />
    </TooltipIconButton>
  </ThreadPrimitive.ScrollToBottom>
);

const ThreadWelcome: FC = () => (
  <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
    <h1 className="aui-thread-welcome-message-inner fade-in slide-in-from-bottom-1 animate-in fill-mode-both text-2xl font-semibold duration-200">
      今天想诊断哪一道高中数学题？
    </h1>
    <p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
      输入题目和你的解题步骤，或者上传草稿纸图片。我会先定位第一错步，再用追问、订正卡和同因变式帮你修复思路。
    </p>
  </div>
);

const ThreadSuggestions: FC = () => (
  <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4">
    <ThreadPrimitive.Suggestions>
      {() => <ThreadSuggestionItem />}
    </ThreadPrimitive.Suggestions>
  </div>
);

const ThreadSuggestionItem: FC = () => (
  <div className="aui-thread-welcome-suggestion-display fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200">
    <SuggestionPrimitive.Trigger send asChild>
      <Button
        className="aui-thread-welcome-suggestion text-foreground hover:bg-muted border-border/60 h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
        variant="ghost"
      >
        <SuggestionPrimitive.Title className="aui-thread-welcome-suggestion-text-1" />
        <SuggestionPrimitive.Description className="aui-thread-welcome-suggestion-text-2 empty:hidden" />
      </Button>
    </SuggestionPrimitive.Trigger>
  </div>
);

const Composer: FC<{ chatId: string }> = ({ chatId }) => (
  <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
    <ComposerPrimitive.AttachmentDropzone asChild>
      <div
        className="bg-background border-border/60 data-[dragging=true]:border-ring data-[dragging=true]:bg-accent/50 focus-within:border-border dark:border-muted-foreground/15 dark:bg-muted/30 dark:focus-within:border-muted-foreground/30 flex w-full flex-col gap-2 rounded-3xl border p-(--composer-padding) shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] focus-within:shadow-[0_6px_24px_-8px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.05)] data-[dragging=true]:border-dashed dark:shadow-none"
        data-slot="aui_composer-shell"
      >
        <ComposerAttachments />
        <ComposerPrimitive.Input
          aria-label="数学题目和解题步骤输入框"
          className="aui-composer-input placeholder:text-muted-foreground/80 max-h-32 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base outline-none"
          placeholder="输入题目、你的解题步骤，或上传草稿纸图片"
          rows={1}
          suppressHydrationWarning
        />
        <ComposerAction chatId={chatId} />
      </div>
    </ComposerPrimitive.AttachmentDropzone>
  </ComposerPrimitive.Root>
);

const ComposerAction: FC<{ chatId: string }> = ({ chatId }) => (
  <div className="aui-composer-action-wrapper relative flex items-center justify-between">
    <div className="flex items-center gap-2">
      <ComposerAddAttachment />
      <DraftOCRConfirmation chatId={chatId} />
    </div>
    <div className="flex items-center gap-1.5">
      <AuiIf condition={(state) => state.thread.capabilities.dictation}>
        <AuiIf condition={(state) => state.composer.dictation == null}>
          <ComposerPrimitive.Dictate asChild>
            <TooltipIconButton
              aria-label="开始语音输入"
              className="aui-composer-dictate size-7 rounded-full"
              side="bottom"
              size="icon"
              tooltip="语音输入"
              type="button"
              variant="ghost"
            >
              <MicIcon className="aui-composer-dictate-icon size-4" />
            </TooltipIconButton>
          </ComposerPrimitive.Dictate>
        </AuiIf>
        <AuiIf condition={(state) => state.composer.dictation != null}>
          <ComposerPrimitive.StopDictation asChild>
            <TooltipIconButton
              aria-label="停止语音输入"
              className="aui-composer-stop-dictation text-destructive size-7 rounded-full"
              side="bottom"
              size="icon"
              tooltip="停止语音输入"
              type="button"
              variant="ghost"
            >
              <SquareIcon className="aui-composer-stop-dictation-icon size-3.5 animate-pulse fill-current" />
            </TooltipIconButton>
          </ComposerPrimitive.StopDictation>
        </AuiIf>
      </AuiIf>
      <AuiIf condition={(state) => !state.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            aria-label="发送消息"
            className="aui-composer-send size-7 rounded-full"
            side="bottom"
            size="icon"
            tooltip="发送"
            type="button"
            variant="default"
          >
            <ArrowUpIcon className="aui-composer-send-icon size-4.5" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(state) => state.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            aria-label="停止生成"
            className="aui-composer-cancel size-7 rounded-full"
            size="icon"
            type="button"
            variant="default"
          >
            <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  </div>
);

const MessageError: FC = () => (
  <MessagePrimitive.Error>
    <ErrorPrimitive.Root className="aui-message-error-root border-destructive bg-destructive/10 text-destructive dark:bg-destructive/5 mt-2 rounded-md border p-3 text-sm dark:text-red-200">
      <ErrorPrimitive.Message className="aui-message-error-message line-clamp-2" />
    </ErrorPrimitive.Root>
  </MessagePrimitive.Error>
);

const AssistantMessage: FC = () => {
  const actionBarHeight = "-mb-7.5 min-h-7.5 pt-1.5";

  return (
    <MessagePrimitive.Root
      className="fade-in slide-in-from-bottom-1 animate-in relative duration-150"
      data-role="assistant"
      data-slot="aui_assistant-message-root"
    >
      <div
        className="text-foreground px-2 leading-relaxed wrap-break-word [contain-intrinsic-size:auto_24px] [content-visibility:auto]"
        data-slot="aui_assistant-message-content"
      >
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") {
              return <MarkdownText />;
            }
            if (part.type === "tool-call") {
              return part.toolUI ?? <ToolFallback {...part} />;
            }
            return null;
          }}
        </MessagePrimitive.Parts>
        <AuiIf
          condition={(state) =>
            state.message.status?.type === "running" &&
            state.message.parts.length === 0
          }
        >
          <span
            aria-label="AI 数学思维导师正在分析"
            className="animate-pulse font-sans"
            data-slot="aui_assistant-message-indicator"
          >
            ●
          </span>
        </AuiIf>
        <MessageError />
      </div>

      <div
        className={cn("ms-2 flex items-center", actionBarHeight)}
        data-slot="aui_assistant-message-footer"
      >
        <BranchPicker />
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
};

const AssistantActionBar: FC = () => (
  <ActionBarPrimitive.Root
    autohide="not-last"
    className="aui-assistant-action-bar-root text-muted-foreground animate-in fade-in col-start-3 row-start-2 -ms-1 flex gap-1 duration-200"
    hideWhenRunning
  >
    <ActionBarPrimitive.Copy asChild>
      <TooltipIconButton tooltip="复制">
        <AuiIf condition={(state) => state.message.isCopied}>
          <CheckIcon className="animate-in zoom-in-50 fade-in duration-200 ease-out" />
        </AuiIf>
        <AuiIf condition={(state) => !state.message.isCopied}>
          <CopyIcon className="animate-in zoom-in-75 fade-in duration-150" />
        </AuiIf>
      </TooltipIconButton>
    </ActionBarPrimitive.Copy>
    <ActionBarPrimitive.Reload asChild>
      <TooltipIconButton tooltip="重新生成">
        <RefreshCwIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Reload>
    <ActionBarMorePrimitive.Root>
      <ActionBarMorePrimitive.Trigger asChild>
        <TooltipIconButton
          className="data-[state=open]:bg-accent"
          tooltip="更多"
        >
          <MoreHorizontalIcon />
        </TooltipIconButton>
      </ActionBarMorePrimitive.Trigger>
      <ActionBarMorePrimitive.Content
        align="start"
        className="aui-action-bar-more-content bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
        side="bottom"
        sideOffset={6}
      >
        <ActionBarPrimitive.ExportMarkdown asChild>
          <ActionBarMorePrimitive.Item className="aui-action-bar-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none">
            <DownloadIcon className="size-4" />
            导出 Markdown
          </ActionBarMorePrimitive.Item>
        </ActionBarPrimitive.ExportMarkdown>
      </ActionBarMorePrimitive.Content>
    </ActionBarMorePrimitive.Root>
  </ActionBarPrimitive.Root>
);

const UserMessage: FC = () => (
  <MessagePrimitive.Root
    className="fade-in slide-in-from-bottom-1 animate-in grid auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 duration-150 [contain-intrinsic-size:auto_60px] [content-visibility:auto] [&:where(>*)]:col-start-2"
    data-role="user"
    data-slot="aui_user-message-root"
  >
    <UserMessageAttachments />

    <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
      <div className="aui-user-message-content peer bg-muted text-foreground rounded-xl px-4 py-2 wrap-break-word empty:hidden">
        <MessagePrimitive.Parts />
      </div>
      <div className="aui-user-action-bar-wrapper absolute start-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
        <UserActionBar />
      </div>
    </div>

    <BranchPicker
      className="col-span-full col-start-1 row-start-3 -me-1 justify-end"
      data-slot="aui_user-branch-picker"
    />
  </MessagePrimitive.Root>
);

const UserActionBar: FC = () => (
  <ActionBarPrimitive.Root
    autohide="not-last"
    className="aui-user-action-bar-root flex flex-col items-end"
    hideWhenRunning
  >
    <ActionBarPrimitive.Edit asChild>
      <TooltipIconButton className="aui-user-action-edit" tooltip="编辑">
        <PencilIcon />
      </TooltipIconButton>
    </ActionBarPrimitive.Edit>
  </ActionBarPrimitive.Root>
);

const EditComposer: FC = () => (
  <MessagePrimitive.Root
    className="flex flex-col px-2"
    data-slot="aui_edit-composer-wrapper"
  >
    <ComposerPrimitive.Root className="aui-edit-composer-root bg-background border-border/60 dark:border-muted-foreground/15 dark:bg-muted/30 ms-auto flex w-full max-w-[85%] flex-col rounded-3xl border shadow-[0_4px_16px_-8px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none">
      <ComposerPrimitive.Input
        className="aui-edit-composer-input text-foreground min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none"
        suppressHydrationWarning
      />
      <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
        <ComposerPrimitive.Cancel asChild>
          <Button className="h-8 rounded-full px-3.5" size="sm" variant="ghost">
            取消
          </Button>
        </ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send asChild>
          <Button className="h-8 rounded-full px-3.5" size="sm">
            更新
          </Button>
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  </MessagePrimitive.Root>
);

const BranchPicker: FC<BranchPickerPrimitive.Root.Props> = ({
  className,
  ...rest
}) => (
  <BranchPickerPrimitive.Root
    className={cn(
      "aui-branch-picker-root text-muted-foreground -ms-2 me-2 inline-flex items-center text-xs",
      className
    )}
    hideWhenSingleBranch
    {...rest}
  >
    <BranchPickerPrimitive.Previous asChild>
      <TooltipIconButton tooltip="上一条分支">
        <ChevronLeftIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Previous>
    <span className="aui-branch-picker-state font-medium">
      <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
    </span>
    <BranchPickerPrimitive.Next asChild>
      <TooltipIconButton tooltip="下一条分支">
        <ChevronRightIcon />
      </TooltipIconButton>
    </BranchPickerPrimitive.Next>
  </BranchPickerPrimitive.Root>
);
