"use client";

/**
 * 进度 / 设置的 React hooks：localStorage + useState 同步。
 * 跨页面一致性靠挂载时读取；本应用单页面内操作后即写回。
 */

import { useCallback, useState } from "react";
import {
  loadProgress,
  loadSettings,
  recordCompletion,
  saveProgress,
  saveSettings,
  type AppSettings,
  type PlayerProgress,
} from "@/lib/storage/progress";
import type { MazeLevel } from "@/lib/maze/types";

export function usePlayerProgress() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());

  /**
   * 记录一次通关；返回本次新解锁的成就 id 列表（用于通关弹窗展示）。
   * 直接从 storage 读最新进度，避免闭包里的过期 state。
   */
  const complete = useCallback(
    (
      mazeId: string,
      level: MazeLevel,
      stars: 1 | 2 | 3,
      elapsedMs: number,
      usedPartialHint: boolean,
      usedFullSolution: boolean
    ): string[] => {
      const prev = loadProgress();
      const next = recordCompletion(prev, mazeId, level, stars, elapsedMs, usedPartialHint, usedFullSolution);
      saveProgress(next);
      setProgress(next);
      return next.achievements.filter((a) => !prev.achievements.includes(a));
    },
    []
  );

  const reload = useCallback(() => setProgress(loadProgress()), []);

  return { progress, complete, reload };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, update };
}
