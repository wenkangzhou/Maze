"use client";

/**
 * 游戏页面（需求 #6）：迷宫是绝对主角，UI 极简。
 *
 * - 顶栏只有「← 返回 / 关卡名·编号 / 💡 提示」
 * - iPad / 小屏按屏幕宽度自适应降级网格（用户反馈：格子太多不好画）
 * - 通关弹窗含「提高难度」（用户反馈）：进入下一等级第一张图
 * - 通关自动保存进度 + 星级
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MazeBoard, type DrawStatus } from "@/components/maze/MazeBoard";
import { CompletionDialog } from "@/components/ui/CompletionDialog";
import { HintMenu } from "@/components/ui/HintMenu";
import { OrientationHint } from "@/components/ui/OrientationHint";
import { getMazeConfig, getLevelConfigs, MAZE_CONFIGS } from "@/data/levels";
import { computePartialHint, computeStars } from "@/lib/maze/hint";
import { playAchievement, playClick, playComplete, playHint, playStart } from "@/lib/sound";
import {
  adaptGridToScreen,
  cellCenter,
  computeGeometry,
  solutionToSvgPoints,
} from "@/lib/maze/geometry";
import { generateMaze } from "@/lib/maze/generator";
import { useAppSettings, usePlayerProgress } from "@/lib/storage/hooks";
import { THEMES } from "@/lib/maze/themes";
import type { MazeLevel, Point } from "@/lib/maze/types";

const HINT_DURATION_MS = 3000;

export function MazeClient() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const config = getMazeConfig(id);

  const { progress, complete } = usePlayerProgress();
  const { settings } = useAppSettings();

  // --- iPad / 屏幕自适应：网格过多时降级（用户反馈） ---
  const [screenWidth, setScreenWidth] = useState(1024);
  useEffect(() => {
    const update = () => setScreenWidth(Math.min(window.innerWidth, 1200));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const adapted = useMemo(() => {
    if (!config) return null;
    // 迷宫区域大约占屏幕宽度的 92%
    const usable = screenWidth * 0.92;
    return adaptGridToScreen(config.rows, config.cols, usable, 44);
  }, [config, screenWidth]);

  const maze = useMemo(() => {
    if (!config || !adapted) return null;
    return generateMaze({
      rows: adapted.rows,
      cols: adapted.cols,
      seed: config.seed + (adapted.degraded ? `-fit${adapted.rows}x${adapted.cols}` : ""),
      level: config.level,
      id: config.id,
    });
  }, [config, adapted]);

  const theme = maze ? THEMES[maze.theme] : null;

  // --- 游玩状态 ---
  const [status, setStatus] = useState<DrawStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [tip, setTip] = useState<Point | null>(null);
  const [resetCount, setResetCount] = useState(0);

  // --- 提示 ---
  const [hintPoints, setHintPoints] = useState<Point[] | null>(null);
  const [usedPartialHint, setUsedPartialHint] = useState(false);
  const [showFullSolution, setShowFullSolution] = useState(false);
  const [usedFullSolution, setUsedFullSolution] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(false);

  const geo = useMemo(
    () => (maze ? computeGeometry(maze.rows, maze.cols) : null),
    [maze]
  );
  // 调试钩子：自动化测试可读取当前迷宫
  if (typeof window !== "undefined" && maze) {
    (window as unknown as { __mazeDebug?: unknown }).__mazeDebug = maze;
  }
  const solutionSvg = useMemo(
    () => (maze && geo ? solutionToSvgPoints(maze.solution, geo) : []),
    [maze, geo]
  );

  const resetState = useCallback(() => {
    setStatus("idle");
    setElapsedMs(0);
    setHintPoints(null);
    setUsedPartialHint(false);
    setShowFullSolution(false);
    setUsedFullSolution(false);
    setNewAchievements([]);
    setTip(null);
    savedRef.current = false;
  }, []);

  // 换图时重置
  useEffect(() => {
    resetState();
  }, [id, resetState]);

  if (!config || !maze || !theme || !geo) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <p className="text-neutral-400">没有找到这张迷宫</p>
        <button
          onClick={() => router.push("/")}
          className="min-h-11 rounded-2xl bg-[#5B7A4E] px-6 font-semibold text-white"
        >
          返回首页
        </button>
      </main>
    );
  }

  const level = config.level;
  const levelConfigs = getLevelConfigs(level);
  const idxInLevel = levelConfigs.findIndex((c) => c.id === config.id);
  const nextConfig = levelConfigs[idxInLevel + 1];
  const nextLevelFirst: string | null =
    level < 5 ? (MAZE_CONFIGS.find((c) => c.level === ((level + 1) as MazeLevel))?.id ?? null) : null;

  const handlePartialHint = () => {
    if (status === "completed") return;
    playHint(settings.sound);
    const from = tip ?? cellCenter(geo, maze.start.row, maze.start.col);
    setHintPoints(computePartialHint(solutionSvg, from));
    setUsedPartialHint(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintPoints(null), HINT_DURATION_MS);
  };

  const handleFullSolution = () => {
    if (status === "completed" || !settings.fullSolutionEnabled) return;
    playHint(settings.sound);
    setShowFullSolution(true);
    setUsedFullSolution(true);
  };

  const handleComplete = (info: { elapsedMs: number }) => {
    setElapsedMs(info.elapsedMs);
    if (!savedRef.current) {
      savedRef.current = true;
      const stars = computeStars(usedPartialHint, usedFullSolution);
      const unlocked = complete(config.id, level, stars, info.elapsedMs, usedPartialHint, usedFullSolution);
      setNewAchievements(unlocked);
      playComplete(settings.sound);
      if (unlocked.length > 0) playAchievement(settings.sound);
    }
  };

  /** 按钮统一轻点音效 */
  const withClick = (fn: () => void) => () => {
    playClick(settings.sound);
    fn();
  };

  const replay = () => {
    resetState();
    setResetCount((n) => n + 1);
  };

  const stars = computeStars(usedPartialHint, usedFullSolution);
  const showTimer = settings.timerVisible && elapsedMs > 0;

  return (
    <main className="flex h-dvh flex-col overscroll-none" style={{ background: theme.pageBg }}>
      {/* 顶栏：极简（需求 #6） */}
      <header className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={withClick(() => router.push(`/level/${level}`))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-black/5 active:scale-95"
          aria-label="返回"
        >
          ←
        </button>
        <h1 className="text-sm font-medium text-neutral-500">
          {theme.name} · {config.label}
        </h1>
        {showTimer && (
          <span className="ml-2 text-xs tabular-nums text-neutral-400">
            {(elapsedMs / 1000).toFixed(1)}s
          </span>
        )}
        <div className="ml-auto">
          <HintMenu
            onPartialHint={handlePartialHint}
            onFullSolution={handleFullSolution}
            fullSolutionShown={showFullSolution || !settings.fullSolutionEnabled}
          />
        </div>
      </header>

      {/* 竖屏且宽度太小时：轻量横屏提示（需求 #47，可关闭） */}
      <OrientationHint />

      {/* 迷宫 */}
      <section className="relative min-h-0 flex-1 px-2 pb-3">
        <MazeBoard
          key={`${config.id}-${adapted?.rows}x${adapted?.cols}-${resetCount}`}
          maze={maze}
          interactive
          hintPoints={hintPoints}
          showFullSolution={showFullSolution}
          onTipChange={setTip}
          onStatusChange={setStatus}
          onDrawStart={() => playStart(settings.sound)}
          onComplete={handleComplete}
        />

        {status === "completed" && (
          <CompletionDialog
            stars={settings.starsEnabled ? stars : 3}
            elapsedMs={settings.timerVisible ? elapsedMs : undefined}
            nextLabel={nextConfig ? "下一关" : "换一张"}
            newAchievements={newAchievements}
            onNext={withClick(() => {
              if (nextConfig) router.push(`/maze/${nextConfig.id}`);
              else replay();
            })}
            onReplay={withClick(replay)}
            onBack={withClick(() => router.push(`/level/${level}`))}
          />
        )}

        {/* 提高难度：通关后如果还有更高等级，提供入口（用户反馈） */}
        {status === "completed" && nextLevelFirst && level < 5 && (
          <button
            onClick={withClick(() => router.push(`/maze/${nextLevelFirst}`))}
            className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-xs font-medium text-neutral-500 shadow-sm backdrop-blur active:scale-95"
          >
            太简单了？试试 Level {level + 1} →
          </button>
        )}
      </section>

      {/* 底部提示文字（极简） */}
      {status !== "completed" && (
        <footer className="px-4 pb-3">
          <p className="text-center text-xs text-neutral-400">
            {status === "idle" && `从 ${theme.startEmoji} 出发，画线找到 ${theme.endEmoji}`}
            {status === "drawing" && "沿着路往前画…"}
            {status === "paused" && "点住线的末端，继续画"}
          </p>
        </footer>
      )}
    </main>
  );
}
