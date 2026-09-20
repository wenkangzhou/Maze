/**
 * 难度模型与迷宫质量评估（需求 #12 / #44）。
 *
 * difficultyScore 范围 0 - 100，由多个可独立调整的权重组成：
 * - 地图尺寸
 * - 正确路径长度（相对地图面积）
 * - 岔路（decision points：正确路线上度数 >= 3 的 cell）
 * - 死路数量
 * - 错误路线深度（死路分支离正确路线的最大距离）
 *
 * 权重集中在 WEIGHTS，后续调平衡只改这里。
 */

import { bfsDistanceField, openNeighbors, type CellGraph } from "./solver";
import type { Maze } from "./types";

export interface MazeQuality {
  difficultyScore: number;
  solutionLength: number;
  /** 整个迷宫中度数 >= 3 的岔路 cell 数 */
  branches: number;
  /** 正确路线上的岔路（孩子真正需要做选择的地方） */
  decisionPoints: number;
  /** 死路数量（不含起点终点） */
  deadEnds: number;
  /** 错误路线深度统计 */
  wrongPathDepth: number;
  /** 最深的错误路线深度（死路隧道最长能骗人多深） */
  wrongPathMaxDepth: number;
  /** 平均错误路线深度 */
  wrongPathAvgDepth: number;
}

/** 可调权重：各项满分贡献之和 = 100 */
export const WEIGHTS = {
  /** 地图面积（相对 15x15 上限） */
  size: 15,
  /** 正确路径长度（相对面积） */
  solutionLength: 20,
  /** 正确路线上的岔路密度 */
  decisionPoints: 25,
  /** 死路密度 */
  deadEnds: 10,
  /** 错误路线最大深度：深死路比浅死路难得多 */
  wrongPathDepth: 30,
} as const;

/** cell 的度数 = 开口数量 */
function degreeOf(graph: CellGraph, row: number, col: number): number {
  return openNeighbors(graph, { row, col }).length;
}

export function evaluateMazeQuality(
  maze: Pick<Maze, "rows" | "cols" | "cells" | "start" | "end" | "solution">
): MazeQuality {
  const { rows, cols } = maze;
  const graph: CellGraph = { rows, cols, cells: maze.cells };
  const area = rows * cols;

  const solutionLength = maze.solution.length;

  // --- 岔路 / 死路统计 ---
  let branches = 0;
  let deadEnds = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const deg = degreeOf(graph, r, c);
      if (deg >= 3) branches++;
      if (deg === 1) {
        const isStart = r === maze.start.row && c === maze.start.col;
        const isEnd = r === maze.end.row && c === maze.end.col;
        if (!isStart && !isEnd) deadEnds++;
      }
    }
  }

  // 正确路线上的 decision points
  let decisionPoints = 0;
  for (const p of maze.solution) {
    if (degreeOf(graph, p.y, p.x) >= 3) decisionPoints++;
  }

  // --- 错误路线深度：多源 BFS，所有 solution cell 为源 ---
  // 统计最深死路和平均深度：Wilson 的死路太浅（一眼看穿），
  // 加深后 wrongPathMaxDepth 应显著上升。
  const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const queue: { row: number; col: number }[] = [];
  for (const p of maze.solution) {
    dist[p.y][p.x] = 0;
    queue.push({ row: p.y, col: p.x });
  }
  let head = 0;
  let wrongPathMaxDepth = 0;
  let wrongPathSum = 0;
  let wrongPathCount = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const next of openNeighbors(graph, cur)) {
      if (dist[next.row][next.col] === -1) {
        dist[next.row][next.col] = dist[cur.row][cur.col] + 1;
        const d = dist[next.row][next.col];
        if (d > wrongPathMaxDepth) wrongPathMaxDepth = d;
        wrongPathSum += d;
        wrongPathCount++;
        queue.push(next);
      }
    }
  }
  const wrongPathAvgDepth = wrongPathCount > 0 ? wrongPathSum / wrongPathCount : 0;
  const wrongPathDepth = wrongPathMaxDepth; // 兼容旧字段

  // --- 加权评分 ---
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const sizeScore = clamp01(area / (15 * 15));
  // 完美迷宫中最长路径通常 < 面积；取 0.9 作为「绕满全图」的上界
  const lengthScore = clamp01(solutionLength / (area * 0.9));
  const decisionScore = clamp01(decisionPoints / Math.max(1, solutionLength) / 0.5);
  const deadEndScore = clamp01(deadEnds / (area * 0.35));
  // 深度分数用平均深度 + 最深值的组合：均深反映整体绕行密度，
  // 最深值反映「最狠的那条死路」
  const depthScore = clamp01(
    (wrongPathAvgDepth / (rows + cols)) * 0.6 +
      (wrongPathMaxDepth / ((rows + cols) / 1.5)) * 0.4
  );

  const difficultyScore = Math.round(
    WEIGHTS.size * sizeScore +
      WEIGHTS.solutionLength * lengthScore +
      WEIGHTS.decisionPoints * decisionScore +
      WEIGHTS.deadEnds * deadEndScore +
      WEIGHTS.wrongPathDepth * depthScore
  );

  return {
    difficultyScore: Math.max(0, Math.min(100, difficultyScore)),
    solutionLength,
    branches,
    decisionPoints,
    deadEnds,
    wrongPathDepth,
    wrongPathMaxDepth,
    wrongPathAvgDepth,
  };
}

/** 连通性检查辅助：从 start 可达的 cell 数（供 validator 使用） */
export function reachableCount(maze: Pick<Maze, "rows" | "cols" | "cells" | "start">): number {
  const { dist } = bfsDistanceField(maze, maze.start);
  let count = 0;
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols; c++) {
      if (dist[r][c] >= 0) count++;
    }
  }
  return count;
}
