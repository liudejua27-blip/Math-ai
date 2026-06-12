"use client";

import { useCallback, useEffect, useState } from "react";

type WorkbenchLayoutState = {
  leftWidth: number;
  rightWidth: number;
  inspectorCollapsed: boolean;
  activeTaskLabel: string;
};

const STORAGE_KEY = "math-searag.workbench.layout.v1";
const DEFAULT_STATE: WorkbenchLayoutState = {
  leftWidth: 288,
  rightWidth: 380,
  inspectorCollapsed: true,
  activeTaskLabel: "等待学生输入题目和步骤",
};

export function useWorkbenchLayoutState() {
  const [state, setState] = useState<WorkbenchLayoutState>(DEFAULT_STATE);

  useEffect(() => {
    const restored = readLayoutState();
    if (restored) {
      setState(restored);
    }
  }, []);

  const updateState = useCallback(
    (updater: (current: WorkbenchLayoutState) => WorkbenchLayoutState) => {
      setState((current) => {
        const next = normalizeState(updater(current));
        writeLayoutState(next);
        return next;
      });
    },
    []
  );

  return [state, updateState] as const;
}

function readLayoutState() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return normalizeState({
      ...DEFAULT_STATE,
      ...JSON.parse(raw),
    });
  } catch {
    return null;
  }
}

function writeLayoutState(state: WorkbenchLayoutState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeState(state)));
}

function normalizeState(state: WorkbenchLayoutState): WorkbenchLayoutState {
  return {
    leftWidth: clamp(state.leftWidth, 240, 420),
    rightWidth: clamp(state.rightWidth, 300, 760),
    inspectorCollapsed: Boolean(state.inspectorCollapsed),
    activeTaskLabel: state.activeTaskLabel || DEFAULT_STATE.activeTaskLabel,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}
