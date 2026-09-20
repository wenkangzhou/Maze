"use client";

/**
 * HintMenu：右上角 💡 提示按钮（需求 #29-#31）。
 *
 * - 按钮不醒目，避免干扰迷宫主角地位
 * - 点击展开：「帮我一点点」（局部提示）/「看看怎么走」（完整答案）
 * - 完整答案需要二次确认：「要看看完整路线吗？再想想 / 看看路线」
 */

import { useEffect, useRef, useState } from "react";

type MenuState = "closed" | "open" | "confirm-full";

interface HintMenuProps {
  onPartialHint: () => void;
  onFullSolution: () => void;
  /** 已展示完整答案后禁用 */
  fullSolutionShown?: boolean;
}

export function HintMenu({ onPartialHint, onFullSolution, fullSolutionShown }: HintMenuProps) {
  const [state, setState] = useState<MenuState>("closed");
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部收起
  useEffect(() => {
    if (state === "closed") return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setState("closed");
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [state]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setState((s) => (s === "closed" ? "open" : "closed"))}
        className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-400 transition hover:bg-black/5 active:scale-95"
        aria-label="提示"
      >
        💡
      </button>

      {state === "open" && (
        <div className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-lg">
          <button
            onClick={() => {
              onPartialHint();
              setState("closed");
            }}
            className="flex min-h-11 w-full items-center gap-2 px-4 py-3 text-left text-sm active:bg-black/5"
          >
            ✨ 帮我一点点
          </button>
          {!fullSolutionShown && (
            <button
              onClick={() => setState("confirm-full")}
              className="flex min-h-11 w-full items-center gap-2 border-t border-black/5 px-4 py-3 text-left text-sm text-neutral-500 active:bg-black/5"
            >
              👀 看看怎么走
            </button>
          )}
        </div>
      )}

      {state === "confirm-full" && (
        <div className="absolute right-0 top-12 z-20 w-56 rounded-2xl border border-black/5 bg-white p-4 shadow-lg">
          <p className="text-sm font-medium">要看看完整路线吗？</p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setState("closed")}
              className="min-h-11 flex-1 rounded-xl border border-black/10 text-sm font-medium active:scale-95"
            >
              再想想
            </button>
            <button
              onClick={() => {
                onFullSolution();
                setState("closed");
              }}
              className="min-h-11 flex-1 rounded-xl bg-[#5B7A4E] text-sm font-medium text-white active:scale-95"
            >
              看看路线
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
