"use client";

import type { GeometrySceneSpec } from "@/lib/geometry/geometry-scene-types";
import { cn } from "@/lib/utils";

type GeometryTimelineProps = {
  scene: GeometrySceneSpec;
  activeTimelineId: string | null;
  onPlayStep: (itemId: string, refIds: string[]) => void;
};

export function GeometryTimeline({
  scene,
  activeTimelineId,
  onPlayStep,
}: GeometryTimelineProps) {
  return (
    <section className="border-border border-b p-4">
      <div className="font-semibold text-sm">讲解时间线</div>
      <div className="mt-3 grid gap-2">
        {scene.timeline.map((item, index) => (
          <button
            className={cn(
              "rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-cyan-300",
              activeTimelineId === item.id
                ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950/30"
                : "border-border"
            )}
            key={item.id}
            onClick={() => onPlayStep(item.id, item.refs)}
            type="button"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-muted font-medium text-xs">
                {index + 1}
              </span>
              <span className="font-medium">{timelineActionLabel(item.action)}</span>
            </div>
            <div className="mt-1 text-muted-foreground text-xs leading-5">
              {item.text}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function timelineActionLabel(
  action: GeometrySceneSpec["timeline"][number]["action"]
) {
  const labels: Record<typeof action, string> = {
    focus: "聚焦关键对象",
    highlight_vertex: "高亮顶点",
    highlight_edge: "高亮线段",
    highlight_face: "高亮平面",
    draw_auxiliary_edge: "作辅助线",
    draw_auxiliary_face: "作辅助面",
    show_projection: "显示射影",
    show_angle: "显示角",
    show_distance: "显示距离",
    rotate_camera: "旋转观察",
    ask_user: "学生操作",
  };
  return labels[action];
}
