"use client";

/**
 * 首页（需求 #4）：Logo + 5 个大关卡卡 + 我的迷宫 + 家长设置。
 * 家长设置入口不醒目（需求 #37）：⚙️ 长按 2 秒进入。
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LevelCard } from "@/components/ui/LevelCard";
import { AppLoading } from "@/components/ui/AppLoading";
import { MAZE_CONFIGS, MAZES_PER_LEVEL } from "@/data/levels";
import { useAppSettings, usePlayerProgress } from "@/lib/storage/hooks";
import { isLevelUnlocked } from "@/lib/storage/progress";
import type { MazeLevel } from "@/lib/maze/types";

export default function HomePage() {
  const { progress, hydrated: progressHydrated } = usePlayerProgress();
  const { settings, hydrated: settingsHydrated } = useAppSettings();
  const router = useRouter();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isPressingSettings, setIsPressingSettings] = useState(false);

  const completedInLevel = (level: MazeLevel) =>
    Object.keys(progress.mazes).filter(
      (id) => progress.mazes[id].completed && id.startsWith(`L${level}-`)
    ).length;

  // 家长设置：长按 2 秒（需求 #37）
  const startPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    setIsPressingSettings(true);
    pressTimer.current = setTimeout(() => {
      setIsPressingSettings(false);
      pressTimer.current = null;
      router.push("/settings");
    }, 2000);
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
    setIsPressingSettings(false);
  };

  useEffect(
    () => () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    },
    []
  );

  if (!progressHydrated || !settingsHydrated) return <AppLoading />;

  return (
    <main className="home-shell mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-10">
      {/* Logo */}
      <div className="home-hero mb-8 text-center">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={80}
          height={80}
          priority
          className="home-logo mx-auto"
          aria-hidden
        />
        <h1 className="mt-2 text-3xl font-bold tracking-wide">儿童迷宫</h1>
        <p className="mt-1 text-sm text-neutral-400">
          {progress.totalCompleted} / {MAZE_CONFIGS.length} 张 · {progress.totalStars} ⭐
        </p>
      </div>

      {/* 关卡 */}
      <div className="home-levels flex flex-col gap-3">
        {([1, 2, 3, 4, 5] as MazeLevel[]).map((level) => (
          <LevelCard
            key={level}
            level={level}
            completed={completedInLevel(level)}
            total={MAZES_PER_LEVEL}
            locked={!isLevelUnlocked(level, progress, settings)}
          />
        ))}
      </div>

      {/* 底部入口 */}
      <div className="home-actions mt-8 flex items-center justify-between">
        <Link
          href="/progress"
          className="flex min-h-11 items-center gap-1 rounded-2xl px-4 text-sm font-medium text-neutral-500 hover:bg-black/5 active:scale-95"
        >
          🏅 我的迷宫
        </Link>
        <div className="relative">
          {isPressingSettings && (
            <span
              role="status"
              className="absolute bottom-full right-0 mb-2 whitespace-nowrap rounded-full bg-[#3D3730] px-3 py-1.5 text-xs text-white shadow-sm"
            >
              继续按住…
            </span>
          )}
          <button
            onPointerDown={startPress}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                router.push("/settings");
              }
            }}
            className="settings-entry relative flex h-11 w-11 select-none items-center justify-center overflow-hidden rounded-full text-lg text-neutral-300 transition hover:bg-black/5"
            aria-label="家长设置（触屏长按两秒，键盘按回车进入）"
            title="长按 2 秒进入家长设置"
          >
            {isPressingSettings && <span className="settings-hold-fill" aria-hidden />}
            <span className="relative">⚙️</span>
          </button>
        </div>
      </div>
    </main>
  );
}
