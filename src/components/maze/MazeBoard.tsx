"use client";

/**
 * MazeBoard：迷宫的 SVG 渲染 + 手指划线交互（第二阶段核心）。
 *
 * 交互状态机（需求 #22）：
 *   idle --(在起点容错区按下)--> drawing
 *   drawing --(pointerup/cancel)--> paused（轨迹保留）
 *   paused --(在轨迹末端附近按下)--> drawing
 *   drawing --(进入终点容错区)--> completed
 *
 * 关键规则：
 * - 碰墙不惩罚，只停止增加轨迹点（需求 #19），划回合法区域自动继续
 * - 允许走回头路、进死路（需求 #24）——所有合法区域都可通行
 * - 防穿墙：segment 采样检测（需求 #20）
 * - 高频 pointermove 按最小距离过滤（需求 #51）
 *
 * SVG 层级（需求 #32）：
 *   底板 → 合法区域(debug) → 网格(debug) → solution(debug) →
 *   玩家轨迹 → 墙壁 → 起点/终点
 */

import { useMemo, useRef, useState } from "react";
import {
  DEFAULT_TOLERANCE_RATIO,
  isSegmentWalkable,
  walkableRadius,
} from "@/lib/maze/collision";
import {
  cellCenter,
  computeGeometry,
  distance,
  pointsToPathD,
  VIEW_HEIGHT,
  VIEW_WIDTH,
  type GeometryOptions,
  type MazeGeometry,
} from "@/lib/maze/geometry";
import { screenPointToSvgPoint } from "@/lib/maze/screen";
import { openNeighbors } from "@/lib/maze/solver";
import { THEMES } from "@/lib/maze/themes";
import type { Maze, Point } from "@/lib/maze/types";
import { MazeMarker } from "./MazeMarker";
import { MazeWalls } from "./MazeWalls";
import { PlayerPath } from "./PlayerPath";
import { SolutionPath } from "./SolutionPath";

export type DrawStatus = "idle" | "drawing" | "paused" | "completed";

export interface MazeDebugFlags {
  showSolution?: boolean;
  showGrid?: boolean;
  showWalkable?: boolean;
}

/** pointermove 最小采样距离（逻辑单位，需求 #51：2~4） */
const MIN_POINT_DISTANCE = 3;

interface MazeBoardProps {
  maze: Maze;
  geometryOptions?: GeometryOptions;
  debug?: MazeDebugFlags;
  /** 是否开启手指划线（缩略图等静态场景关闭） */
  interactive?: boolean;
  /** 碰撞容差：合法区域比视觉道路宽出的比例，默认 +25% */
  toleranceRatio?: number;
  /** 局部提示片段（SVG 逻辑坐标），短暂展示后由父组件清除 */
  hintPoints?: Point[] | null;
  /** 完整答案（需求 #31：淡色常显，不遮挡玩家轨迹） */
  showFullSolution?: boolean;
  /** 当前笔尖位置变化时回传（用于局部提示定位） */
  onTipChange?: (tip: Point) => void;
  onComplete?: (info: { elapsedMs: number }) => void;
  onStatusChange?: (status: DrawStatus) => void;
  /** 每次从 idle/paused 进入 drawing 时触发（用于音效） */
  onDrawStart?: () => void;
  onPointerMoveSvg?: (p: Point) => void;
  onPointerLeaveSvg?: () => void;
}

/** 合法道路区域（debug 可视化）：与实际碰撞判定使用同一半径 */
function WalkableOverlay({
  maze,
  geo,
  toleranceRatio,
}: {
  maze: Maze;
  geo: MazeGeometry;
  toleranceRatio: number;
}) {
  const segments = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        const a = cellCenter(geo, r, c);
        for (const n of openNeighbors(maze, { row: r, col: c })) {
          if (n.row > r || n.col > c) {
            const b = cellCenter(geo, n.row, n.col);
            lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
          }
        }
      }
    }
    return lines;
  }, [maze, geo]);

  const w = walkableRadius(geo, toleranceRatio) * 2;
  return (
    <g opacity={0.35}>
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="#7CB87C"
          strokeWidth={w}
          strokeLinecap="round"
        />
      ))}
      {Array.from({ length: maze.rows }, (_, r) =>
        Array.from({ length: maze.cols }, (_, c) => {
          const p = cellCenter(geo, r, c);
          return <circle key={`${r}-${c}`} cx={p.x} cy={p.y} r={w / 2} fill="#7CB87C" />;
        })
      )}
    </g>
  );
}

