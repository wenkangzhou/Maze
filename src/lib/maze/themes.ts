/**
 * 主题定义（需求 #8 / #56）：只影响视觉，不改变迷宫规则。
 * 首版起点 / 终点用 emoji 占位，后续替换为统一 SVG 插画。
 */

import type { MazeTheme } from "./types";

export interface ThemeSpec {
  name: string;
  /** 页面 / 迷宫外背景 */
  pageBg: string;
  /** 迷宫走廊底色 */
  boardBg: string;
  /** 墙壁颜色 */
  wall: string;
  startEmoji: string;
  endEmoji: string;
  /** 玩家轨迹颜色（第二轮使用） */
  pathStroke: string;
  /** 提示 / 答案路线颜色 */
  hintStroke: string;
}

export const THEMES: Record<MazeTheme, ThemeSpec> = {
  grass: {
    name: "草原",
    pageBg: "#F4F7EE",
    boardBg: "#FFFFFF",
    wall: "#5B7A4E",
    startEmoji: "🐰",
    endEmoji: "🥕",
    pathStroke: "#E8833A",
    hintStroke: "#9CC5A1",
  },
  forest: {
    name: "森林",
    pageBg: "#EFF4EC",
    boardBg: "#FFFFFF",
    wall: "#3E5C41",
    startEmoji: "🐿️",
    endEmoji: "🌰",
    pathStroke: "#E8B33A",
    hintStroke: "#8FB996",
  },
  desert: {
    name: "沙漠",
    pageBg: "#FAF4E8",
    boardBg: "#FFFFFF",
    wall: "#B07D4A",
    startEmoji: "🚙",
    endEmoji: "⛺",
    pathStroke: "#4A90B0",
    hintStroke: "#D9B98F",
  },
  snow: {
    name: "雪地",
    pageBg: "#F0F4F8",
    boardBg: "#FFFFFF",
    wall: "#5A7391",
    startEmoji: "🐧",
    endEmoji: "🏠",
    pathStroke: "#E86A6A",
    hintStroke: "#A8BFd8",
  },
  space: {
    name: "太空",
    pageBg: "#F2F0F7",
    boardBg: "#FFFFFF",
    wall: "#5C5470",
    startEmoji: "👨‍🚀",
    endEmoji: "🚀",
    pathStroke: "#8A7AE8",
    hintStroke: "#B4ABD9",
  },
};
