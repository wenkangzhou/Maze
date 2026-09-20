/**
 * 迷宫核心数据结构。
 * 该文件不依赖任何 UI 框架，可被生成器 / Solver / 渲染层共用。
 */

export interface Point {
  x: number;
  y: number;
}

/** 单元格坐标 */
export interface CellPos {
  row: number;
  col: number;
}

export interface MazeCell {
  row: number;
  col: number;
  /** true = 该方向有墙 */
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

export type MazeTheme = "grass" | "forest" | "desert" | "snow" | "space";

export type MazeLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 迷宫生成算法（结构形态差异明显）：
 * - recursive-backtracking：长而蜿蜒的走廊，岔路较少，适合幼儿跟随
 * - prim：分支从中心向外生长，形态均衡
 * - wilson：均匀生成树，岔路密集、死路短而多，每个路口都是真选择
 */
export type MazeAlgorithm = "recursive-backtracking" | "prim" | "wilson";

export interface Maze {
  id: string;
  level: MazeLevel;
  rows: number;
  cols: number;
  /** cells[row][col] */
  cells: MazeCell[][];
  start: CellPos;
  end: CellPos;
  /**
   * 完整正确路线（单元格坐标序列，x = col, y = row）。
   * 由 Solver 在生成后计算并缓存，渲染层再转换为 SVG 坐标。
   */
  solution: Point[];
  /** 0 - 100，详见 difficulty.ts */
  difficultyScore: number;
  theme: MazeTheme;
  /** 生成该迷宫的 seed，便于复现 */
  seed: string;
}

export interface GenerateMazeOptions {
  rows: number;
  cols: number;
  seed?: string;
  level?: MazeLevel;
  id?: string;
  /** 不指定时按 level 自动选择（低等级 RB、高等级 Wilson） */
  algorithm?: MazeAlgorithm;
}
