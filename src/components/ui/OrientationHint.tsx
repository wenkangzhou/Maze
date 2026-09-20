"use client";

/**
 * 横屏轻提示（需求 #47）：优先横屏体验，但不禁止竖屏。
 * 竖屏且可用宽度太小（手机竖持）时显示一次轻量提示，可关闭并记住。
 * iPad 竖屏（768+）宽度足够，不提示。
 */

import { useEffect, useState } from "react";

const DISMISS_KEY = "maze-kids-orientation-hint-dismissed";
const MIN_COMFORTABLE_WIDTH = 720;

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
      setShow(!dismissed && portrait && window.innerWidth < MIN_COMFORTABLE_WIDTH);
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
    <div className="slide-fade-in mx-3 mb-1 flex items-center justify-between gap-2 rounded-2xl bg-white/85 px-4 py-2 text-xs text-neutral-500 shadow-sm backdrop-blur">
      <span>📱 横过来会更好玩</span>
      <button
        onClick={dismiss}
        aria-label="关闭提示"
        className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 active:bg-black/5"
      >
        ✕
      </button>
    </div>
  );
}
