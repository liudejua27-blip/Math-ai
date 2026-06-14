"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import {
  BrainCircuitIcon,
  ClockIcon,
  FlaskConicalIcon,
  PanelRightIcon,
  UserRoundIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import useSWR from "swr";
import { AgentInspector } from "@/components/learning-workbench/agent-inspector";
import { Button } from "@/components/ui/button";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import type { MathDiagnosisToolResult } from "@/lib/ai/math-diagnosis-types";
import type { ChatMessage } from "@/lib/types";
import { fetcher, generateUUID } from "@/lib/utils";
import { AgentProcessRibbon } from "./agent-process-ribbon";
import { Thread } from "./thread";
import { ThreadListSidebar } from "./threadlist-sidebar";

export type MathAgentDrawer =
  | "inspector"
  | "learner-memory"
  | "history"
  | "geometry-lab"
  | null;

type MathAgentDrawerEvent = CustomEvent<{
  drawer: MathAgentDrawer;
  result?: MathDiagnosisToolResult | null;
}>;

function extractChatId(pathname: string) {
  const match = pathname.match(/\/chat\/([^/]+)/);
  return match?.[1] ?? null;
}

export function MathAgentAssistant() {
  const pathname = usePathname();
  const chatIdFromUrl = extractChatId(pathname);
  const newChatIdRef = useRef(generateUUID());
  const chatId = chatIdFromUrl ?? newChatIdRef.current;
  const { data, isLoading } = useSWR<{
    messages: ChatMessage[];
    visibility: "private" | "public";
  }>(
    chatIdFromUrl
      ? `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/messages?chatId=${chatId}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (chatIdFromUrl && isLoading) {
    return <div className="flex h-dvh bg-background" />;
  }

  return (
    <MathAgentAssistantRuntime
      chatId={chatId}
      initialMessages={data?.messages ?? []}
      selectedVisibilityType={data?.visibility ?? "private"}
    />
  );
}

function MathAgentAssistantRuntime({
  chatId,
  initialMessages,
  selectedVisibilityType,
}: {
  chatId: string;
  initialMessages: ChatMessage[];
  selectedVisibilityType: "private" | "public";
}) {
  const [drawer, setDrawer] = useState<MathAgentDrawer>(null);
  const [latestDiagnosis, setLatestDiagnosis] =
    useState<MathDiagnosisToolResult | null>(null);
  const transport = useMemo(
    () =>
      new AssistantChatTransport<ChatMessage>({
        api: "/api/assistant-chat",
        body: {
          metadata: {
            selectedVisibilityType,
          },
        },
      }),
    [selectedVisibilityType]
  );
  const runtime = useChatRuntime<ChatMessage>({
    id: chatId,
    messages: initialMessages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport,
  });

  useEffect(() => {
    const onOpenDrawer = (event: Event) => {
      const detail = (event as MathAgentDrawerEvent).detail;
      setDrawer(detail.drawer);
      if (detail.result) {
        setLatestDiagnosis(detail.result);
      }
    };

    window.addEventListener("math-agent-open-drawer", onOpenDrawer);
    return () =>
      window.removeEventListener("math-agent-open-drawer", onOpenDrawer);
  }, []);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full bg-background pr-0.5">
          <ThreadListSidebar />
          <SidebarInset className="flex h-dvh flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur">
              <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger />
                <Separator className="mr-2 h-4" orientation="vertical" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-sm">
                    AI 数学思维导师
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    先诊断思路，再追问修复，最后进入变式训练
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <HeaderAction
                  icon={<UserRoundIcon className="size-4" />}
                  label="画像"
                  onClick={() => setDrawer("learner-memory")}
                />
                <HeaderAction
                  icon={<ClockIcon className="size-4" />}
                  label="历史"
                  onClick={() => setDrawer("history")}
                />
                <HeaderAction
                  icon={<FlaskConicalIcon className="size-4" />}
                  label="Geometry"
                  onClick={() => setDrawer("geometry-lab")}
                />
                <HeaderAction
                  icon={<PanelRightIcon className="size-4" />}
                  label="Inspector"
                  onClick={() => setDrawer("inspector")}
                />
              </div>
            </header>
            <AgentProcessRibbon onOpenInspector={() => setDrawer("inspector")} />
            <main className="min-h-0 flex-1 overflow-hidden">
              <Thread chatId={chatId} />
            </main>
          </SidebarInset>
          <MathAgentDrawerPanel
            drawer={drawer}
            latestDiagnosis={latestDiagnosis}
            onClose={() => setDrawer(null)}
          />
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
}

function HeaderAction({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      className="hidden h-8 gap-1.5 rounded-full px-3 text-xs sm:inline-flex"
      onClick={onClick}
      type="button"
      variant="ghost"
    >
      {icon}
      {label}
    </Button>
  );
}

function MathAgentDrawerPanel({
  drawer,
  latestDiagnosis,
  onClose,
}: {
  drawer: MathAgentDrawer;
  latestDiagnosis: MathDiagnosisToolResult | null;
  onClose: () => void;
}) {
  if (!drawer) {
    return null;
  }

  if (drawer === "inspector") {
    return (
      <AgentInspector
        collapsed={false}
        exportable
        mobileMode="drawer"
        onToggle={onClose}
        result={latestDiagnosis}
        runtimeStatus="idle"
      />
    );
  }

  const content = {
    "learner-memory": {
      icon: <UserRoundIcon className="size-4" />,
      title: "学习画像",
      body: "完成一次诊断后，这里会展示高频错因、复发状态、迁移率和下一题推荐。",
    },
    history: {
      icon: <ClockIcon className="size-4" />,
      title: "诊断历史",
      body: "历史会话保留在左侧列表。后续这里会加入按错因、题型和时间筛选的回看视图。",
    },
    "geometry-lab": {
      icon: <FlaskConicalIcon className="size-4" />,
      title: "Geometry Lab",
      body: "当诊断出现线面角、二面角、截面或辅助面错因时，会推荐对应的几何可视化实验。",
    },
  }[drawer];

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <span className="rounded-full border p-1.5 text-muted-foreground">
              {content.icon}
            </span>
            {content.title}
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="ghost">
            关闭
          </Button>
        </div>
        <div className="grid gap-3 p-4 text-muted-foreground text-sm leading-6">
          <p>{content.body}</p>
          {drawer === "geometry-lab" && (
            <a
              className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 font-medium text-foreground text-sm"
              href="/geometry-lab"
            >
              <BrainCircuitIcon className="size-4" />
              打开 Geometry Lab
            </a>
          )}
        </div>
      </aside>
    </div>
  );
}
