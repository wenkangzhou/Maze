"use client";

/**
 * 横屏轻提示（需求 #47）：优先横屏体验，但不禁止竖屏。
 * 竖屏时显示一次轻量提示，可关闭并记住。
 */

import { useEffect, useState } from "react";

const DISMISS_KEY = "maze-kids-orientation-hint-dismissed";
export function OrientationHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        // 无痕模式等：每次都会提示，可接受
      }
      const portrait = window.innerHeight > window.innerWidth;
      setShow(!dismissed && portrait);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div className="slide-fade-in mx-3 mb-1 flex items-center justify-between gap-2 rounded-2xl bg-white/85 py-1 pl-4 pr-1 text-xs text-neutral-500 shadow-sm backdrop-blur">
      <span>📱 横过来会更好玩</span>
      <button
        onClick={dismiss}
        aria-label="关闭提示"
        className="flex h-11 w-11 items-center justify-center rounded-full text-neutral-400 active:bg-black/5"
      >
        ✕
      </button>
    </div>
  );
}
