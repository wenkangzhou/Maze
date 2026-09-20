"use client";

/**
 * MazeWalls：全部墙壁合并为一条 <path>，一次绘制。
 * 墙壁永远位于轨迹 / 提示层的上方（需求 #32）。
 */

import { useMemo } from "react";
import { wallSegments, wallsToPathD, type MazeGeometry } from "@/lib/maze/geometry";
import type { Maze } from "@/lib/maze/types";

interface MazeWallsProps {
  maze: Maze;
  geo: MazeGeometry;
  color: string;
}

export function MazeWalls({ maze, geo, color }: MazeWallsProps) {
  const d = useMemo(
    () => wallsToPathD(wallSegments(maze, geo)),
    [maze, geo]
  );
  return (
    <path
      d={d}
      stroke={color}
      strokeWidth={geo.wallWidth}
      strokeLinecap="square"
      fill="none"
    />
  );
}
