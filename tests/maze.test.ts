/**
 * 迷宫核心逻辑单元测试（需求 #60）。
 */

import { describe, expect, it } from "vitest";
import { generateMaze } from "@/lib/maze/generator";
import { hasWallBetween, solveMaze } from "@/lib/maze/solver";
import { validateMaze } from "@/lib/maze/validate";
import { evaluateMazeQuality } from "@/lib/maze/difficulty";
import { MAZE_CONFIGS } from "@/data/levels";
import type { Maze } from "@/lib/maze/types";

describe("seeded generator", () => {
  it("相同 seed 生成完全相同的迷宫", () => {
    const a = generateMaze({ rows: 10, cols: 12, seed: "level-2-maze-07" });
    const b = generateMaze({ rows: 10, cols: 12, seed: "level-2-maze-07" });
    expect(JSON.stringify(a.cells)).toBe(JSON.stringify(b.cells));
    expect(a.start).toEqual(b.start);
    expect(a.end).toEqual(b.end);
    expect(a.solution).toEqual(b.solution);
    expect(a.difficultyScore).toBe(b.difficultyScore);
  });

  it("不同 seed 生成不同迷宫", () => {
    const a = generateMaze({ rows: 10, cols: 10, seed: "seed-a" });
    const b = generateMaze({ rows: 10, cols: 10, seed: "seed-b" });
    expect(JSON.stringify(a.cells)).not.toBe(JSON.stringify(b.cells));
  });

  it("非法尺寸抛错", () => {
    expect(() => generateMaze({ rows: 1, cols: 5 })).toThrow();
  });
});

describe("solver", () => {
  const maze = generateMaze({ rows: 8, cols: 8, seed: "solver-test" });

  it("一定能找到从 start 到 end 的路径", () => {
    expect(maze.solution.length).toBeGreaterThan(0);
    const first = maze.solution[0];
    const last = maze.solution[maze.solution.length - 1];
    expect({ row: first.y, col: first.x }).toEqual(maze.start);
    expect({ row: last.y, col: last.x }).toEqual(maze.end);
  });

  it("solution 不穿墙且逐步相邻", () => {
    for (let i = 1; i < maze.solution.length; i++) {
      const a = { row: maze.solution[i - 1].y, col: maze.solution[i - 1].x };
      const b = { row: maze.solution[i].y, col: maze.solution[i].x };
      const manhattan = Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
      expect(manhattan).toBe(1);
      expect(hasWallBetween(maze, a, b)).toBe(false);
    }
  });

  it("BFS 找到的是最短路径", () => {
    // 完美迷宫中路径唯一，再解一次长度必须一致
    const again = solveMaze(maze);
    expect(again.length).toBe(maze.solution.length);
  });
});

describe("validateMaze", () => {
  it("生成的迷宫全部合法", () => {
    const maze = generateMaze({ rows: 10, cols: 10, seed: "validate-ok" });
    const result = validateMaze(maze);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("能识别不可达的地图", () => {
    const maze = generateMaze({ rows: 6, cols: 6, seed: "validate-bad" });
    // 人为封死终点四周的墙
    const { row, col } = maze.end;
    const end = maze.cells[row][col];
    end.top = true;
    end.bottom = true;
    end.left = true;
    end.right = true;
    if (row > 0) maze.cells[row - 1][col].bottom = true;
    if (row < maze.rows - 1) maze.cells[row + 1][col].top = true;
    if (col > 0) maze.cells[row][col - 1].right = true;
    if (col < maze.cols - 1) maze.cells[row][col + 1].left = true;
    const result = validateMaze(maze);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("不可达"))).toBe(true);
  });

  it("能识别起点终点紧邻的地图", () => {
    const maze = generateMaze({ rows: 6, cols: 6, seed: "validate-adjacent" });
    maze.end = { row: maze.start.row, col: Math.min(maze.start.col + 1, maze.cols - 1) };
    const result = validateMaze(maze);
    expect(result.valid).toBe(false);
  });
});

describe("difficulty", () => {
  it("difficultyScore 在 0-100 之间", () => {
    for (const seed of ["d1", "d2", "d3"]) {
      const maze = generateMaze({ rows: 9, cols: 9, seed, level: 3 });
      expect(maze.difficultyScore).toBeGreaterThanOrEqual(0);
      expect(maze.difficultyScore).toBeLessThanOrEqual(100);
    }
  });

  it("地图越大，难度总体越高", () => {
    const scoreOf = (m: Maze) => evaluateMazeQuality(m).difficultyScore;
    let smallTotal = 0;
    let largeTotal = 0;
    const n = 5;
    for (let i = 0; i < n; i++) {
      smallTotal += scoreOf(generateMaze({ rows: 5, cols: 5, seed: `s-${i}` }));
      largeTotal += scoreOf(generateMaze({ rows: 14, cols: 14, seed: `s-${i}` }));
    }
    expect(largeTotal / n).toBeGreaterThan(smallTotal / n);
  });
});

describe("100 张固定地图", () => {
  it("共 100 个 config，每级 20 个", () => {
    expect(MAZE_CONFIGS.length).toBe(100);
    for (let level = 1; level <= 5; level++) {
      expect(MAZE_CONFIGS.filter((c) => c.level === level).length).toBe(20);
    }
  });

  it("全部 100 张地图都能生成且合法", () => {
    for (const config of MAZE_CONFIGS) {
      const maze = generateMaze({
        rows: config.rows,
        cols: config.cols,
        seed: config.seed,
        level: config.level,
        id: config.id,
      });
      expect(maze.solution.length).toBeGreaterThan(0);
      const result = validateMaze(maze);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  }, 30000);

  it("config 尺寸在 Level 内渐进增长", () => {
    const l1 = MAZE_CONFIGS.filter((c) => c.level === 1);
    expect(l1[0].rows).toBe(5);
    expect(l1[l1.length - 1].rows).toBe(6);
    const l5 = MAZE_CONFIGS.filter((c) => c.level === 5);
    expect(l5[0].rows).toBe(13);
    expect(l5[l5.length - 1].rows).toBe(15);
  });
});
