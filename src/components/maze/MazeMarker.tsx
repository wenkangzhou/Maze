"use client";

/**
 * 起点 / 终点标记（需求 #56）：
 * 首版用 emoji 占位（草地 🐰→🥕 等），后续替换为统一 SVG 插画。
 * 视觉尺寸约 cellSize 的 80%，实际判定半径会更大（第二轮）。
 */

import { cellCenter, type MazeGeometry } from "@/lib/maze/geometry";
import type { CellPos } from "@/lib/maze/types";

interface MarkerProps {
  geo: MazeGeometry;
  cell: CellPos;
  emoji: string;
  /** 底色 */
  bg: string;
  ring: string;
}

export function MazeMarker({ geo, cell, emoji, bg, ring }: MarkerProps) {
  const c = cellCenter(geo, cell.row, cell.col);
  const r = geo.cellSize * 0.42;
  return (
    <g>
      <circle cx={c.x} cy={c.y} r={r} fill={bg} stroke={ring} strokeWidth={Math.max(2, geo.wallWidth * 0.5)} />
      <text
        x={c.x}
        y={c.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={geo.cellSize * 0.5}
      >
        {emoji}
      </text>
    </g>
  );
}
