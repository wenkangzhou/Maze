"use client";

/**
 * CompletionDialog：通关弹窗（需求 #27）。
 * 「下一关」是主要按钮；再玩一次 / 返回地图为次要操作。
 * 显示星星和用时（用时仅统计展示，不影响星级）。
 * 第六阶段：弹窗 pop-in、星星逐颗弹出、新成就徽章展示。
 */

import { ACHIEVEMENTS } from "@/lib/storage/progress";

interface CompletionDialogProps {
  stars: 1 | 2 | 3;
  elapsedMs?: number;
  /** 主按钮文案，Playground 场景是「换一张」 */
  nextLabel?: string;
  /** 本次新解锁的成就 id（第六阶段：成就外显） */
  newAchievements?: string[];
  onNext: () => void;
  onReplay: () => void;
  onBack: () => void;
}

/** 星星逐颗弹出（大号的通关反馈，孩子最直接的奖励） */
function AnimatedStars({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-2 text-4xl" role="img" aria-label={`获得 ${stars} 颗星`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="star-pop inline-block"
          style={{ animationDelay: `${0.15 + i * 0.18}s` }}
        >
          {i <= stars ? "⭐" : "☆"}
        </span>
      ))}
    </div>
  );
}

export function CompletionDialog({
  stars,
  elapsedMs,
  nextLabel = "下一关",
  newAchievements = [],
  onNext,
  onReplay,
  onBack,
}: CompletionDialogProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center">
      <div className="dialog-pop mx-4 flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-white/95 px-8 py-8 shadow-lg backdrop-blur">
        <div className="text-5xl" aria-hidden>🎉</div>
        <p className="text-2xl font-bold">找到出口啦！</p>
        <AnimatedStars stars={stars} />
        {elapsedMs !== undefined && (
          <p className="-mt-2 text-sm text-neutral-400">
            用时 {(elapsedMs / 1000).toFixed(1)} 秒
          </p>
        )}
        {newAchievements.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            {newAchievements.map((id) => (
              <p
                key={id}
                className="achievement-pop rounded-xl bg-amber-50 px-3 py-1.5 text-center text-sm font-medium text-amber-700"
              >
                🏅 新成就：{ACHIEVEMENTS[id] ?? id}
              </p>
            ))}
          </div>
        )}
        <button
          onClick={onNext}
          className="min-h-11 w-full rounded-2xl bg-[#5B7A4E] px-6 text-lg font-semibold text-white active:scale-95"
        >
          {nextLabel} →
        </button>
        <div className="flex w-full gap-3">
          <button
            onClick={onReplay}
            className="min-h-11 flex-1 rounded-2xl border border-black/10 bg-white px-4 font-medium active:scale-95"
          >
            再玩一次
          </button>
          <button
            onClick={onBack}
            className="min-h-11 flex-1 rounded-2xl border border-black/10 bg-white px-4 font-medium text-neutral-500 active:scale-95"
          >
            返回地图
          </button>
        </div>
      </div>
    </div>
  );
}
