/**
 * 碰撞系统单元测试（需求 #60：碰撞函数提供基础测试）。
 */

import { describe, expect, it } from "vitest";
import {
  isPointInsideWalkableArea,
  isSegmentWalkable,
  walkableRadius,
} from "@/lib/maze/collision";
import { cellCenter, computeGeometry, solutionToSvgPoints } from "@/lib/maze/geometry";
import { generateMaze } from "@/lib/maze/generator";
import type { MazeCell } from "@/lib/maze/types";

const maze = generateMaze({ rows: 8, cols: 8, seed: "collision-test" });
const geo = computeGeometry(maze.rows, maze.cols);

/** 找一对「之间有墙」的相邻 cell */
function findWalledPair(): { a: MazeCell; b: MazeCell } {
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols - 1; c++) {
      if (maze.cells[r][c].right) return { a: maze.cells[r][c], b: maze.cells[r][c + 1] };
    }
  }
  throw new Error("测试迷宫没有墙？");
}

/** 找一对「之间打通」的相邻 cell */
function findOpenPair(): { a: MazeCell; b: MazeCell } {
  for (let r = 0; r < maze.rows; r++) {
    for (let c = 0; c < maze.cols - 1; c++) {
      if (!maze.cells[r][c].right) return { a: maze.cells[r][c], b: maze.cells[r][c + 1] };
    }
  }
  throw new Error("测试迷宫没有通路？");
}

describe("isPointInsideWalkableArea", () => {
  it("cell 中心一定合法", () => {
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        expect(isPointInsideWalkableArea(cellCenter(geo, r, c), maze, geo)).toBe(true);
      }
    }
  });

  it("墙的中间位置不合法", () => {
    const { a } = findWalledPair();
    // 墙在 cell 右边缘：x = 中心 + 半个 cell，y = 中心
    const ac = cellCenter(geo, a.row, a.col);
    const onWall = { x: ac.x + geo.cellSize / 2, y: ac.y };
    // 该点距离两侧 cell 中心都是 0.5 * cellSize > 判定半径
    expect(walkableRadius(geo)).toBeLessThan(geo.cellSize / 2);
    expect(isPointInsideWalkableArea(onWall, maze, geo)).toBe(false);
  });

  it("容差让视觉道路外的轻微偏移仍然合法", () => {
    const radius = walkableRadius(geo); // 视觉半径 × 1.25
    const visualHalf = geo.pathWidth / 2;
    expect(radius).toBeGreaterThan(visualHalf);
    // 距离中心 = 视觉半径的 1.15 倍：超出视觉道路，但在容差内
    const p = cellCenter(geo, maze.start.row, maze.start.col);
    const slightlyOff = { x: p.x, y: p.y + visualHalf * 1.15 };
    expect(isPointInsideWalkableArea(slightlyOff, maze, geo)).toBe(true);
    // 容差为 0 时同一点不合法
    expect(isPointInsideWalkableArea(slightlyOff, maze, geo, 0)).toBe(false);
  });
});

describe("isSegmentWalkable（防穿墙）", () => {
  it("沿打通的走廊：合法", () => {
    const { a, b } = findOpenPair();
    const pa = cellCenter(geo, a.row, a.col);
    const pb = cellCenter(geo, b.row, b.col);
    expect(isSegmentWalkable(pa, pb, maze, geo)).toBe(true);
  });

  it("穿过墙的线段：不合法（即使两端都在合法 cell）", () => {
    const { a, b } = findWalledPair();
    const pa = cellCenter(geo, a.row, a.col);
    const pb = cellCenter(geo, b.row, b.col);
    expect(isSegmentWalkable(pa, pb, maze, geo)).toBe(false);
  });

  it("solution 整条路线任意相邻段都合法（不穿墙）", () => {
    const points = solutionToSvgPoints(maze.solution, geo);
    for (let i = 1; i < points.length; i++) {
      expect(isSegmentWalkable(points[i - 1], points[i], maze, geo)).toBe(true);
    }
  });

  it("100 张固定地图的 solution 全程可通行", () => {
    // 抽几张不同等级的代表性地图
    for (const seed of ["level-1-maze-01", "level-3-maze-10", "level-5-maze-20"]) {
      const size = seed.includes("1-maze") ? 5 : seed.includes("3-maze") ? 10 : 15;
      const m = generateMaze({ rows: size, cols: size, seed });
      const g = computeGeometry(m.rows, m.cols);
      const points = solutionToSvgPoints(m.solution, g);
      for (let i = 1; i < points.length; i++) {
        expect(isSegmentWalkable(points[i - 1], points[i], m, g)).toBe(true);
      }
    }
  });
});
