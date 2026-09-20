/**
 * localStorage 存储层（需求 #33-#36 / #38 / #41）。
 *
 * key 与数据结构严格按需求文档；所有读写带 try/catch，
 * 无痕模式等 localStorage 不可用时静默降级为内存态。
 */

import type { MazeLevel } from "@/lib/maze/types";

export interface MazeProgress {
  mazeId: string;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  completionCount: number;
  bestTime?: number;
  usedPartialHint: boolean;
  usedFullSolution: boolean;
  completedAt?: number;
}

export interface PlayerProgress {
  mazes: Record<string, MazeProgress>;
  totalCompleted: number;
  totalStars: number;
  achievements: string[];
}

export interface AppSettings {
  sound: boolean;
  timerVisible: boolean;
  starsEnabled: boolean;
  fullSolutionEnabled: boolean;
  unlockAll: boolean;
}

const PROGRESS_KEY = "maze-kids-progress-v1";
const SETTINGS_KEY = "maze-kids-settings-v1";

const DEFAULT_SETTINGS: AppSettings = {
  sound: true,
  timerVisible: false,
  starsEnabled: true,
  fullSolutionEnabled: true,
  unlockAll: false,
};

function emptyProgress(): PlayerProgress {
  return { mazes: {}, totalCompleted: 0, totalStars: 0, achievements: [] };
}

// ---------- 进度 ----------

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as PlayerProgress;
    if (!parsed || typeof parsed.mazes !== "object") return emptyProgress();
    return parsed;
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // 存储不可用时静默失败
  }
}

/** 通关后更新单张地图进度 + 汇总统计 + 成就 */
export function recordCompletion(
  progress: PlayerProgress,
  mazeId: string,
  level: MazeLevel,
  stars: 1 | 2 | 3,
  elapsedMs: number,
  usedPartialHint: boolean,
  usedFullSolution: boolean
): PlayerProgress {
  const prev = progress.mazes[mazeId];
  const bestStars = Math.max(prev?.stars ?? 0, stars) as 0 | 1 | 2 | 3;
  const entry: MazeProgress = {
    mazeId,
    completed: true,
    stars: bestStars,
    completionCount: (prev?.completionCount ?? 0) + 1,
    bestTime:
      prev?.bestTime === undefined ? elapsedMs : Math.min(prev.bestTime, elapsedMs),
    usedPartialHint: (prev?.usedPartialHint ?? false) || usedPartialHint,
    usedFullSolution: (prev?.usedFullSolution ?? false) || usedFullSolution,
    completedAt: Date.now(),
  };
  const mazes = { ...progress.mazes, [mazeId]: entry };

  // 汇总
  let totalCompleted = 0;
  let totalStars = 0;
  for (const m of Object.values(mazes)) {
    if (m.completed) {
      totalCompleted++;
      totalStars += m.stars;
    }
  }

  const achievements = checkAchievements({ ...progress, mazes, totalCompleted, totalStars });
  return { mazes, totalCompleted, totalStars, achievements };
}

/** 成就检查（需求 #41） */
export const ACHIEVEMENTS: Record<string, string> = {
  first_maze: "完成第一个迷宫",
  maze_10: "完成 10 个迷宫",
  maze_50: "完成 50 个迷宫",
  level_1_complete: "完成 Level 1 全部迷宫",
  level_2_complete: "完成 Level 2 全部迷宫",
  no_hint_10: "10 次无提示完成",
  stars_50: "获得 50 颗星",
  stars_100: "获得 100 颗星",
};

function checkAchievements(p: PlayerProgress): string[] {
  const got = new Set(p.achievements);
  const add = (id: string, cond: boolean) => {
    if (cond) got.add(id);
  };
  add("first_maze", p.totalCompleted >= 1);
  add("maze_10", p.totalCompleted >= 10);
  add("maze_50", p.totalCompleted >= 50);
  add("stars_50", p.totalStars >= 50);
  add("stars_100", p.totalStars >= 100);
  const l1Done = countCompletedInLevel(p, 1) >= 20;
  const l2Done = countCompletedInLevel(p, 2) >= 20;
  add("level_1_complete", l1Done);
  add("level_2_complete", l2Done);
  let noHint = 0;
  for (const m of Object.values(p.mazes)) {
    if (m.completed && !m.usedPartialHint && !m.usedFullSolution) noHint++;
  }
  add("no_hint_10", noHint >= 10);
  return [...got];
}

function countCompletedInLevel(p: PlayerProgress, level: MazeLevel): number {
  return Object.keys(p.mazes).filter(
    (id) => p.mazes[id].completed && id.startsWith(`L${level}-`)
  ).length;
}

export function resetProgress(): PlayerProgress {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // ignore
  }
  return emptyProgress();
}

// ---------- 设置 ----------

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// ---------- 解锁规则（需求 #36） ----------

/**
 * Level 解锁：Level 1 开放；Level N 需要完成 Level N-1 任意 10 张。
 * unlockAll 设置可全部解锁。
 */
export function isLevelUnlocked(
  level: MazeLevel,
  progress: PlayerProgress,
  settings: AppSettings
): boolean {
  if (settings.unlockAll) return true;
  if (level === 1) return true;
  return countCompletedInLevel(progress, (level - 1) as MazeLevel) >= 10;
}

/**
 * 单张地图解锁：等级内第一张开放，完成当前张解锁下一张。
 */
export function isMazeUnlocked(
  configIndex: number, // 等级内 0-19
  level: MazeLevel,
  mazeIdsInLevel: string[], // 按顺序的 maze id
  progress: PlayerProgress,
  settings: AppSettings
): boolean {
  if (settings.unlockAll) return true;
  if (!isLevelUnlocked(level, progress, settings)) return false;
  if (configIndex === 0) return true;
  const prevId = mazeIdsInLevel[configIndex - 1];
  return progress.mazes[prevId]?.completed === true;
}
