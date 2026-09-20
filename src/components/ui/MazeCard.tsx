"use client";

/**
 * MazeCard：Level 页面里的单张迷宫卡片（需求 #5）。
 * 显示编号、缩略图、星星；锁定显示 🔒。
 */

import Link from "next/link";
import { useMemo } from "react";
import { MiniMazePreview } from "@/components/maze/MiniMazePreview";
import { generateMaze } from "@/lib/maze/generator";
import type { MazeConfig } from "@/data/levels";
import type { MazeProgress } from "@/lib/storage/progress";

interface MazeCardProps {
  config: MazeConfig;
  progress?: MazeProgress;
  locked: boolean;
}

export function MazeCard({ config, progress, locked }: MazeCardProps) {
  const maze = useMemo(
    () =>
      generateMaze({
        rows: config.rows,
        cols: config.cols,
        seed: config.seed,
        level: config.level,
        id: config.id,
      }),
    [config]
  );

  const stars = progress?.stars ?? 0;
  const done = progress?.completed === true;

  const inner = (
    <div
      className={`maze-card flex h-full flex-col items-center gap-1 rounded-2xl border-2 p-2 transition active:scale-95 ${
        locked
          ? "border-black/5 bg-black/[0.03] opacity-50"
          : done
            ? "border-transparent bg-white shadow-sm"
            : "border-black/10 bg-white"
      }`}
    >
      <div className="relative">
        {locked ? (
          <div
            className="flex items-center justify-center text-2xl text-neutral-300"
            style={{ width: 84, height: 59 }}
          >
            🔒
          </div>
        ) : (
          <MiniMazePreview maze={maze} size={84} />
        )}
      </div>
      <p className="text-xs font-semibold tabular-nums">{config.label}</p>
      <p className="text-[10px] leading-none text-amber-400" aria-label={`${stars} 星`}>
        {"★".repeat(stars)}
        <span className="text-neutral-300">{"★".repeat(3 - stars)}</span>
      </p>
    </div>
  );

  if (locked) return <div aria-disabled>{inner}</div>;
  return <Link href={`/maze/${config.id}`} className="block">{inner}</Link>;
}
