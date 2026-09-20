"use client";

/**
 * MiniMazePreview：Level 页面的迷宫缩略图（需求 #46）。
 * 只画墙壁 + 起点/终点小圆点，不显示答案和轨迹。
 */

import { useMemo } from "react";
import {
  cellCenter,
  computeGeometry,
  wallSegments,
  wallsToPathD,
} from "@/lib/maze/geometry";
import { THEMES } from "@/lib/maze/themes";
import type { Maze } from "@/lib/maze/types";

interface MiniMazePreviewProps {
  maze: Maze;
  size?: number;
}

export function MiniMazePreview({ maze, size = 120 }: MiniMazePreviewProps) {
  const geo = useMemo(
    () => computeGeometry(maze.rows, maze.cols, { padding: 24, pathRatio: 0.5 }),
    [maze.rows, maze.cols]
  );
  const walls = useMemo(() => wallsToPathD(wallSegments(maze, geo)), [maze, geo]);
  const theme = THEMES[maze.theme];
  const s = cellCenter(geo, maze.start.row, maze.start.col);
  const e = cellCenter(geo, maze.end.row, maze.end.col);

  return (
    <svg
      viewBox={`0 0 1000 700`}
      width={size}
      height={size * 0.7}
      className="block"
      aria-hidden
    >
      <path
        d={walls}
        stroke={theme.wall}
        strokeWidth={Math.max(4, geo.wallWidth)}
        fill="none"
        strokeLinecap="square"
      />
      <circle cx={s.x} cy={s.y} r={geo.cellSize * 0.3} fill={theme.pathStroke} />
      <circle cx={e.x} cy={e.y} r={geo.cellSize * 0.3} fill={theme.wall} opacity={0.55} />
    </svg>
  );
}
