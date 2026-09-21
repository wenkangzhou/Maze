"use client";

/**
 * Level 页面主体（需求 #5）：显示某一级全部 20 张迷宫。
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { MazeCard } from "@/components/ui/MazeCard";
import { AppLoading } from "@/components/ui/AppLoading";
import { getLevelConfigs } from "@/data/levels";
import { useAppSettings, usePlayerProgress } from "@/lib/storage/hooks";
import { isLevelUnlocked, isMazeUnlocked } from "@/lib/storage/progress";
import { LEVEL_THEMES } from "@/lib/maze/generator";
import { THEMES } from "@/lib/maze/themes";
import type { MazeLevel } from "@/lib/maze/types";

const LEVEL_NAMES: Record<MazeLevel, string> = {
  1: "草原", 2: "森林", 3: "沙漠", 4: "雪地", 5: "太空",
};

export function LevelClient() {
  const params = useParams();
  const level = Number(params.level) as MazeLevel;
  const { progress, hydrated: progressHydrated } = usePlayerProgress();
  const { settings, hydrated: settingsHydrated } = useAppSettings();

  if (!progressHydrated || !settingsHydrated) return <AppLoading />;

  if (!level || level < 1 || level > 5) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-neutral-400">没有这个等级</p>
      </main>
    );
  }

  const configs = getLevelConfigs(level);
  const theme = THEMES[LEVEL_THEMES[level]];
  const levelUnlocked = isLevelUnlocked(level, progress, settings);
  const mazeIds = configs.map((c) => c.id);
  const completed = configs.filter((c) => progress.mazes[c.id]?.completed).length;

  return (
    <main className="level-shell mx-auto min-h-dvh w-full max-w-md px-5 pb-8 pt-6" style={{ background: theme.pageBg }}>
      <header className="level-header mb-5 flex items-center gap-3">
        <Link
          href="/"
          className="level-back flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-black/5 active:scale-95"
          aria-label="返回首页"
        >
          ←
        </Link>
        <div className="level-heading">
          <h1 className="text-xl font-bold">
            Level {level} · {LEVEL_NAMES[level]}
          </h1>
          <p className="text-sm text-neutral-400">{completed} / {configs.length} 张完成</p>
        </div>
        <span className="level-emoji ml-auto text-3xl" aria-hidden>{theme.startEmoji}</span>
      </header>

      {!levelUnlocked ? (
        <div className="level-locked mt-16 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">🔒</span>
          <p className="text-neutral-500">完成上一级任意 10 张迷宫后解锁</p>
          <Link
            href={`/level/${level - 1}`}
            className="mt-2 min-h-11 rounded-2xl bg-[#5B7A4E] px-6 py-3 font-semibold text-white active:scale-95"
          >
            去 Level {level - 1} →
          </Link>
        </div>
      ) : (
        <div className="level-grid grid grid-cols-4 gap-3 sm:grid-cols-5">
          {configs.map((config, i) => (
            <MazeCard
              key={config.id}
              config={config}
              progress={progress.mazes[config.id]}
              locked={!isMazeUnlocked(i, level, mazeIds, progress, settings)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
