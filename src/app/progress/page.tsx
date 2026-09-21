"use client";

/**
 * 我的迷宫（需求 #40）：总进度 + 各等级完成度 + 徽章。
 */

import Link from "next/link";
import { MAZE_CONFIGS } from "@/data/levels";
import { AppLoading } from "@/components/ui/AppLoading";
import { usePlayerProgress } from "@/lib/storage/hooks";
import { ACHIEVEMENTS } from "@/lib/storage/progress";
import type { MazeLevel } from "@/lib/maze/types";

const LEVEL_NAMES: Record<MazeLevel, string> = {
  1: "草原", 2: "森林", 3: "沙漠", 4: "雪地", 5: "太空",
};

export default function ProgressPage() {
  const { progress, hydrated } = usePlayerProgress();

  if (!hydrated) return <AppLoading />;

  const completedInLevel = (level: MazeLevel) =>
    Object.keys(progress.mazes).filter(
      (id) => progress.mazes[id].completed && id.startsWith(`L${level}-`)
    ).length;

  return (
    <main className="progress-shell mx-auto min-h-dvh w-full max-w-md px-5 pb-8 pt-6">
      <header className="page-header mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-black/5 active:scale-95"
          aria-label="返回首页"
        >
          ←
        </Link>
        <h1 className="text-xl font-bold">我的迷宫</h1>
      </header>

      <div className="progress-layout">
        <section className="progress-summary">
          {/* 总览 */}
          <div className="flex items-center justify-around rounded-3xl bg-white p-6 shadow-sm">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-[#5B7A4E]">
                {progress.totalCompleted}
              </p>
              <p className="mt-1 text-xs text-neutral-400">/ {MAZE_CONFIGS.length} 个迷宫</p>
            </div>
            <div className="h-10 w-px bg-black/5" />
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums text-amber-400">
                {progress.totalStars}
              </p>
              <p className="mt-1 text-xs text-neutral-400">⭐ 星星</p>
            </div>
          </div>

          {/* 各等级 */}
          <div className="mt-6 space-y-2">
            {([1, 2, 3, 4, 5] as MazeLevel[]).map((level) => {
              const done = completedInLevel(level);
              return (
                <Link
                  key={level}
                  href={`/level/${level}`}
                  className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm active:scale-[0.98]"
                >
                  <span className="text-sm font-medium text-neutral-600">
                    Level {level} · {LEVEL_NAMES[level]}
                  </span>
                  <span className="ml-auto text-sm tabular-nums text-neutral-400">
                    {done} / 20
                  </span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-[#5B7A4E]"
                      style={{ width: `${(done / 20) * 100}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 徽章 */}
        <section className="progress-achievements">
          <h2 className="progress-achievements-title mb-3 mt-8 text-xs font-semibold tracking-wider text-neutral-400">
            徽章
          </h2>
          <div className="progress-badges grid grid-cols-2 gap-2">
            {Object.entries(ACHIEVEMENTS).map(([id, name]) => {
              const earned = progress.achievements.includes(id);
              return (
                <div
                  key={id}
                  className={`rounded-2xl border px-3 py-3 text-center ${
                    earned
                      ? "border-amber-200 bg-amber-50"
                      : "border-black/5 bg-black/[0.02] opacity-50"
                  }`}
                >
                  <span className="text-2xl">{earned ? "🏅" : "🔒"}</span>
                  <p className="mt-1 text-xs font-medium">{name}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
