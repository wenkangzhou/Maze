/**
 * 100 张固定地图配置（需求 #45）。
 *
 * 不保存地图数据本身，只保存 config；进入地图时
 * config -> generateMaze -> solveMaze -> render。
 * 相同 seed 永远生成相同地图。
 *
 * 每个 Level 内尺寸渐进增长（需求 #13）。
 */

import type { GenerateMazeOptions, MazeLevel } from "@/lib/maze/types";

export interface MazeConfig extends Required<Pick<GenerateMazeOptions, "rows" | "cols" | "seed">> {
  id: string;
  level: MazeLevel;
  /** 显示给孩子的编号，如 "01" */
  label: string;
}

export const MAZES_PER_LEVEL = 20;

/** 每级的尺寸范围 [起始 rows/cols, 结束 rows/cols] */
const LEVEL_SIZES: Record<MazeLevel, { from: [number, number]; to: [number, number] }> = {
  1: { from: [5, 5], to: [6, 6] },
  2: { from: [7, 7], to: [8, 8] },
  3: { from: [9, 9], to: [10, 10] },
  4: { from: [11, 11], to: [12, 12] },
  5: { from: [13, 13], to: [15, 15] },
};

function buildConfigs(): MazeConfig[] {
  const configs: MazeConfig[] = [];
  for (let level = 1; level <= 5; level++) {
    const lv = level as MazeLevel;
    const { from, to } = LEVEL_SIZES[lv];
    for (let i = 0; i < MAZES_PER_LEVEL; i++) {
      const t = i / (MAZES_PER_LEVEL - 1);
      const rows = Math.round(from[0] + (to[0] - from[0]) * t);
      const cols = Math.round(from[1] + (to[1] - from[1]) * t);
      const nn = String(i + 1).padStart(2, "0");
      configs.push({
        id: `L${lv}-${nn}`,
        label: nn,
        level: lv,
        rows,
        cols,
        seed: `level-${lv}-maze-${nn}`,
      });
    }
  }
  return configs;
}

export const MAZE_CONFIGS: MazeConfig[] = buildConfigs();

export function getMazeConfig(id: string): MazeConfig | undefined {
  return MAZE_CONFIGS.find((c) => c.id === id);
}

export function getLevelConfigs(level: MazeLevel): MazeConfig[] {
  return MAZE_CONFIGS.filter((c) => c.level === level);
}