/** cell 网格（debug） */
function GridOverlay({ maze, geo }: { maze: Maze; geo: MazeGeometry }) {
  const lines = [];
  for (let r = 0; r <= maze.rows; r++) {
    const y = geo.offsetY + r * geo.cellSize;
    lines.push(
      <line key={`h${r}`} x1={geo.offsetX} y1={y} x2={geo.offsetX + maze.cols * geo.cellSize} y2={y} />
    );
  }
  for (let c = 0; c <= maze.cols; c++) {
    const x = geo.offsetX + c * geo.cellSize;
    lines.push(
      <line key={`v${c}`} x1={x} y1={geo.offsetY} x2={x} y2={geo.offsetY + maze.rows * geo.cellSize} />
    );
  }
  return <g stroke="#D97757" strokeWidth={1} opacity={0.35}>{lines}</g>;
}

/** 通关粒子：少量 ⭐✨ 从终点散开，约 1 秒（需求 #26） */
function Celebration({ geo, maze }: { geo: MazeGeometry; maze: Maze }) {
  const c = cellCenter(geo, maze.end.row, maze.end.col);
  const particles = [
    { emoji: "⭐", dx: -60, dy: -50, delay: 0 },
    { emoji: "✨", dx: 55, dy: -60, delay: 80 },
    { emoji: "⭐", dx: 70, dy: 20, delay: 150 },
    { emoji: "✨", dx: -70, dy: 30, delay: 120 },
    { emoji: "🎉", dx: 0, dy: -85, delay: 40 },
    { emoji: "✨", dx: -20, dy: 75, delay: 180 },
  ];
  return (
    <g>
      {particles.map((p, i) => (
        <text
          key={i}
          x={c.x}
          y={c.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={geo.cellSize * 0.55}
          className="celebrate-particle"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              animationDelay: `${p.delay}ms`,
            } as React.CSSProperties
          }
        >
          {p.emoji}
        </text>
      ))}
    </g>
  );
}

