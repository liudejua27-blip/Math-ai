import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AuiIf,
  ThreadListItemMorePrimitive,
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import {
  ArchiveIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import { Fragment, useMemo, type FC } from "react";

export const ThreadList: FC = () => (
  <ThreadListPrimitive.Root className="aui-root aui-thread-list-root flex flex-col gap-0.5">
    <ThreadListNew />
    <AuiIf condition={(state) => state.threads.isLoading}>
      <ThreadListSkeleton />
    </AuiIf>
    <AuiIf condition={(state) => !state.threads.isLoading}>
      <ThreadListItems />
    </AuiIf>
  </ThreadListPrimitive.Root>
);

const DAY_IN_MS = 86_400_000;

const dateGroupLabel = (
  date: Date | undefined,
  startOfToday: number
): string => {
  if (!date || date.getTime() >= startOfToday) {
    return "今天";
  }
  if (date.getTime() >= startOfToday - DAY_IN_MS) {
    return "昨天";
  }
  return "更早";
};

type ThreadListGroup = { label: string; indices: number[] };

const ThreadListItems: FC = () => {
  const threadIds = useAuiState((state) => state.threads.threadIds);
  const threadItems = useAuiState((state) => state.threads.threadItems);

  const groups = useMemo<ThreadListGroup[] | null>(() => {
    const itemsById = new Map(threadItems.map((item) => [item.id, item]));
    const dates = threadIds.map((id) => itemsById.get(id)?.lastMessageAt);
    if (!dates.some(Boolean)) {
      return null;
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const time = (index: number) =>
      dates[index]?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const indices = threadIds
      .map((_, index) => index)
      .sort((first, second) => time(second) - time(first));

    const result: ThreadListGroup[] = [];
    for (const index of indices) {
      const label = dateGroupLabel(dates[index], startOfToday);
      const lastGroup = result.at(-1);
      if (lastGroup?.label === label) {
        lastGroup.indices.push(index);
      } else {
        result.push({ label, indices: [index] });
      }
    }
    return result;
  }, [threadIds, threadItems]);

  if (!groups) {
    return (
      <ThreadListPrimitive.Items>
        {() => <ThreadListItem />}
      </ThreadListPrimitive.Items>
    );
  }

  return groups.map((group) => (
    <Fragment key={group.label}>
      <div className="aui-thread-list-group-label text-muted-foreground px-2.5 pt-3 pb-1 text-xs font-medium">
        {group.label}
      </div>
      {group.indices.map((index) => (
        <ThreadListPrimitive.ItemByIndex
          components={{ ThreadListItem }}
          index={index}
          key={threadIds[index]}
        />
      ))}
    </Fragment>
  ));
};

const ThreadListNew: FC = () => (
  <ThreadListPrimitive.New asChild>
    <Button
      className="aui-thread-list-new hover:bg-muted data-active:bg-muted h-8 justify-start gap-2 rounded-md px-2.5 text-sm font-normal"
      variant="ghost"
    >
      <PlusIcon className="size-4" />
      新建诊断
    </Button>
  </ThreadListPrimitive.New>
);

const ThreadListSkeleton: FC = () => (
  <div className="flex flex-col gap-0.5">
    {Array.from({ length: 5 }, (_, index) => (
      <div
        aria-label="正在加载历史诊断"
        className="aui-thread-list-skeleton-wrapper flex h-8 items-center px-2.5"
        key={index}
        role="status"
      >
        <Skeleton className="aui-thread-list-skeleton h-3.5 w-full" />
      </div>
    ))}
  </div>
);

const ThreadListItem: FC = () => (
  <ThreadListItemPrimitive.Root className="aui-thread-list-item group hover:bg-muted focus-visible:bg-muted data-active:bg-muted flex h-8 items-center gap-1 rounded-md transition-colors focus-visible:outline-none">
    <ThreadListItemPrimitive.Trigger className="aui-thread-list-item-trigger flex h-full min-w-0 flex-1 items-center px-2.5 text-start text-sm">
      <span className="aui-thread-list-item-title min-w-0 flex-1 truncate">
        <ThreadListItemPrimitive.Title fallback="新的数学诊断" />
      </span>
    </ThreadListItemPrimitive.Trigger>
    <ThreadListItemMore />
  </ThreadListItemPrimitive.Root>
);

const ThreadListItemMore: FC = () => (
  <ThreadListItemMorePrimitive.Root>
    <ThreadListItemMorePrimitive.Trigger asChild>
      <Button
        className="aui-thread-list-item-more data-[state=open]:bg-accent me-1.5 size-6 p-0 opacity-0 transition-opacity group-hover:opacity-100 group-data-active:opacity-100 data-[state=open]:opacity-100"
        size="icon"
        variant="ghost"
      >
        <MoreHorizontalIcon className="size-3.5" />
        <span className="sr-only">更多选项</span>
      </Button>
    </ThreadListItemMorePrimitive.Trigger>
    <ThreadListItemMorePrimitive.Content
      align="start"
      className="aui-thread-list-item-more-content bg-popover/95 text-popover-foreground data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:animate-out data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-xl border p-1.5 shadow-lg backdrop-blur-sm"
      side="right"
      sideOffset={6}
    >
      <ThreadListItemPrimitive.Archive asChild>
        <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none">
          <ArchiveIcon className="size-4" />
          归档
        </ThreadListItemMorePrimitive.Item>
      </ThreadListItemPrimitive.Archive>
      <ThreadListItemPrimitive.Delete asChild>
        <ThreadListItemMorePrimitive.Item className="aui-thread-list-item-more-item text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm outline-none select-none">
          <TrashIcon className="size-4" />
          删除
        </ThreadListItemMorePrimitive.Item>
      </ThreadListItemPrimitive.Delete>
    </ThreadListItemMorePrimitive.Content>
  </ThreadListItemMorePrimitive.Root>
);
