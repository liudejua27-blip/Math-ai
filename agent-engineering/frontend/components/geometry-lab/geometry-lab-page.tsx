"use client";

import { useMemo, useState } from "react";
import { GEOMETRY_LEVELS } from "@/lib/geometry/geometry-levels";
import {
  FEATURED_GEOMETRY_LEVEL_IDS,
  getGeometryLevelDisplay,
  sortGeometryLevelsForLearningPath,
} from "@/lib/geometry/geometry-learning-flow";
import { validateGeometrySceneSpec } from "@/lib/geometry/geometry-scene-validator";
import { GeometryAttemptSummary } from "./geometry-attempt-summary";
import { GeometryCanvas } from "./geometry-canvas";
import { GeometryEvidencePanel } from "./geometry-evidence-panel";
import { GeometryLevelMap } from "./geometry-level-map";
import { GeometryTaskPanel } from "./geometry-task-panel";
import { GeometryTimeline } from "./geometry-timeline";

type GeometryLabPageProps = {
  initialLevelId?: string;
};

export function GeometryLabPage({ initialLevelId }: GeometryLabPageProps) {
  const initialLevel =
    GEOMETRY_LEVELS.find((level) => level.levelId === initialLevelId) ??
    GEOMETRY_LEVELS.find(
      (level) => level.levelId === FEATURED_GEOMETRY_LEVEL_IDS[0]
    ) ??
    GEOMETRY_LEVELS[0];
  const [activeLevelId, setActiveLevelId] = useState(initialLevel.levelId);
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);
  const [reasonText, setReasonText] = useState("");
  const [completedLevelIds, setCompletedLevelIds] = useState<string[]>([]);
  const [variantOpen, setVariantOpen] = useState(false);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  const activeLevel = useMemo(
    () =>
      GEOMETRY_LEVELS.find((level) => level.levelId === activeLevelId) ??
      GEOMETRY_LEVELS[0],
    [activeLevelId]
  );
  const orderedLevels = useMemo(
    () => sortGeometryLevelsForLearningPath(GEOMETRY_LEVELS),
    []
  );
  const display = getGeometryLevelDisplay(activeLevel);
  const validation = validateGeometrySceneSpec(activeLevel.scene);
  const correctCount = activeLevel.scene.targets.filter((target) =>
    target.correctRefs.some((refId) => selectedRefs.includes(refId))
  ).length;
  const passed =
    correctCount >= activeLevel.scene.assessment.passRule.minCorrectTargets &&
    (!activeLevel.scene.assessment.passRule.requireReason ||
      reasonText.trim().length >= 8);
  const completed = completedLevelIds.includes(activeLevel.levelId);

  function selectLevel(levelId: string) {
    setActiveLevelId(levelId);
    setSelectedRefs([]);
    setReasonText("");
    setVariantOpen(false);
    setActiveTimelineId(null);
    setSaveStatus("idle");
  }

  function toggleRef(refId: string) {
    setSelectedRefs((current) =>
      current.includes(refId)
        ? current.filter((item) => item !== refId)
        : [...current, refId]
    );
  }

  function playTimelineStep(itemId: string, refIds: string[]) {
    setActiveTimelineId(itemId);
    if (refIds.length > 0) {
      setSelectedRefs((current) => [...new Set([...current, ...refIds])]);
    }
  }

  async function completeCorrection() {
    if (!passed) {
      return;
    }
    setCompletedLevelIds((current) =>
      current.includes(activeLevel.levelId)
        ? current
        : [...current, activeLevel.levelId]
    );
    setVariantOpen(true);
    await persistGeometryAttempt({
      correctionCompleted: true,
      variantAttempted: false,
      variantSuccess: false,
    });
  }

  async function submitVariantResult(success: boolean) {
    await persistGeometryAttempt({
      correctionCompleted: completed || passed,
      variantAttempted: true,
      variantSuccess: success,
    });
    if (success) {
      setCompletedLevelIds((current) =>
        current.includes(activeLevel.levelId)
          ? current
          : [...current, activeLevel.levelId]
      );
    }
  }

  async function persistGeometryAttempt({
    correctionCompleted,
    variantAttempted,
    variantSuccess,
  }: {
    correctionCompleted: boolean;
    variantAttempted: boolean;
    variantSuccess: boolean;
  }) {
    setSaveStatus("saving");
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/learning/geometry-attempt`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          levelId: activeLevel.levelId,
          sceneSpecId: activeLevel.sceneSpecId ?? activeLevel.scene.sceneId,
          targetAtoms: activeLevel.targetAtoms,
          selectedRefs,
          correctCount,
          passed,
          reasonText,
          correctionCompleted,
          variantAttempted,
          variantSuccess,
          variantText: display.variantPrompt,
          metadata: {
            displayTitle: display.title,
            activeTimelineId,
          },
        }),
      }
    ).catch(() => null);

    setSaveStatus(response?.ok ? "saved" : "error");
  }

  return (
    <main className="ms-workbench-shell min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(420px,1fr)_360px]">
        <GeometryLevelMap
          activeLevelId={activeLevel.levelId}
          completedLevelIds={completedLevelIds}
          levels={orderedLevels}
          onSelectLevel={selectLevel}
        />

        <div className="grid min-h-screen grid-rows-[1fr_auto]">
          <GeometryCanvas
            activeTimelineId={activeTimelineId}
            displayTitle={display.title}
            onSelectRef={toggleRef}
            scene={activeLevel.scene}
            selectedRefs={selectedRefs}
          />
          <GeometryAttemptSummary
            completed={completed}
            correctCount={correctCount}
            display={display}
            level={activeLevel}
            onCompleteCorrection={completeCorrection}
            onOpenVariant={() => setVariantOpen((value) => !value)}
            onSubmitVariantResult={submitVariantResult}
            passed={passed}
            saveStatus={saveStatus}
            selectedRefs={selectedRefs}
            variantOpen={variantOpen}
          />
        </div>

        <aside className="ms-inspector min-h-screen overflow-y-auto border-l">
          <div className="flex h-12 items-center justify-between border-border border-b px-4">
            <div>
              <div className="font-semibold text-sm">{display.title}</div>
              <div className="text-muted-foreground text-xs">
                {activeLevel.targetAtoms.join(" / ")}
              </div>
            </div>
            <span className="rounded bg-muted px-2 py-1 text-xs">
              {validation.valid ? "Spec OK" : "Spec Error"}
            </span>
          </div>
          {!validation.valid && (
            <div className="border-red-200 border-b bg-red-50 p-3 text-red-800 text-xs">
              {validation.errors.join("；")}
            </div>
          )}
          <GeometryOnboardingPanel
            completedCount={completedLevelIds.length}
            onSelectLevel={selectLevel}
          />
          <GeometryTaskPanel
            onSelectRef={toggleRef}
            reasonText={reasonText}
            scene={activeLevel.scene}
            selectedRefs={selectedRefs}
            setReasonText={setReasonText}
          />
          <GeometryTimeline
            activeTimelineId={activeTimelineId}
            onPlayStep={playTimelineStep}
            scene={activeLevel.scene}
          />
          <GeometryEvidencePanel
            scene={activeLevel.scene}
            selectedRefs={selectedRefs}
          />
        </aside>
      </div>
    </main>
  );
}

function GeometryOnboardingPanel({
  completedCount,
  onSelectLevel,
}: {
  completedCount: number;
  onSelectLevel: (levelId: string) => void;
}) {
  return (
    <section className="border-border border-b p-4">
      <div className="font-semibold text-sm">新手引导</div>
      <div className="mt-2 grid gap-2 text-muted-foreground text-xs leading-5">
        <div>1. 先选一个高频场景，不急着算答案。</div>
        <div>2. 跟随讲解时间线，找射影、辅助面或截面。</div>
        <div>3. 选中关键对象，写一句几何依据。</div>
        <div>4. 点击“我订正完了”，进入同因变式。</div>
      </div>
      <div className="mt-3 grid gap-2">
        {FEATURED_GEOMETRY_LEVEL_IDS.map((levelId) => (
          <button
            className="rounded-md border border-border bg-background px-3 py-2 text-left text-xs transition hover:border-cyan-300"
            key={levelId}
            onClick={() => onSelectLevel(levelId)}
            type="button"
          >
            {levelId === "G1-4" && "正方体线面角"}
            {levelId === "G2-2" && "三棱锥二面角"}
            {levelId === "G1-6" && "截面/辅助面构造"}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-md bg-muted/60 px-3 py-2 text-muted-foreground text-xs leading-5">
        诊断历史回看和错因周报在正式学习工作台左侧；Geometry Lab 会把完成状态和变式训练接到同一个学习闭环里。已完成 {completedCount} 个实验。
      </div>
    </section>
  );
}
