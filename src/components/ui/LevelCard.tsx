"use client";

/**
 * LevelCard：首页的大关卡卡片（需求 #4）。
 * 显示等级名、主题 emoji、完成进度；未解锁显示 🔒。
 */

import Link from "next/link";
import { THEMES } from "@/lib/maze/themes";
import { LEVEL_THEMES } from "@/lib/maze/generator";
import type { MazeLevel } from "@/lib/maze/types";

interface LevelCardProps {
  level: MazeLevel;
  completed: number;
  total: number;
  locked: boolean;
}

const LEVEL_NAMES: Record<MazeLevel, string> = {
  1: "草原",
  2: "森林",
  3: "沙漠",
  4: "雪地",
  5: "太空",
};

export function LevelCard({ level, completed, total, locked }: LevelCardProps) {
  const theme = THEMES[LEVEL_THEMES[level]];
  const name = LEVEL_NAMES[level];

  const inner = (
    <div
      className={`flex min-h-28 w-full items-center gap-4 rounded-3xl border-2 px-5 py-4 text-left transition active:scale-[0.98] ${
        locked
          ? "border-black/5 bg-black/[0.03] opacity-60"
          : "border-black/10 bg-white shadow-sm"
      }`}
    >
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl"
        style={{ background: theme.pageBg }}
        aria-hidden
      >
        {locked ? "🔒" : theme.startEmoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold">
          Level {level} · {name}
        </p>
        <p className="mt-0.5 text-sm text-neutral-400">
          {locked ? "完成上一级 10 张解锁" : `${completed} / ${total} 张`}
        </p>
        {!locked && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${total > 0 ? (completed / total) * 100 : 0}%`,
                background: theme.wall,
              }}
            />
          </div>
        )}
      </div>
      {!locked && (
        <span className="text-2xl text-neutral-300" aria-hidden>›</span>
      )}
    </div>
  );

  if (locked) return <div aria-disabled>{inner}</div>;
  return <Link href={`/level/${level}`} className="block">{inner}</Link>;
}
