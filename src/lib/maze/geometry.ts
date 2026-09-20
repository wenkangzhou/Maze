/**
 * 几何层：把迷宫 cell 网格映射到固定逻辑坐标的 SVG 空间（需求 #48）。
 *
 * 所有渲染 / 碰撞 / 轨迹统一使用逻辑坐标（viewBox 单位），
 * 不依赖屏幕像素。屏幕坐标 -> 逻辑坐标的转换由 MazeBoard 负责
 *（需求 #17，第二轮实现手指划线时接入 screenPointToSvgPoint）。
 */

import type { Maze, Point } from "./types";

/** 逻辑画布尺寸（需求 #48） */
export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 700;

export interface MazeGeometry {
  viewWidth: number;
  viewHeight: number;
  /** 单个 cell 的边长（逻辑单位） */
  cellSize: number;
  /** 迷宫左上角在画布中的偏移（居中） */
  offsetX: number;
  offsetY: number;
  /** 墙壁线宽 */
  wallWidth: number;
  /** 视觉道路宽度（用于 debug 显示合法区域） */
  pathWidth: number;
}

export interface GeometryOptions {
  /** 画布四周留白 */
  padding?: number;
  /** 墙壁线宽（逻辑单位），默认随 cellSize 缩放 */
  wallWidth?: number;
  /** 道路宽度占 cellSize 的比例，默认 0.62（道路宽、好画） */
  pathRatio?: number;
}

export function computeGeometry(
  rows: number,
  cols: number,
  options: GeometryOptions = {}
): MazeGeometry {
  const padding = options.padding ?? 40;
  const usableW = VIEW_WIDTH - padding * 2;
  const usableH = VIEW_HEIGHT - padding * 2;
  const cellSize = Math.min(usableW / cols, usableH / rows);
  const mazeW = cellSize * cols;
  const mazeH = cellSize * rows;
  return {
    viewWidth: VIEW_WIDTH,
    viewHeight: VIEW_HEIGHT,
    cellSize,
    offsetX: (VIEW_WIDTH - mazeW) / 2,
    offsetY: (VIEW_HEIGHT - mazeH) / 2,
    wallWidth: options.wallWidth ?? Math.max(3, cellSize * 0.08),
    pathWidth: cellSize * (options.pathRatio ?? 0.62),
  };
}

/** cell 中心点的逻辑坐标 */
export function cellCenter(geo: MazeGeometry, row: number, col: number): Point {
  return {
    x: geo.offsetX + (col + 0.5) * geo.cellSize,
    y: geo.offsetY + (row + 0.5) * geo.cellSize,
  };
}

/** cell 左上角逻辑坐标 */
export function cellOrigin(geo: MazeGeometry, row: number, col: number): Point {
  return {
    x: geo.offsetX + col * geo.cellSize,
    y: geo.offsetY + row * geo.cellSize,
  };
}

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * 提取全部墙壁线段（去重：每条边只画一次）。
 * top/left 由本 cell 负责，bottom/right 由边缘 cell 负责。
 */
export function wallSegments(
  maze: Pick<Maze, "rows" | "cols" | "cells">,
  geo: MazeGeometry
): WallSegment[] {
  const segments: WallSegment[] = [];
  const { rows, cols, cells } = maze;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const x0 = geo.offsetX + c * geo.cellSize;
      const y0 = geo.offsetY + r * geo.cellSize;
      const x1 = x0 + geo.cellSize;
      const y1 = y0 + geo.cellSize;
      if (cell.top) segments.push({ x1: x0, y1: y0, x2: x1, y2: y0 });
      if (cell.left) segments.push({ x1: x0, y1: y0, x2: x0, y2: y1 });
      if (r === rows - 1 && cell.bottom) segments.push({ x1: x0, y1: y1, x2: x1, y2: y1 });
      if (c === cols - 1 && cell.right) segments.push({ x1: x1, y1: y0, x2: x1, y2: y1 });
    }
  }
  return segments;
}

/** 墙壁线段合并为一条 SVG path（一次绘制，性能更好） */
export function wallsToPathD(segments: WallSegment[]): string {
  return segments.map((s) => `M${s.x1} ${s.y1}L${s.x2} ${s.y2}`).join("");
}

/** solution（cell 坐标）转换为 SVG 中心点坐标 */
export function solutionToSvgPoints(
  solution: Point[],
  geo: MazeGeometry
): Point[] {
  return solution.map((p) => cellCenter(geo, p.y, p.x));
}

export function pointsToPathD(points: Point[]): string {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  return `M${first.x} ${first.y}` + rest.map((p) => `L${p.x} ${p.y}`).join("");
}

/**
 * iPad / 小屏适配：按可用屏幕宽度降级 cell 数。
 *
 * 原则（用户反馈）：网格太多时手指一格太窄，宁可减少格子
 * 也要保证每个格子够宽、好画。viewBox 不变，cellSize 由
 * 实际行列数决定，所以降级 = 每格更大。
 *
 * @param maxScreenWidth 游戏区域可用屏幕宽度（px）
 * @param minCellPx      手指划线最小 cell 宽度，默认 44px（无障碍）
 */
export function adaptGridToScreen(
  rows: number,
  cols: number,
  maxScreenWidth: number,
  minCellPx: number = 44
): { rows: number; cols: number; degraded: boolean } {
  // 估算 cellSize：viewBox 1000 宽，迷宫占 920（padding 40×2），
  // 屏幕 px = 逻辑单位 × (maxScreenWidth / 1000)
  const scale = maxScreenWidth / 1000;
  const usableView = 1000 - 80; // padding

  let newCols = cols;
  let newRows = rows;
  let degraded = false;

  // 先降 cols（横向是瓶颈），再降 rows
  while (newCols > 3 && (usableView / newCols) * scale < minCellPx) {
    newCols--;
    degraded = true;
  }
  while (newRows > 3 && (usableView / newRows) * scale < minCellPx * 0.8) {
    newRows--;
    degraded = true;
  }

  return { rows: newRows, cols: newCols, degraded };
}

/** 两点距离（逻辑单位） */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
