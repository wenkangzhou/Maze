"use client";

/**
 * SolutionPath：完整正确路线（debug / 完整答案提示用）。
 * 淡色、虚线、不遮挡玩家轨迹（位于玩家层之下，需求 #32）。
 */

import { useMemo } from "react";
import { pointsToPathD, solutionToSvgPoints, type MazeGeometry } from "@/lib/maze/geometry";
import type { Maze } from "@/lib/maze/types";

interface SolutionPathProps {
  maze: Maze;
  geo: MazeGeometry;
  color: string;
  /** 虚线样式：局部提示用虚线，完整答案用细实线也可 */
  dashed?: boolean;
}

export function SolutionPath({ maze, geo, color, dashed = true }: SolutionPathProps) {
  const d = useMemo(
    () => pointsToPathD(solutionToSvgPoints(maze.solution, geo)),
    [maze, geo]
  );
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={Math.max(2, geo.wallWidth * 0.6)}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={dashed ? `${geo.cellSize * 0.18} ${geo.cellSize * 0.14}` : undefined}
      opacity={0.55}
      fill="none"
    />
  );
}
