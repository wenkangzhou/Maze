/**
 * 提示系统（需求 #29-#31）。
 *
 * - 局部提示：找到玩家当前位置在正确路线上最近的点，
 *   展示其后 10%~15% 的路线（虚线淡色，约 3 秒自动消失）
 * - 完整答案：整条 solution，淡色，不遮挡玩家轨迹
 *
 * 坐标约定：输入输出均为 SVG 逻辑坐标。
 */

import type { Point } from "./types";

/** 局部提示展示剩余路线的比例（需求 #30：10%-15%） */
export const PARTIAL_HINT_RATIO = 0.12;
/** 局部提示至少展示的 cell 数 */
export const PARTIAL_HINT_MIN_CELLS = 3;

/**
 * 在 solution 上找离玩家位置最近的点，返回其下标。
 * solutionPoints / playerPos 均为 SVG 逻辑坐标。
 */
export function nearestSolutionIndex(solutionPoints: Point[], playerPos: Point): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < solutionPoints.length; i++) {
    const d = Math.hypot(solutionPoints[i].x - playerPos.x, solutionPoints[i].y - playerPos.y);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * 计算局部提示片段：从玩家当前位置对应的 solution 点开始，
 * 截取剩余路线的前 ratio 部分。返回 SVG 逻辑坐标点列。
 */
export function computePartialHint(
  solutionPoints: Point[],
  playerPos: Point,
  ratio: number = PARTIAL_HINT_RATIO
): Point[] {
  if (solutionPoints.length < 2) return [];
  const startIdx = nearestSolutionIndex(solutionPoints, playerPos);
  const remaining = solutionPoints.length - 1 - startIdx;
  if (remaining <= 0) return [];
  const count = Math.min(
    remaining,
    Math.max(PARTIAL_HINT_MIN_CELLS, Math.ceil(solutionPoints.length * ratio))
  );
  return solutionPoints.slice(startIdx, startIdx + count + 1);
}

/**
 * 星级规则（需求 #28）：
 * - 完全没有提示：★★★
 * - 用了局部提示但没看完整答案：★★☆
 * - 查看完整答案：★☆☆
 * 不根据速度 / 走错次数 / 碰墙次数扣星。
 */
export function computeStars(usedPartialHint: boolean, usedFullSolution: boolean): 1 | 2 | 3 {
  if (usedFullSolution) return 1;
  if (usedPartialHint) return 2;
  return 3;
}
