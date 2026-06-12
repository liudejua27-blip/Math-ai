"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { Thread } from "@/components/assistant-ui/thread";
import { AgentProcessRibbon } from "@/components/assistant-ui/agent-process-ribbon";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

export function MathAgentAssistant() {
  const runtime = useChatRuntime({
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new AssistantChatTransport({
      api: "/api/assistant-chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full bg-background pr-0.5">
          <ThreadListSidebar />
          <SidebarInset className="flex h-dvh flex-col">
            <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold text-sm">
                  AI 数学思维导师
                </span>
                <span className="truncate text-muted-foreground text-xs">
                  上传草稿、输入步骤，先定位第一错步，再进入追问和变式训练
                </span>
              </div>
            </header>
            <AgentProcessRibbon />
            <main className="min-h-0 flex-1 overflow-hidden">
              <Thread />
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
}
