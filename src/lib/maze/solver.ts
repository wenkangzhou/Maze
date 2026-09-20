/**
 * Maze Solver：BFS 最短路径。
 *
 * 选择 BFS 的原因（需求 #11）：
 * - 保证最短路线，未来难度模型 / 提示功能都依赖最短解
 * - 可以复用 BFS 距离场做起点终点选取、连通性校验
 */

import type { CellPos, Maze, MazeCell, Point } from "./types";

export interface CellGraph {
  rows: number;
  cols: number;
  cells: MazeCell[][];
}

/** 与 cell 相邻且「之间没有墙」的单元格 */
export function openNeighbors(graph: CellGraph, cell: CellPos): CellPos[] {
  const { rows, cols, cells } = graph;
  const c = cells[cell.row][cell.col];
  const result: CellPos[] = [];
  if (!c.top && cell.row > 0) result.push({ row: cell.row - 1, col: cell.col });
  if (!c.right && cell.col < cols - 1) result.push({ row: cell.row, col: cell.col + 1 });
  if (!c.bottom && cell.row < rows - 1) result.push({ row: cell.row + 1, col: cell.col });
  if (!c.left && cell.col > 0) result.push({ row: cell.row, col: cell.col - 1 });
  return result;
}

const keyOf = (p: CellPos) => p.row * 100000 + p.col;

/**
 * BFS 距离场：返回每个 cell 到 from 的距离（不可达为 -1），
 * 以及 parent 表用于回溯路径。
 */
export function bfsDistanceField(
  graph: CellGraph,
  from: CellPos
): { dist: number[][]; parent: (CellPos | null)[][] } {
  const { rows, cols } = graph;
  const dist: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const parent: (CellPos | null)[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );
  const queue: CellPos[] = [from];
  dist[from.row][from.col] = 0;
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    for (const next of openNeighbors(graph, cur)) {
      if (dist[next.row][next.col] === -1) {
        dist[next.row][next.col] = dist[cur.row][cur.col] + 1;
        parent[next.row][next.col] = cur;
        queue.push(next);
      }
    }
  }
  return { dist, parent };
}

/** 距离场中离 from 最远的可达 cell */
export function farthestCell(graph: CellGraph, from: CellPos): CellPos {
  const { dist } = bfsDistanceField(graph, from);
  let best: CellPos = from;
  let bestDist = -1;
  for (let r = 0; r < graph.rows; r++) {
    for (let c = 0; c < graph.cols; c++) {
      if (dist[r][c] > bestDist) {
        bestDist = dist[r][c];
        best = { row: r, col: c };
      }
    }
  }
  return best;
}

/**
 * solveMaze：返回 start -> end 的完整最短路线。
 * 坐标约定：Point.x = col, Point.y = row（与需求文档一致）。
 * 无解时返回空数组。
 */
export function solveMaze(
  maze: Pick<Maze, "rows" | "cols" | "cells" | "start" | "end">
): Point[] {
  const { dist, parent } = bfsDistanceField(maze, maze.start);
  if (dist[maze.end.row][maze.end.col] === -1) return [];

  const path: Point[] = [];
  let cur: CellPos | null = maze.end;
  while (cur) {
    path.push({ x: cur.col, y: cur.row });
    cur = parent[cur.row][cur.col];
  }
  path.reverse();
  return path;
}

/** 判断两个相邻 cell 之间是否有墙（用于测试与校验） */
export function hasWallBetween(graph: CellGraph, a: CellPos, b: CellPos): boolean {
  const dr = b.row - a.row;
  const dc = b.col - a.col;
  const cellA = graph.cells[a.row][a.col];
  if (dr === -1 && dc === 0) return cellA.top;
  if (dr === 1 && dc === 0) return cellA.bottom;
  if (dr === 0 && dc === -1) return cellA.left;
  if (dr === 0 && dc === 1) return cellA.right;
  // 非相邻 cell
  return true;
}

export function cellKey(p: CellPos): number {
  return keyOf(p);
}
