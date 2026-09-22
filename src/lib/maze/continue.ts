import { getLevelConfigs, MAZE_CONFIGS, type MazeConfig } from "@/data/levels";
import {
  isLevelUnlocked,
  isMazeUnlocked,
  type AppSettings,
  type PlayerProgress,
} from "@/lib/storage/progress";
import type { MazeLevel } from "@/lib/maze/types";

export type HomeActionKind = "start" | "continue" | "replay";

export interface HomeMazeAction {
  config: MazeConfig;
  kind: HomeActionKind;
}

/**
 * 首页主操作：优先进入按当前解锁规则可玩的第一张未完成迷宫。
 * 全部完成时回到最近玩过的一张，让主操作始终有意义。
 */
export function getHomeMazeAction(
  progress: PlayerProgress,
  settings: AppSettings
): HomeMazeAction {
  for (let level = 1; level <= 5; level++) {
    const mazeLevel = level as MazeLevel;
    if (!isLevelUnlocked(mazeLevel, progress, settings)) continue;

    const configs = getLevelConfigs(mazeLevel);
    const mazeIds = configs.map((config) => config.id);
    for (let index = 0; index < configs.length; index++) {
      const config = configs[index];
      if (
        !progress.mazes[config.id]?.completed &&
        isMazeUnlocked(index, mazeLevel, mazeIds, progress, settings)
      ) {
        return {
          config,
          kind: progress.totalCompleted === 0 ? "start" : "continue",
        };
      }
    }
  }

  let replayConfig = MAZE_CONFIGS[MAZE_CONFIGS.length - 1];
  let latestCompletedAt = -1;
  for (const config of MAZE_CONFIGS) {
    const completedAt = progress.mazes[config.id]?.completedAt ?? -1;
    if (completedAt > latestCompletedAt) {
      latestCompletedAt = completedAt;
      replayConfig = config;
    }
  }

  return { config: replayConfig, kind: "replay" };
}
