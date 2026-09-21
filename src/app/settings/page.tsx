"use client";

/**
 * 家长设置（需求 #37-#38）：
 * - 首页 ⚙️ 长按 2 秒进入（避免孩子误触）
 * - 声音 / 计时 / 星星 / 完整答案 / 全部解锁 / 清空进度（二次确认）
 */

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { AppLoading } from "@/components/ui/AppLoading";
import { useAppSettings, usePlayerProgress } from "@/lib/storage/hooks";
import { resetProgress } from "@/lib/storage/progress";

interface SettingsRowProps {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SettingsRow({ label, desc, checked, onChange }: SettingsRowProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="settings-row flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-left shadow-sm transition active:scale-[0.99]"
    >
      <span>
        <span className="block font-medium">{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-neutral-400">{desc}</span>}
      </span>
      <span
        aria-hidden
        className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#5B7A4E]" : "bg-black/10"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

interface ClearProgressDialogProps {
  onCancel: () => void;
  onConfirm: () => void;
}

function ClearProgressDialog({ onCancel, onConfirm }: ClearProgressDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  const keepFocusInDialog = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = dialogRef.current?.querySelectorAll<HTMLElement>("button");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-5">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={keepFocusInDialog}
        className="dialog-pop w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="text-3xl" aria-hidden>🗑️</div>
        <h2 id={titleId} className="mt-3 text-xl font-bold">清空所有进度？</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          已完成的迷宫、星星和徽章都会被删除，而且无法恢复。
        </p>
        <div className="mt-6 flex gap-3">
          <button
            autoFocus
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-2xl border border-black/10 bg-white px-4 font-medium active:scale-95"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-2xl bg-red-600 px-4 font-semibold text-white active:scale-95"
          >
            确认清空
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { settings, update, hydrated } = useAppSettings();
  const { reload } = usePlayerProgress();
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const clearFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClear = () => {
    resetProgress();
    reload();
    setClearDialogOpen(false);
    setCleared(true);
    if (clearFeedbackTimerRef.current) clearTimeout(clearFeedbackTimerRef.current);
    clearFeedbackTimerRef.current = setTimeout(() => setCleared(false), 2000);
  };

  useEffect(
    () => () => {
      if (clearFeedbackTimerRef.current) clearTimeout(clearFeedbackTimerRef.current);
    },
    []
  );

  if (!hydrated) return <AppLoading label="正在读取家长设置…" />;

  return (
    <main className="settings-shell mx-auto min-h-dvh w-full max-w-md px-5 pb-8 pt-6">
      <header className="page-header mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-400 hover:bg-black/5 active:scale-95"
          aria-label="返回首页"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">家长设置</h1>
      </header>

      <div className="settings-list flex flex-col gap-3">
        <SettingsRow
          label="声音"
          desc="通关和提示音效"
          checked={settings.sound}
          onChange={(v) => update({ sound: v })}
        />
        <SettingsRow
          label="显示计时"
          desc="游戏页显示用时（默认不显示大计时器）"
          checked={settings.timerVisible}
          onChange={(v) => update({ timerVisible: v })}
        />
        <SettingsRow
          label="显示星星"
          desc="通关后显示星级评价"
          checked={settings.starsEnabled}
          onChange={(v) => update({ starsEnabled: v })}
        />
        <SettingsRow
          label="允许完整答案"
          desc="「看看怎么走」显示整条正确路线"
          checked={settings.fullSolutionEnabled}
          onChange={(v) => update({ fullSolutionEnabled: v })}
        />
        <SettingsRow
          label="全部解锁"
          desc="开放所有等级和所有迷宫"
          checked={settings.unlockAll}
          onChange={(v) => update({ unlockAll: v })}
        />
      </div>

      <div className="settings-danger mt-8">
        <h2 className="mb-2 text-xs font-semibold tracking-wider text-neutral-400">
          危险操作
        </h2>
        <button
          onClick={() => setClearDialogOpen(true)}
          className="min-h-12 w-full rounded-2xl border border-black/10 bg-white font-medium text-neutral-600 transition active:scale-[0.98]"
        >
          {cleared ? "✓ 已清空" : "清空进度"}
        </button>
      </div>

      <p className="settings-note mt-8 text-center text-xs text-neutral-300">
        儿童迷宫 · 所有数据仅保存在本设备浏览器
      </p>

      {clearDialogOpen && (
        <ClearProgressDialog
          onCancel={() => setClearDialogOpen(false)}
          onConfirm={handleClear}
        />
      )}
    </main>
  );
}
