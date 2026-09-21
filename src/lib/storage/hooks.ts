"use client";

/**
 * 进度 / 设置的 React hooks：localStorage + useState 同步。
 * 跨页面一致性靠挂载时读取；本应用单页面内操作后即写回。
 */

import { useCallback, useEffect, useState } from "react";
import {
  createEmptyProgress,
  DEFAULT_SETTINGS,
  loadProgress,
  loadSettings,
  recordCompletion,
  saveProgress,
  saveSettings,
  type AppSettings,
  type PlayerProgress,
} from "@/lib/storage/progress";
import type { MazeLevel } from "@/lib/maze/types";

let cachedProgress: PlayerProgress | null = null;
let cachedSettings: AppSettings | null = null;

export function usePlayerProgress() {
  // 静态导出会先在构建阶段预渲染 Client Component。首帧必须使用与
  // 服务端相同的默认值，挂载后再读取 localStorage，避免回访用户 hydration 失败。
  const [progress, setProgress] = useState<PlayerProgress>(
    () => cachedProgress ?? createEmptyProgress()
  );
  const [hydrated, setHydrated] = useState(cachedProgress !== null);

  useEffect(() => {
    const stored = loadProgress();
    cachedProgress = stored;
    setProgress(stored);
    setHydrated(true);
  }, []);

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
      cachedProgress = next;
      setProgress(next);
      return next.achievements.filter((a) => !prev.achievements.includes(a));
    },
    []
  );

  const reload = useCallback(() => {
    const stored = loadProgress();
    cachedProgress = stored;
    setProgress(stored);
  }, []);

  return { progress, complete, reload, hydrated };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(
    () => cachedSettings ?? { ...DEFAULT_SETTINGS }
  );
  const [hydrated, setHydrated] = useState(cachedSettings !== null);

  useEffect(() => {
    const stored = loadSettings();
    cachedSettings = stored;
    setSettings(stored);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      cachedSettings = next;
      return next;
    });
  }, []);

  return { settings, update, hydrated };
}
