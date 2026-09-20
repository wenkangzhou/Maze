/**
 * 存储层与解锁规则测试（需求 #34-#36 / #41）。
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  isLevelUnlocked,
  isMazeUnlocked,
  loadProgress,
  recordCompletion,
  saveProgress,
  type AppSettings,
  type PlayerProgress,
} from "@/lib/storage/progress";
import { MAZE_CONFIGS, getLevelConfigs } from "@/data/levels";

// localStorage mock
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

const defaultSettings: AppSettings = {
  sound: true, timerVisible: false, starsEnabled: true,
  fullSolutionEnabled: true, unlockAll: false,
};

const emptyProgress: PlayerProgress = {
  mazes: {}, totalCompleted: 0, totalStars: 0, achievements: [],
};

beforeEach(() => localStorageMock.clear());

describe("进度记录", () => {
  it("通关后保存并可读取", () => {
    let p = recordCompletion(emptyProgress, "L1-01", 1, 3, 5000, false, false);
    saveProgress(p);
    const loaded = loadProgress();
    expect(loaded.mazes["L1-01"].completed).toBe(true);
    expect(loaded.mazes["L1-01"].stars).toBe(3);
    expect(loaded.totalCompleted).toBe(1);
    expect(loaded.totalStars).toBe(3);
  });

  it("重复通关保留最高星级和最快用时", () => {
    let p = recordCompletion(emptyProgress, "L1-01", 1, 3, 5000, false, false);
    p = recordCompletion(p, "L1-01", 1, 1, 8000, true, true);
    expect(p.mazes["L1-01"].stars).toBe(3); // 保留最高
    expect(p.mazes["L1-01"].bestTime).toBe(5000); // 保留最快
    expect(p.mazes["L1-01"].completionCount).toBe(2);
    expect(p.totalCompleted).toBe(1); // 不重复计数
  });

  it("成就：完成第一个迷宫", () => {
    const p = recordCompletion(emptyProgress, "L1-01", 1, 3, 5000, false, false);
    expect(p.achievements).toContain("first_maze");
  });

  it("成就：10 次无提示完成", () => {
    let p = emptyProgress;
    for (let i = 1; i <= 10; i++) {
      p = recordCompletion(p, `L1-${String(i).padStart(2, "0")}`, 1, 3, 5000, false, false);
    }
    expect(p.achievements).toContain("maze_10");
    expect(p.achievements).toContain("no_hint_10");
  });
});

describe("解锁规则（需求 #36）", () => {
  const l1Ids = getLevelConfigs(1).map((c) => c.id);

  it("Level 1 默认开放，Level 2 默认锁定", () => {
    expect(isLevelUnlocked(1, emptyProgress, defaultSettings)).toBe(true);
    expect(isLevelUnlocked(2, emptyProgress, defaultSettings)).toBe(false);
  });

  it("完成 Level 1 任意 10 张解锁 Level 2", () => {
    let p = emptyProgress;
    for (let i = 1; i <= 10; i++) {
      p = recordCompletion(p, l1Ids[i - 1], 1, 2, 5000, false, false);
    }
    expect(isLevelUnlocked(2, p, defaultSettings)).toBe(true);
  });

  it("等级内：第一张开放，完成当前解锁下一张", () => {
    expect(isMazeUnlocked(0, 1, l1Ids, emptyProgress, defaultSettings)).toBe(true);
    expect(isMazeUnlocked(1, 1, l1Ids, emptyProgress, defaultSettings)).toBe(false);
    let p = recordCompletion(emptyProgress, l1Ids[0], 1, 1, 5000, true, true);
    expect(isMazeUnlocked(1, 1, l1Ids, p, defaultSettings)).toBe(true);
    expect(isMazeUnlocked(2, 1, l1Ids, p, defaultSettings)).toBe(false);
  });

  it("unlockAll 设置解锁一切", () => {
    const allOpen = { ...defaultSettings, unlockAll: true };
    expect(isLevelUnlocked(5, emptyProgress, allOpen)).toBe(true);
    expect(isMazeUnlocked(19, 5, getLevelConfigs(5).map(c=>c.id), emptyProgress, allOpen)).toBe(true);
  });

  it("100 张地图的 config id 与解锁索引一致", () => {
    expect(MAZE_CONFIGS.length).toBe(100);
    expect(l1Ids[0]).toBe("L1-01");
    expect(l1Ids[19]).toBe("L1-20");
  });
});
