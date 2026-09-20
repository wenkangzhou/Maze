/**
 * 提示系统单元测试（需求 #28 / #30）。
 */

import { describe, expect, it } from "vitest";
import { computePartialHint, computeStars, nearestSolutionIndex } from "@/lib/maze/hint";
import { computeGeometry, solutionToSvgPoints } from "@/lib/maze/geometry";
import { generateMaze } from "@/lib/maze/generator";

const maze = generateMaze({ rows: 10, cols: 10, seed: "hint-test" });
const geo = computeGeometry(maze.rows, maze.cols);
const solution = solutionToSvgPoints(maze.solution, geo);

describe("computeStars（星级规则）", () => {
  it("完全没有提示：★★★", () => {
    expect(computeStars(false, false)).toBe(3);
  });
  it("只用局部提示：★★☆", () => {
    expect(computeStars(true, false)).toBe(2);
  });
  it("看了完整答案：★☆☆（即使也用了局部提示）", () => {
    expect(computeStars(false, true)).toBe(1);
    expect(computeStars(true, true)).toBe(1);
  });
});

describe("computePartialHint（局部提示）", () => {
  it("从未开始时：从起点展示一小段", () => {
    const start = solution[0];
    const hint = computePartialHint(solution, start);
    expect(hint.length).toBeGreaterThanOrEqual(4); // 起点 + 至少 3 格
    expect(hint[0]).toEqual(start);
    // 片段长度约为 solution 的 12%
    expect(hint.length).toBeLessThanOrEqual(Math.ceil(solution.length * 0.15) + 2);
  });

  it("走到一半时：从最近点继续展示", () => {
    const mid = solution[Math.floor(solution.length / 2)];
    const hint = computePartialHint(solution, mid);
    expect(hint.length).toBeGreaterThan(1);
    expect(hint[0]).toEqual(mid);
  });

  it("已在终点附近时：不给空提示", () => {
    const end = solution[solution.length - 1];
    const hint = computePartialHint(solution, end);
    expect(hint.length).toBe(0);
  });

  it("nearestSolutionIndex 找到最近点", () => {
    const idx = nearestSolutionIndex(solution, solution[5]);
    expect(idx).toBe(5);
  });
});
