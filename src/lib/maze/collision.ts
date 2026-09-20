/**
 * 碰撞系统（需求 #18-#21）——整个应用最重要的技术部分。
 *
 * 设计原则：挑战来自「孩子不知道哪条路正确」，
 * 而不是「手指画得不够精准」，所以判定必须宽容。
 *
 * 模型：可通行区域 = 所有 cell 中心 + 开口走廊中线 的粗胶囊集合
 * （与 Playground 的「合法道路区域」debug 图层完全一致），
 * 实际判定宽度 = 视觉道路宽 × (1 + toleranceRatio)，默认 +25%。
 */

import { cellCenter, distance, type MazeGeometry } from "./geometry";
import { openNeighbors } from "./solver";
import type { Maze, Point } from "./types";

/** 合法区域比视觉道路宽出的比例（需求 #18：20%~30%） */
export const DEFAULT_TOLERANCE_RATIO = 0.25;

/** 线段防穿墙采样间隔（SVG 逻辑单位，需求 #20：每 3~5 单位检查一次） */
export const SEGMENT_SAMPLE_STEP = 4;

type MazeShape = Pick<Maze, "rows" | "cols" | "cells">;

/** 判定半径 = 视觉道路半径 × (1 + 容差) */
export function walkableRadius(
  geo: MazeGeometry,
  toleranceRatio: number = DEFAULT_TOLERANCE_RATIO
): number {
  return (geo.pathWidth / 2) * (1 + toleranceRatio);
}

/** 点到线段的最短距离 */
function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * 当前 point 是否位于可通行道路（需求 #18）。
 *
 * 先映射到所在 cell，再检查该 cell 与 4 个直接邻居的
 * 「中心点 + 开口走廊中线」，覆盖走廊跨界与角落的所有情况。
 */
export function isPointInsideWalkableArea(
  point: Point,
  maze: MazeShape,
  geo: MazeGeometry,
  toleranceRatio: number = DEFAULT_TOLERANCE_RATIO
): boolean {
  const { cellSize, offsetX, offsetY } = geo;
  const col = Math.min(maze.cols - 1, Math.max(0, Math.floor((point.x - offsetX) / cellSize)));
  const row = Math.min(maze.rows - 1, Math.max(0, Math.floor((point.y - offsetY) / cellSize)));
  const radius = walkableRadius(geo, toleranceRatio);

  for (let r = row - 1; r <= row + 1; r++) {
    if (r < 0 || r >= maze.rows) continue;
    for (let c = col - 1; c <= col + 1; c++) {
      if (c < 0 || c >= maze.cols) continue;
      if (Math.abs(r - row) + Math.abs(c - col) > 1) continue; // 只查自身与直接邻居
      const center = cellCenter(geo, r, c);
      if (distance(point, center) <= radius) return true;
      for (const n of openNeighbors(maze, { row: r, col: c })) {
        const nc = cellCenter(geo, n.row, n.col);
        if (pointToSegmentDistance(point, center, nc) <= radius) return true;
      }
    }
  }
  return false;
}

/**
 * 防穿墙（需求 #20）：快速滑动时，A、B 两点都合法但中间跨过墙。
 * 沿线段按固定间隔采样，所有采样点合法才允许通过。
 */
export function isSegmentWalkable(
  from: Point,
  to: Point,
  maze: MazeShape,
  geo: MazeGeometry,
  toleranceRatio: number = DEFAULT_TOLERANCE_RATIO
): boolean {
  const len = distance(from, to);
  const steps = Math.max(1, Math.ceil(len / SEGMENT_SAMPLE_STEP));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    if (!isPointInsideWalkableArea(p, maze, geo, toleranceRatio)) return false;
  }
  return true;
}
