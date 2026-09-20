/**
 * Maze Generator：Recursive Backtracking（迭代栈实现）。
 *
 * 特性：
 * - 完全由 seed 驱动，相同 seed 生成相同迷宫（需求 #9 / #10）
 * - 生成「完美迷宫」（任意两点间恰好一条路径），保证无孤立区域
 * - 起点 / 终点用 BFS 直径启发式选取：保证正确路线足够长、
 *   且二者不会紧邻（需求 #43）
 * - 与 UI 完全解耦（需求 #42），未来固定迷宫 / 每日迷宫 / 打印迷宫
 *   都复用同一个 generateMaze()
 */

import { createRng, shuffle, type Rng } from "./random";
import { bfsDistanceField, farthestCell, solveMaze } from "./solver";
import { evaluateMazeQuality } from "./difficulty";
import type { CellPos, GenerateMazeOptions, Maze, MazeAlgorithm, MazeCell, MazeLevel, MazeTheme } from "./types";

export const LEVEL_THEMES: Record<MazeLevel, MazeTheme> = {
  1: "grass",
  2: "forest",
  3: "desert",
  4: "snow",
  5: "space",
};

function createEmptyCells(rows: number, cols: number): MazeCell[][] {
  const cells: MazeCell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: MazeCell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ row: r, col: c, top: true, right: true, bottom: true, left: true });
    }
    cells.push(row);
  }
  return cells;
}

/** 打通 a、b 两个相邻 cell 之间的墙 */
function carveBetween(cells: MazeCell[][], a: CellPos, b: CellPos): void {
  const dr = b.row - a.row;
  const dc = b.col - a.col;
  const ca = cells[a.row][a.col];
  const cb = cells[b.row][b.col];
  if (dr === -1) { ca.top = false; cb.bottom = false; }
  else if (dr === 1) { ca.bottom = false; cb.top = false; }
  else if (dc === -1) { ca.left = false; cb.right = false; }
  else if (dc === 1) { ca.right = false; cb.left = false; }
}

/** Recursive Backtracking 挖墙：长走廊、岔路少 */
function carveRecursiveBacktracking(cells: MazeCell[][], rows: number, cols: number, rng: Rng): void {
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const start: CellPos = { row: Math.floor(rng() * rows), col: Math.floor(rng() * cols) };
  const stack: CellPos[] = [start];
  visited[start.row][start.col] = true;

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const candidates: CellPos[] = [];
    const dirs = [
      { row: cur.row - 1, col: cur.col },
      { row: cur.row + 1, col: cur.col },
      { row: cur.row, col: cur.col - 1 },
      { row: cur.row, col: cur.col + 1 },
    ];
    for (const n of dirs) {
      if (n.row >= 0 && n.row < rows && n.col >= 0 && n.col < cols && !visited[n.row][n.col]) {
        candidates.push(n);
      }
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    shuffle(rng, candidates);
    const next = candidates[0];
    carveBetween(cells, cur, next);
    visited[next.row][next.col] = true;
    stack.push(next);
  }
}

/** Randomized Prim：分支从种子向外生长，形态比 RB 更蓬松 */
function carvePrim(cells: MazeCell[][], rows: number, cols: number, rng: Rng): void {
  const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const start: CellPos = { row: Math.floor(rng() * rows), col: Math.floor(rng() * cols) };
  visited[start.row][start.col] = true;
  // frontier: {cell 待打通, from 已访问的邻居}
  const frontier: { cell: CellPos; from: CellPos }[] = [];
  const push = (cell: CellPos, from: CellPos) => frontier.push({ cell, from });
  push({ row: start.row - 1, col: start.col }, start);
  push({ row: start.row + 1, col: start.col }, start);
  push({ row: start.row, col: start.col - 1 }, start);
  push({ row: start.row, col: start.col + 1 }, start);

  while (frontier.length > 0) {
    const idx = Math.floor(rng() * frontier.length);
    const { cell, from } = frontier.splice(idx, 1)[0];
    if (cell.row < 0 || cell.row >= rows || cell.col < 0 || cell.col >= cols) continue;
    if (visited[cell.row][cell.col]) continue;
    carveBetween(cells, from, cell);
    visited[cell.row][cell.col] = true;
    push({ row: cell.row - 1, col: cell.col }, cell);
    push({ row: cell.row + 1, col: cell.col }, cell);
    push({ row: cell.row, col: cell.col - 1 }, cell);
    push({ row: cell.row, col: cell.col + 1 }, cell);
  }
}

