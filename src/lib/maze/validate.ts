/**
 * Maze Validator（需求 #43）：识别结构不合法的地图。
 */

import { reachableCount } from "./difficulty";
import { hasWallBetween, solveMaze } from "./solver";
import type { Maze } from "./types";

export interface MazeValidation {
  valid: boolean;
  errors: string[];
}

export function validateMaze(
  maze: Pick<Maze, "rows" | "cols" | "cells" | "start" | "end">
): MazeValidation {
  const errors: string[] = [];
  const { rows, cols } = maze;

  // 1. 起点终点在界内
  const inBounds = (r: number, c: number) => r >= 0 && r < rows && c >= 0 && c < cols;
  if (!inBounds(maze.start.row, maze.start.col)) errors.push("起点超出地图范围");
  if (!inBounds(maze.end.row, maze.end.col)) errors.push("终点超出地图范围");

  // 2. 起点终点不能相同 / 紧邻
  const manhattan =
    Math.abs(maze.start.row - maze.end.row) + Math.abs(maze.start.col - maze.end.col);
  if (manhattan === 0) errors.push("起点和终点相同");
  else if (manhattan < 2) errors.push("起点和终点紧邻");

  // 3. 起点终点可达 + solution 存在
  const solution = solveMaze(maze);
  if (solution.length === 0) {
    errors.push("起点终点不可达，solution 不存在");
  } else {
    // 4. solution 不能太短
    const minLength = Math.max(3, Math.floor((rows + cols) / 2));
    if (solution.length < minLength) {
      errors.push(`solution 太短：${solution.length} < ${minLength}`);
    }
    // 5. solution 不穿墙
    for (let i = 1; i < solution.length; i++) {
      const a = { row: solution[i - 1].y, col: solution[i - 1].x };
      const b = { row: solution[i].y, col: solution[i].x };
      if (hasWallBetween(maze, a, b)) {
        errors.push(`solution 在 (${a.row},${a.col}) -> (${b.row},${b.col}) 穿墙`);
        break;
      }
    }
  }

  // 6. 不存在孤立区域：start 可达所有 cell
  const reachable = reachableCount(maze);
  if (reachable < rows * cols) {
    errors.push(`存在孤立区域：仅 ${reachable}/${rows * cols} 个 cell 可达`);
  }

  return { valid: errors.length === 0, errors };
}
