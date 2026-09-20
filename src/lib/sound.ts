"use client";

/**
 * 音效系统（第六阶段）：Web Audio 合成，无外部音频资源、零网络加载。
 *
 * 设计原则（配合儿童体验）：
 * - 声音轻柔、短促、音高明亮，绝不刺耳
 * - AudioContext 惰性创建，首次用户手势时才 resume（浏览器自动播放策略）
 * - 所有播放入口都经过 enabled 开关（家长设置「声音」）
 * - 任何环境下出错都静默降级（无声不影响玩）
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOptions {
  freq: number;
  /** 相对开始时刻（秒） */
  at?: number;
  duration?: number;
  /** 0~1，默认很轻 */
  volume?: number;
  type?: OscillatorType;
}

/** 播放一个带指数衰减包络的音符 */
function tone(c: AudioContext, { freq, at = 0, duration = 0.15, volume = 0.12, type = "sine" }: ToneOptions) {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function play(enabled: boolean, fn: (c: AudioContext) => void) {
  if (!enabled) return;
  const c = getCtx();
  if (!c) return;
  try {
    fn(c);
  } catch {
    // 静默降级
  }
}

/** 按钮轻点：很短的木质敲击感 */
export function playClick(enabled: boolean) {
  play(enabled, (c) => tone(c, { freq: 660, duration: 0.07, volume: 0.06, type: "triangle" }));
}

/** 开始画线：轻快的一声「啵」 */
export function playStart(enabled: boolean) {
  play(enabled, (c) => {
    tone(c, { freq: 520, duration: 0.09, volume: 0.09, type: "sine" });
    tone(c, { freq: 780, at: 0.05, duration: 0.1, volume: 0.07, type: "sine" });
  });
}

/** 提示：两声轻柔的叮咚 */
export function playHint(enabled: boolean) {
  play(enabled, (c) => {
    tone(c, { freq: 880, duration: 0.16, volume: 0.08, type: "sine" });
    tone(c, { freq: 1174.7, at: 0.12, duration: 0.22, volume: 0.08, type: "sine" });
  });
}

/** 通关：上行琶音 + 高音闪烁，约 0.8 秒，欢快点但不吵闹 */
export function playComplete(enabled: boolean) {
  play(enabled, (c) => {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    notes.forEach((freq, i) =>
      tone(c, { freq, at: i * 0.09, duration: 0.22, volume: 0.11, type: "triangle" })
    );
    tone(c, { freq: 1568, at: 0.38, duration: 0.3, volume: 0.07, type: "sine" });
    tone(c, { freq: 2093, at: 0.5, duration: 0.35, volume: 0.05, type: "sine" });
  });
}

/** 新成就：在通关音之后的金属感小号角 */
export function playAchievement(enabled: boolean) {
  play(enabled, (c) => {
    tone(c, { freq: 987.77, at: 0.55, duration: 0.18, volume: 0.09, type: "square" });
    tone(c, { freq: 1318.5, at: 0.68, duration: 0.3, volume: 0.09, type: "square" });
  });
}
