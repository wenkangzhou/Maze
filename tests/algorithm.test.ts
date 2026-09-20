/**
 * 生成算法与难度测试：
 * - 三种算法生成的迷宫都合法（连通、solution 不穿墙）
 * - Wilson 的岔路密度显著高于 RB（解决「Level 5 只是路远、岔路太少」）
 */

import { describe, expect, it } from "vitest";
import { evaluateMazeQuality } from "@/lib/maze/difficulty";
import { defaultAlgorithmForLevel, generateMaze } from "@/lib/maze/generator";
import { validateMaze } from "@/lib/maze/validate";
import type { MazeAlgorithm } from "@/lib/maze/types";

const ALGORITHMS: MazeAlgorithm[] = ["recursive-backtracking", "prim", "wilson"];

describe("生成算法", () => {
  for (const algo of ALGORITHMS) {
    it(`${algo}：生成合法迷宫且相同 seed 可复现`, () => {
      const a = generateMaze({ rows: 12, cols: 12, seed: `algo-${algo}`, algorithm: algo });
      const b = generateMaze({ rows: 12, cols: 12, seed: `algo-${algo}`, algorithm: algo });
      expect(JSON.stringify(a.cells)).toBe(JSON.stringify(b.cells));
      const result = validateMaze(a);
      expect(result.errors).toEqual([]);
      expect(a.solution.length).toBeGreaterThan(0);
    });
  }

  it("默认算法按等级选择", () => {
    expect(defaultAlgorithmForLevel(1)).toBe("recursive-backtracking");
    expect(defaultAlgorithmForLevel(2)).toBe("recursive-backtracking");
    expect(defaultAlgorithmForLevel(3)).toBe("prim");
    expect(defaultAlgorithmForLevel(4)).toBe("prim");
    expect(defaultAlgorithmForLevel(5)).toBe("wilson");
  });

  it("Wilson 的岔路密度显著高于 RB", () => {
    let rbTotal = 0;
    let wilsonTotal = 0;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const rb = generateMaze({ rows: 14, cols: 14, seed: `density-${i}`, algorithm: "recursive-backtracking" });
      const wilson = generateMaze({ rows: 14, cols: 14, seed: `density-${i}`, algorithm: "wilson" });
      rbTotal += evaluateMazeQuality(rb).branches;
      wilsonTotal += evaluateMazeQuality(wilson).branches;
    }
    // Wilson（均匀生成树）的岔路数量应明显多于 RB
    expect(wilsonTotal / n).toBeGreaterThan((rbTotal / n) * 1.15);
  });

  it("Level 5 预设迷宫的难度高于 Level 1", () => {
    let l1 = 0;
    let l5 = 0;
    for (let i = 1; i <= 5; i++) {
      const nn = String(i).padStart(2, "0");
      l1 += evaluateMazeQuality(
        generateMaze({ rows: 5, cols: 5, seed: `level-1-maze-${nn}`, level: 1 })
      ).difficultyScore;
      l5 += evaluateMazeQuality(
        generateMaze({ rows: 13, cols: 13, seed: `level-5-maze-${nn}`, level: 5 })
      ).difficultyScore;
    }
    expect(l5 / 5).toBeGreaterThan(l1 / 5);
  });
});