/**
 * Wilson 算法（loop-erased random walk）：生成均匀生成树。
 * 特点：岔路密集、死路短而多——几乎每个路口都需要真正做选择，
 * 解决「大迷宫只是路远、岔路太少」的问题。
 */
function carveWilson(cells: MazeCell[][], rows: number, cols: number, rng: Rng): void {
  const inTree: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
  const root: CellPos = { row: Math.floor(rng() * rows), col: Math.floor(rng() * cols) };
  inTree[root.row][root.col] = true;
  let remaining = rows * cols - 1;

  const key = (r: number, c: number) => r * cols + c;
  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // 固定遍历顺序（确定性），找到第一个未入树的 cell 作为游走起点
  for (let r0 = 0; r0 < rows && remaining > 0; r0++) {
    for (let c0 = 0; c0 < cols && remaining > 0; c0++) {
      if (inTree[r0][c0]) continue;

      // 随机游走，记录路径（cell 序列）；每访问一个已在本路径上的 cell 就抹去环
      const path: CellPos[] = [{ row: r0, col: c0 }];
      const indexInPath = new Map<number, number>([[key(r0, c0), 0]]);
      let cur: CellPos = { row: r0, col: c0 };

      while (!inTree[cur.row][cur.col]) {
        const d = dirs[Math.floor(rng() * dirs.length)];
        const next: CellPos = { row: cur.row + d[0], col: cur.col + d[1] };
        if (next.row < 0 || next.row >= rows || next.col < 0 || next.col >= cols) continue;
        const k = key(next.row, next.col);
        const seen = indexInPath.get(k);
        if (seen !== undefined) {
          // 抹去环：截断到首次访问该 cell 的位置
          for (let i = path.length - 1; i > seen; i--) {
            indexInPath.delete(key(path[i].row, path[i].col));
          }
          path.length = seen + 1;
        } else {
          indexInPath.set(k, path.length);
          path.push(next);
        }
        cur = next;
      }

      // 把无环路径并入树
      for (let i = 0; i < path.length; i++) {
        const cell = path[i];
        if (!inTree[cell.row][cell.col]) {
          inTree[cell.row][cell.col] = true;
          remaining--;
        }
        if (i + 1 < path.length) {
          carveBetween(cells, cell, path[i + 1]);
        }
      }
      // 路径末端连到树：path 最后一个元素与 cur（在树中）相邻
      if (path.length > 0) {
        const lastCell = path[path.length - 1];
        if (lastCell.row !== cur.row || lastCell.col !== cur.col) {
          carveBetween(cells, lastCell, cur);
        }
      }
    }
  }
}

/** 按等级选择默认算法：低等级走廊长、好跟随；高等级岔路密、选择多 */
export function defaultAlgorithmForLevel(level: MazeLevel): MazeAlgorithm {
  if (level <= 2) return "recursive-backtracking";
  if (level <= 4) return "prim";
  return "wilson";
}

/** 找到所有死路 cell（度数=1，排除起点终点） */
function findDeadEnds(cells: MazeCell[][], rows: number, cols: number, exclude: Set<string>): CellPos[] {
  const result: CellPos[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r][c];
      const deg = (cell.top ? 0 : 1) + (cell.right ? 0 : 1) + (cell.bottom ? 0 : 1) + (cell.left ? 0 : 1);
      if (deg === 1 && !exclude.has(`${r},${c}`)) {
        result.push({ row: r, col: c });
      }
    }
  }
  return result;
}

/**
 * 贪起点终点：Level 5 选斜对角，Level 4 选最远直径。
 * 对角线让路线必须横贯全图，比直径更有「跋涉感」。
 */