export function MazeBoard({
  maze,
  geometryOptions,
  debug,
  interactive = false,
  toleranceRatio = DEFAULT_TOLERANCE_RATIO,
  hintPoints = null,
  showFullSolution = false,
  onTipChange,
  onComplete,
  onStatusChange,
  onDrawStart,
  onPointerMoveSvg,
  onPointerLeaveSvg,
}: MazeBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const geo = useMemo(
    () => computeGeometry(maze.rows, maze.cols, geometryOptions),
    [maze.rows, maze.cols, geometryOptions]
  );
  const theme = THEMES[maze.theme];

  // --- 划线状态：ref 保证事件回调里读到最新值，state 驱动渲染 ---
  const [status, setStatus] = useState<DrawStatus>("idle");
  const statusRef = useRef<DrawStatus>("idle");
  const [path, setPath] = useState<Point[]>([]);
  const pathRef = useRef<Point[]>([]);
  const startTimeRef = useRef(0);

  const setStatusAll = (s: DrawStatus) => {
    statusRef.current = s;
    setStatus(s);
    onStatusChange?.(s);
  };
  const setPathAll = (points: Point[]) => {
    pathRef.current = points;
    setPath(points);
    const tip = points[points.length - 1];
    if (tip) onTipChange?.(tip);
  };

  // 容错半径（需求 #15：视觉起点 ~24px，实际判定 40-48px，儿童操作必须宽容）
  const startRadius = geo.pathWidth * 1.1;
  const resumeRadius = geo.pathWidth * 0.9;
  const endRadius = geo.pathWidth * 0.9; // 大于终点视觉尺寸（需求 #25）

  const toSvgPoint = (e: React.PointerEvent): Point =>
    screenPointToSvgPoint(svgRef.current!, e.clientX, e.clientY);

  const capturePointer = (e: React.PointerEvent) => {
    try {
      svgRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // 部分环境下 capture 不可用，忽略
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive || statusRef.current === "completed") return;
    const p = toSvgPoint(e);
    const startC = cellCenter(geo, maze.start.row, maze.start.col);

    if (statusRef.current === "idle") {
      // 只有点击起点附近才开始（需求 #15）
      if (distance(p, startC) <= startRadius) {
        capturePointer(e);
        setStatusAll("drawing");
        onDrawStart?.();
        startTimeRef.current = Date.now();
        setPathAll([startC, p]);
      }
      return;
    }

    if (statusRef.current === "paused") {
      // 从轨迹末端附近继续（需求 #23）
      const last = pathRef.current[pathRef.current.length - 1];
      if (last && distance(p, last) <= resumeRadius) {
        capturePointer(e);
        setStatusAll("drawing");
        onDrawStart?.();
        if (isSegmentWalkable(last, p, maze, geo, toleranceRatio)) {
          setPathAll([...pathRef.current, p]);
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const p = toSvgPoint(e);
    onPointerMoveSvg?.(p);
    if (statusRef.current !== "drawing") return;

    const last = pathRef.current[pathRef.current.length - 1];
    if (!last) return;
    // 高频事件过滤（需求 #51）
    if (distance(last, p) < MIN_POINT_DISTANCE) return;
    // 碰墙：什么都不做，只停止增加轨迹点（需求 #19）；防穿墙（需求 #20）
    if (!isSegmentWalkable(last, p, maze, geo, toleranceRatio)) return;

    const next = [...pathRef.current, p];
    setPathAll(next);

    // 终点检测（需求 #25）
    const endC = cellCenter(geo, maze.end.row, maze.end.col);
    if (distance(p, endC) <= endRadius) {
      setPathAll([...next, endC]);
      setStatusAll("completed");
      onComplete?.({ elapsedMs: Date.now() - startTimeRef.current });
    }
  };

  const handlePointerUp = () => {
    // 中途松开：轨迹保留，进入 paused（需求 #22）
    if (statusRef.current === "drawing") setStatusAll("paused");
  };

  const mazeW = maze.cols * geo.cellSize;
  const mazeH = maze.rows * geo.cellSize;
  const pad = Math.max(geo.wallWidth, 6);
  const completed = status === "completed";

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className="block h-full w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={onPointerLeaveSvg}
    >
      {/* 迷宫底板 */}
      <rect
        x={geo.offsetX - pad}
        y={geo.offsetY - pad}
        width={mazeW + pad * 2}
        height={mazeH + pad * 2}
        rx={pad}
        fill={theme.boardBg}
      />

      <g className={completed ? "opacity-60 transition-opacity duration-500" : undefined}>
        {debug?.showWalkable && (
          <WalkableOverlay maze={maze} geo={geo} toleranceRatio={toleranceRatio} />
        )}
        {debug?.showGrid && <GridOverlay maze={maze} geo={geo} />}
        {/* 完整答案（需求 #31：淡色，位于玩家轨迹之下） */}
        {(debug?.showSolution || showFullSolution) && (
          <SolutionPath
            maze={maze}
            geo={geo}
            color={theme.hintStroke}
            dashed={!showFullSolution}
          />
        )}
        {/* 局部提示（需求 #30：虚线淡色半透明，短暂展示） */}
        {hintPoints && hintPoints.length > 1 && (
          <path
            d={pointsToPathD(hintPoints)}
            stroke={theme.hintStroke}
            strokeWidth={Math.max(3, geo.wallWidth * 0.8)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${geo.cellSize * 0.22} ${geo.cellSize * 0.16}`}
            opacity={0.7}
            fill="none"
            className="hint-march"
          />
        )}

        {interactive && (
          <PlayerPath
            points={path}
            strokeWidth={geo.pathWidth * 0.5}
            color={theme.pathStroke}
          />
        )}

        <MazeWalls maze={maze} geo={geo} color={theme.wall} />
      </g>

      {/* idle 时起点外圈呼吸脉冲：不用文字告诉孩子「从这里开始」（第六阶段） */}
      {interactive && status === "idle" && (
        <circle
          cx={cellCenter(geo, maze.start.row, maze.start.col).x}
          cy={cellCenter(geo, maze.start.row, maze.start.col).y}
          r={geo.pathWidth * 0.85}
          fill="none"
          stroke={theme.wall}
          strokeWidth={geo.wallWidth * 0.7}
          className="start-pulse"
        />
      )}
      <MazeMarker geo={geo} cell={maze.start} emoji={theme.startEmoji} bg="#E8F3E4" ring={theme.wall} />
      {/* 终点：通关时轻微放大（需求 #26） */}
      <g
        className={completed ? "transition-transform duration-500" : undefined}
        style={
          completed
            ? {
                transform: `scale(1.25)`,
                transformOrigin: `${cellCenter(geo, maze.end.row, maze.end.col).x}px ${cellCenter(geo, maze.end.row, maze.end.col).y}px`,
              }
            : undefined
        }
      >
        <MazeMarker geo={geo} cell={maze.end} emoji={theme.endEmoji} bg="#FBEDDD" ring={theme.wall} />
      </g>
      {completed && <Celebration geo={geo} maze={maze} />}
    </svg>
  );
}
