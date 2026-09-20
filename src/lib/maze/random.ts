/**
 * Seeded Random：相同 seed 必须产生完全相同的随机序列。
 *
 * 实现：FNV-1a 字符串哈希 -> mulberry32 PRNG。
 * 均为确定性算法，不依赖 Math.random / Date。
 */

/** FNV-1a 32bit 字符串哈希 */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // h *= 16777619（用位移避免浮点精度问题）
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export type Rng = () => number;

/** mulberry32：小巧、确定性、分布足够好的 PRNG */
export function createRng(seed: string): Rng {
  let a = hashSeed(seed);
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** [min, max] 闭区间整数 */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** 原地 Fisher-Yates 洗牌（确定性） */
export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 从数组中确定性地选一个元素 */
export function pick<T>(rng: Rng, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