function pickStartEndGreedy(
  cells: MazeCell[][],
  rows: number,
  cols: number,
  rng: Rng,
  level: MazeLevel
): { start: CellPos; end: CellPos } {
  const graph = { rows, cols, cells };
  const randomCell: CellPos = {
    row: Math.floor(rng() * rows),
    col: Math.floor(rng() * cols),
  };

  // Level 5：沿内圈（距边缘 1 格）采样多个候选起点，
  // 要求起终点行距、列距都超过半张图（强制斜跨，不能同排同列），
  // 再在其中选 BFS 路径最长的一对 —— 路线必须真正横贯全图。
  if (level === 5) {
    const m = 1; // margin
    const ring: CellPos[] = [];
    for (let c = m; c <= cols - 1 - m; c++) {
      ring.push({ row: m, col: c }, { row: rows - 1 - m, col: c });
    }
    for (let r = m + 1; r < rows - 1 - m; r++) {
      ring.push({ row: r, col: m }, { row: r, col: cols - 1 - m });
    }
    shuffle(rng, ring);

    const opposite = (a: CellPos, b: CellPos) =>
      Math.abs(a.row - b.row) >= rows / 2 && Math.abs(a.col - b.col) >= cols / 2;

    let bestPair: { start: CellPos; end: CellPos } | null = null;
    let bestLen = -1;
    // 生成是一次性成本，直接穷举全部内圈起点换取最长路线
    for (const a of ring) {
      const { dist } = bfsDistanceField(graph, a);
      for (const b of ring) {
        if (a === b || !opposite(a, b)) continue;
        const d = dist[b.row][b.col];
        if (d > bestLen) {
          bestLen = d;
          bestPair = { start: a, end: b };
        }
      }
    }
    if (bestPair) return bestPair;

    // 兜底：真·对角
    const corners: CellPos[] = [
      { row: m, col: m },
      { row: m, col: cols - 1 - m },
      { row: rows - 1 - m, col: m },
      { row: rows - 1 - m, col: cols - 1 - m },
    ];
    shuffle(rng, corners);
    const a = corners[0];
    const end = {
      row: rows - 1 - a.row,
      col: cols - 1 - a.col,
    };
    return { start: a, end };
  }

  // Level 1-4：原直径启发式
  const start = farthestCell(graph, randomCell);
  const { dist } = bfsDistanceField(graph, start);
  let end: CellPos = farthestCell(graph, start);
  let bestDist = -1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const manhattan = Math.abs(r - start.row) + Math.abs(c - start.col);
      if (manhattan < 2) continue;
      if (dist[r][c] > bestDist) {
        bestDist = dist[r][c];
        end = { row: r, col: c };
      }
    }
  }
  return { start, end };
}

function generateOnce(
  options: GenerateMazeOptions,
  rows: number,
  cols: number,
  seed: string,
  level: MazeLevel,
  algorithm: MazeAlgorithm
): Maze {
  const rng = createRng(seed);
  const cells = createEmptyCells(rows, cols);
  if (algorithm === "prim") carvePrim(cells, rows, cols, rng);
  else if (algorithm === "wilson") carveWilson(cells, rows, cols, rng);
  else carveRecursiveBacktracking(cells, rows, cols, rng);

  const { start, end } = pickStartEndGreedy(cells, rows, cols, rng, level);
  const partial = { rows, cols, cells, start, end };
  const solution = solveMaze(partial);

  const maze: Maze = {
    id: options.id ?? seed,
    level,
    rows,
    cols,
    cells,
    start,
    end,
    solution,
    difficultyScore: 0,
    theme: LEVEL_THEMES[level],
    seed,
  };
  maze.difficultyScore = evaluateMazeQuality(maze).difficultyScore;
  return maze;
}

/**
 * Level 5 采用「多候选择优」：Wilson 岔路多但死路浅、回溯法岔路少但死路深，
 * 单一算法都不稳定。这里用同一主种子派生多个子种子，混合三种算法各生成一张，
 * 按综合难度分（含错误路径深度）取最难的一张。完全确定性：同一 seed 永远选出同一张。
 */
const LEVEL5_CANDIDATE_ALGOS: MazeAlgorithm[] = [
  "wilson",
  "recursive-backtracking",
  "wilson",
  "prim",
  "recursive-backtracking",
  "wilson",
];

export function generateMaze(options: GenerateMazeOptions): Maze {
  const { rows, cols } = options;
  if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 2 || cols < 2) {
    throw new Error(`generateMaze: rows/cols 必须是 >= 2 的整数，收到 ${rows}x${cols}`);
  }
  const seed = options.seed ?? `${rows}x${cols}-default`;
  const level = (options.level ?? 1) as MazeLevel;

  if (level === 5 && !options.algorithm) {
    let best: Maze | null = null;
    for (let i = 0; i < LEVEL5_CANDIDATE_ALGOS.length; i++) {
      const cand = generateOnce(
        options,
        rows,
        cols,
        `${seed}-cand${i}`,
        level,
        LEVEL5_CANDIDATE_ALGOS[i]
      );
      if (!best || cand.difficultyScore > best.difficultyScore) best = cand;
    }
    // 对外保留主种子与子种子记录，保证可复现、可调试
    best!.seed = seed;
    best!.id = options.id ?? seed;
    return best!;
  }

  const algorithm = options.algorithm ?? defaultAlgorithmForLevel(level);
  return generateOnce(options, rows, cols, seed, level, algorithm);
}
