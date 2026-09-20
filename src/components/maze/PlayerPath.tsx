"use client";

/**
 * PlayerPath：玩家手指轨迹（需求 #16 / #52）。
 *
 * - 数据层保留原始采样点，渲染层用 quadratic Bézier 平滑
 * - 粗描边、圆头圆角、半透明，不遮挡墙壁（层级在墙壁之下）
 * - 末端画一个「笔尖」圆点，方便孩子看清当前位置
 */

import type { Point } from "@/lib/maze/types";

interface PlayerPathProps {
  points: Point[];
  strokeWidth: number;
  color: string;
}

/** quadratic Bézier 平滑：以相邻点中点为锚点，原采样点为控制点 */
export function smoothPathD(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join("");
  }
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    d += `Q${points[i].x} ${points[i].y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += `L${last.x} ${last.y}`;
  return d;
}

export function PlayerPath({ points, strokeWidth, color }: PlayerPathProps) {
  if (points.length === 0) return null;
  const tip = points[points.length - 1];
  return (
    <g>
      <path
        d={smoothPathD(points)}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
        fill="none"
      />
      <circle cx={tip.x} cy={tip.y} r={strokeWidth * 0.55} fill={color} opacity={0.9} />
    </g>
  );
}
