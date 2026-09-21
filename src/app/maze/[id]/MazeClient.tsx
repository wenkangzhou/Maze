"use client";

/**
 * 游戏页面（需求 #6）：迷宫是绝对主角，UI 极简。
 *
 * - 顶栏只有「← 返回 / 关卡名·编号 / 💡 提示」
 * - iPad / 小屏按迷宫区域的实际宽高自适应降级网格
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
import { isLevelUnlocked, isMazeUnlocked } from "@/lib/storage/progress";
import { THEMES } from "@/lib/maze/themes";
import type { MazeLevel, Point } from "@/lib/maze/types";

const HINT_DURATION_MS = 3000;

export function MazeClient() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const config = getMazeConfig(id);

  const { progress, complete, hydrated: progressHydrated } = usePlayerProgress();
  const { settings, hydrated: settingsHydrated } = useAppSettings();

  // --- iPad / 屏幕自适应：网格过多时降级（用户反馈） ---
  const [viewport, setViewport] = useState({ width: 1024, height: 768 });
  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const adapted = useMemo(() => {
    if (!config) return null;
    const landscapeTablet = viewport.width >= 900 && viewport.width > viewport.height;
    const portrait = viewport.height > viewport.width;
    const usableWidth = Math.max(1, viewport.width - (landscapeTablet ? 32 : 16));
    const reservedHeight = landscapeTablet ? 22 : 100 + (portrait ? 48 : 0);
    const usableHeight = Math.max(1, viewport.height - reservedHeight);
    return adaptGridToScreen(config.rows, config.cols, usableWidth, 44, usableHeight);
  }, [config, viewport]);

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
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const [tip, setTip] = useState<Point | null>(null);
  const [resetCount, setResetCount] = useState(0);

  // --- 提示 ---
  const [hintPoints, setHintPoints] = useState<Point[] | null>(null);
  const [usedPartialHint, setUsedPartialHint] = useState(false);
  const [showFullSolution, setShowFullSolution] = useState(false);
  const [usedFullSolution, setUsedFullSolution] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);

  const geo = useMemo(
    () => (maze ? computeGeometry(maze.rows, maze.cols) : null),
    [maze]
  );
  // 调试钩子：自动化测试可读取当前迷宫
  useEffect(() => {
    if (!maze) return;
    const debugWindow = window as unknown as { __mazeDebug?: unknown };
    debugWindow.__mazeDebug = maze;
    return () => {
      delete debugWindow.__mazeDebug;
    };
  }, [maze]);
  const solutionSvg = useMemo(
    () => (maze && geo ? solutionToSvgPoints(maze.solution, geo) : []),
    [maze, geo]
  );

  const resetState = useCallback(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    setStatus("idle");
    setElapsedMs(0);
    setLiveElapsedMs(0);
    setHintPoints(null);
    setUsedPartialHint(false);
    setShowFullSolution(false);
    setUsedFullSolution(false);
    setNewAchievements([]);
    setTip(null);
    startedAtRef.current = null;
    savedRef.current = false;
  }, []);

  // 换图时重置
  useEffect(() => {
    resetState();
  }, [id, resetState]);

  useEffect(() => {
    if (
      !settings.timerVisible ||
      startedAtRef.current === null ||
      status === "idle" ||
      status === "completed"
    ) {
      return;
    }
    const updateTimer = () => {
      if (startedAtRef.current !== null) {
        setLiveElapsedMs(Date.now() - startedAtRef.current);
      }
    };
    updateTimer();
    const timer = window.setInterval(updateTimer, 100);
    return () => window.clearInterval(timer);
  }, [settings.timerVisible, status]);

  useEffect(
    () => () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    },
    []
  );

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
  const mazeIds = levelConfigs.map((item) => item.id);
  const nextConfig = levelConfigs[idxInLevel + 1];
  const nextLevelFirst: string | null =
    level < 5 ? (MAZE_CONFIGS.find((c) => c.level === ((level + 1) as MazeLevel))?.id ?? null) : null;
  const ready = progressHydrated && settingsHydrated;
  const levelUnlocked = ready && isLevelUnlocked(level, progress, settings);
  const mazeUnlocked =
    ready && isMazeUnlocked(idxInLevel, level, mazeIds, progress, settings);

  if (!ready) {
    return (
      <main
        className="flex min-h-dvh flex-col items-center justify-center gap-3"
        style={{ background: theme.pageBg }}
        aria-busy="true"
      >
        <span className="text-4xl" aria-hidden>{theme.startEmoji}</span>
        <p className="text-sm text-neutral-400">正在准备迷宫…</p>
      </main>
    );
  }

  if (!levelUnlocked || !mazeUnlocked) {
    return (
      <main
        className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: theme.pageBg }}
      >
        <span className="text-5xl" aria-hidden>🔒</span>
        <h1 className="text-xl font-bold">这张迷宫还没解锁</h1>
        <p className="max-w-xs text-sm leading-6 text-neutral-500">
          {levelUnlocked
            ? "先完成前一张迷宫，就可以继续挑战。"
            : "先完成上一级任意 10 张迷宫，就可以开启这个等级。"}
        </p>
        <button
          onClick={() => router.push(levelUnlocked ? `/level/${level}` : "/")}
          className="min-h-11 rounded-2xl bg-[#5B7A4E] px-6 font-semibold text-white active:scale-95"
        >
          {levelUnlocked ? "返回关卡地图" : "返回首页"}
        </button>
      </main>
    );
  }

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
    setLiveElapsedMs(info.elapsedMs);
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

  const handleDrawStart = () => {
    if (startedAtRef.current === null) {
      startedAtRef.current = Date.now();
      setLiveElapsedMs(0);
    }
    playStart(settings.sound);
  };

  const stars = computeStars(usedPartialHint, usedFullSolution);
  const showTimer = settings.timerVisible && status !== "idle";
  const displayedElapsedMs = status === "completed" ? elapsedMs : liveElapsedMs;
  const nextLevel = level < 5 ? ((level + 1) as MazeLevel) : null;
  const nextLevelUnlocked =
    nextLevel !== null && isLevelUnlocked(nextLevel, progress, settings);
  const nextLabel = nextConfig
    ? "下一关"
    : nextLevelFirst && nextLevelUnlocked
      ? `进入 Level ${nextLevel}`
      : "返回地图";
  const primaryReturnsToMap = !nextConfig && !(nextLevelFirst && nextLevelUnlocked);

  return (
    <main className="game-shell flex h-dvh flex-col overscroll-none" style={{ background: theme.pageBg }}>
      {/* 顶栏：极简（需求 #6） */}
      <header className="game-header flex items-center gap-2 px-3 py-2">
        <button
          onClick={withClick(() => router.push(`/level/${level}`))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-black/5 active:scale-95"
          aria-label="返回"
        >
          ←
        </button>
        <h1 className="game-title text-sm font-medium text-neutral-500">
          {theme.name} · {config.label}
        </h1>
        {showTimer && (
          <span className="ml-2 text-xs tabular-nums text-neutral-400">
            {(displayedElapsedMs / 1000).toFixed(1)}s
          </span>
        )}
        <div className="game-hint ml-auto">
          <HintMenu
            onPartialHint={handlePartialHint}
            onFullSolution={handleFullSolution}
            fullSolutionShown={showFullSolution || !settings.fullSolutionEnabled}
          />
        </div>
      </header>

      {/* 竖屏且宽度太小时：轻量横屏提示（需求 #47，可关闭） */}
      <div className="game-orientation">
        <OrientationHint />
      </div>

      {/* 迷宫 */}
      <section className="game-stage relative min-h-0 flex-1 px-2 pb-3">
        <MazeBoard
          key={`${config.id}-${adapted?.rows}x${adapted?.cols}-${resetCount}`}
          maze={maze}
          interactive
          hintPoints={hintPoints}
          showFullSolution={showFullSolution}
          onTipChange={setTip}
          onStatusChange={setStatus}
          onDrawStart={handleDrawStart}
          onComplete={handleComplete}
        />

        {status === "completed" && (
          <CompletionDialog
            stars={stars}
            showStars={settings.starsEnabled}
            elapsedMs={settings.timerVisible ? elapsedMs : undefined}
            nextLabel={nextLabel}
            newAchievements={newAchievements}
            onNext={withClick(() => {
              if (nextConfig) router.push(`/maze/${nextConfig.id}`);
              else if (nextLevelFirst && nextLevelUnlocked) router.push(`/maze/${nextLevelFirst}`);
              else router.push(`/level/${level}`);
            })}
            onReplay={withClick(replay)}
            onBack={
              primaryReturnsToMap
                ? undefined
                : withClick(() => router.push(`/level/${level}`))
            }
            challengeLabel={
              nextConfig && nextLevelFirst && nextLevelUnlocked
                ? `太简单了？试试 Level ${nextLevel}`
                : undefined
            }
            onChallenge={
              nextConfig && nextLevelFirst && nextLevelUnlocked
                ? withClick(() => router.push(`/maze/${nextLevelFirst}`))
                : undefined
            }
          />
        )}
      </section>

      {/* 底部提示文字（极简） */}
      {status !== "completed" && (
        <footer className="game-footer px-4 pb-3">
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
