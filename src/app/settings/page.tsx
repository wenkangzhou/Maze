"use client";

/**
 * 家长设置（需求 #37-#38）：
 * - 首页 ⚙️ 长按 2 秒进入（避免孩子误触）
 * - 声音 / 计时 / 星星 / 完整答案 / 全部解锁 / 清空进度（二次确认）
 */

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppSettings, usePlayerProgress } from "@/lib/storage/hooks";
import { resetProgress } from "@/lib/storage/progress";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, update } = useAppSettings();
  const { reload } = usePlayerProgress();
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    resetProgress();
    reload();
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  const Row = ({
    label, desc, checked, onChange,
  }: {
    label: string;
    desc?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="font-medium">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-neutral-400">{desc}</p>}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#5B7A4E]" : "bg-black/10"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </label>
  );

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 pb-8 pt-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-black/5 active:scale-95"
          aria-label="返回首页"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">家长设置</h1>
      </header>

      <div className="space-y-3">
        <Row
          label="声音"
          desc="通关和提示音效"
          checked={settings.sound}
          onChange={(v) => update({ sound: v })}
        />
        <Row
          label="显示计时"
          desc="游戏页显示用时（默认不显示大计时器）"
          checked={settings.timerVisible}
          onChange={(v) => update({ timerVisible: v })}
        />
        <Row
          label="显示星星"
          desc="通关后显示星级评价"
          checked={settings.starsEnabled}
          onChange={(v) => update({ starsEnabled: v })}
        />
        <Row
          label="允许完整答案"
          desc="「看看怎么走」显示整条正确路线"
          checked={settings.fullSolutionEnabled}
          onChange={(v) => update({ fullSolutionEnabled: v })}
        />
        <Row
          label="全部解锁"
          desc="开放所有等级和所有迷宫"
          checked={settings.unlockAll}
          onChange={(v) => update({ unlockAll: v })}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-neutral-400">
          危险操作
        </h2>
        <button
          onClick={handleClear}
          className={`min-h-12 w-full rounded-2xl border font-medium transition active:scale-[0.98] ${
            confirmClear
              ? "border-red-300 bg-red-50 text-red-600"
              : "border-black/10 bg-white text-neutral-600"
          }`}
        >
          {cleared ? "✓ 已清空" : confirmClear ? "再点一次确认清空所有进度" : "清空进度"}
        </button>
      </div>

      <p className="mt-8 text-center text-xs text-neutral-300">
        儿童迷宫 · 所有数据仅保存在本设备浏览器
      </p>
    </main>
  );
}
