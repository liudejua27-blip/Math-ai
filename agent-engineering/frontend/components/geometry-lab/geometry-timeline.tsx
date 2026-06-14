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
        {scene.animationSteps?.map((item, index) => (
          <button
            className={cn(
              "rounded-md border bg-background px-3 py-2 text-left text-sm transition hover:border-violet-300",
              activeTimelineId === item.id
                ? "border-violet-400 bg-violet-50 dark:bg-violet-950/30"
                : "border-border"
            )}
            key={item.id}
            onClick={() => onPlayStep(item.id, item.refs)}
            type="button"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-violet-100 font-medium text-violet-700 text-xs dark:bg-violet-950 dark:text-violet-200">
                A{index + 1}
              </span>
              <span className="font-medium">{item.label}</span>
            </div>
            <div className="mt-1 text-muted-foreground text-xs leading-5">
              {animationActionLabel(item.action)}
            </div>
          </button>
        ))}
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

function animationActionLabel(
  action: NonNullable<GeometrySceneSpec["animationSteps"]>[number]["action"]
) {
  const labels: Record<typeof action, string> = {
    condition_highlight: "先把题干条件对应到图上对象。",
    draw_auxiliary: "显示辅助线或辅助面，建立可计算对象。",
    rotate_to_view: "旋转到更容易观察的视角。",
    wrong_object_flash: "闪烁常见误选对象，提醒不要混淆。",
    correct_object_lock: "锁定正确对象，进入解释和计算。",
  };
  return labels[action];
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
