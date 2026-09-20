/**
 * 屏幕坐标 -> SVG 逻辑坐标（需求 #17）。
 *
 * 第二轮手指划线系统的入口函数，第一轮 Playground
 * 已用它做 pointer 坐标调试显示。
 */

import type { Point } from "./types";

export function screenPointToSvgPoint(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): Point {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}
