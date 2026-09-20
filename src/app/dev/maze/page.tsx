"use client";

/**
 * Maze Playground（需求 #59）——第三阶段：提示 / 完整答案 / 星级。
 *
 * 默认是「傻瓜式」游玩界面：迷宫 + 💡 提示 + 两个大按钮。
 * 所有参数 / debug 图层 / 统计都收进「高级设置」抽屉。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MazeBoard, type DrawStatus } from "@/components/maze/MazeBoard";
import { CompletionDialog } from "@/components/ui/CompletionDialog";
import { HintMenu } from "@/components/ui/HintMenu";
import { MAZE_CONFIGS } from "@/data/levels";
import { evaluateMazeQuality } from "@/lib/maze/difficulty";
import {
  computePartialHint,
  computeStars,
} from "@/lib/maze/hint";
import {
  cellCenter,
  computeGeometry,
  solutionToSvgPoints,
} from "@/lib/maze/geometry";
import { defaultAlgorithmForLevel, generateMaze, LEVEL_THEMES } from "@/lib/maze/generator";
import { validateMaze } from "@/lib/maze/validate";
import { THEMES } from "@/lib/maze/themes";
import type { MazeAlgorithm, MazeLevel, Point } from "@/lib/maze/types";

const randomSeed = () => `seed-${Math.random().toString(36).slice(2, 8)}`;
const HINT_DURATION_MS = 3000; // 局部提示约 3 秒自动消失（需求 #30）

export default function DevMazePage() {
  const router = useRouter();

  // --- 生成参数（高级设置内调整） ---
  const [rows, setRows] = useState(9);
  const [cols, setCols] = useState(9);
  const [seed, setSeed] = useState("level-3-maze-01");
  const [level, setLevel] = useState<MazeLevel>(3);
  const [algorithm, setAlgorithm] = useState<MazeAlgorithm | "auto">("auto");
  const [wallWidth, setWallWidth] = useState(0); // 0 = 自动
  const [pathRatio, setPathRatio] = useState(0.62);
  const [tolerance, setTolerance] = useState(0.25);

  // --- debug ---
  const [showSolution, setShowSolution] = useState(false);
  const [showWalkable, setShowWalkable] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [pointer, setPointer] = useState<Point | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // --- 游玩状态 ---
  const [status, setStatus] = useState<DrawStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [tip, setTip] = useState<Point | null>(null);

  // --- 提示状态 ---
  const [hintPoints, setHintPoints] = useState<Point[] | null>(null);
  const [usedPartialHint, setUsedPartialHint] = useState(false);
  const [showFullSolution, setShowFullSolution] = useState(false);
  const [usedFullSolution, setUsedFullSolution] = useState(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const maze = useMemo(
    () =>
      generateMaze({
        rows,
        cols,
        seed,
        level,
        algorithm: algorithm === "auto" ? undefined : algorithm,
      }),
    [rows, cols, seed, level, algorithm]
  );
  // 调试钩子：自动化测试 / 控制台调试可直接读取当前迷宫数据
  if (typeof window !== "undefined") {
    (window as unknown as { __mazeDebug?: unknown }).__mazeDebug = maze;
  }
  // 迷宫重生成（改参数 / 换 seed）时，画板经 key 重挂载，同步重置外层状态
  useEffect(() => {
    setStatus("idle");
    setElapsedMs(null);
    setHintPoints(null);
    setUsedPartialHint(false);
    setShowFullSolution(false);
    setUsedFullSolution(false);
    setTip(null);
  }, [maze]);

  const quality = useMemo(() => evaluateMazeQuality(maze), [maze]);
  const validation = useMemo(() => validateMaze(maze), [maze]);
  const theme = THEMES[maze.theme];
  const effectiveAlgorithm = algorithm === "auto" ? defaultAlgorithmForLevel(level) : algorithm;

  // solution 的 SVG 坐标（提示计算用）
  const geo = useMemo(
    () => computeGeometry(rows, cols, { wallWidth: wallWidth === 0 ? undefined : wallWidth, pathRatio }),
    [rows, cols, wallWidth, pathRatio]
  );
  const solutionSvgPoints = useMemo(() => solutionToSvgPoints(maze.solution, geo), [maze, geo]);

  const resetBoard = () => {
    setStatus("idle");
    setElapsedMs(null);
    setHintPoints(null);
    setUsedPartialHint(false);
    setShowFullSolution(false);
    setUsedFullSolution(false);
    setTip(null);
    setResetCount((n) => n + 1);
  };
  const nextMaze = () => setSeed(randomSeed());
  const loadPreset = (id: string) => {
    const config = MAZE_CONFIGS.find((c) => c.id === id);
    if (!config) return;
    setRows(config.rows);
    setCols(config.cols);
    setSeed(config.seed);
    setLevel(config.level);
  };

  // 局部提示（需求 #30）：从当前笔尖位置出发展示后续 ~12% 路线，3 秒消失
  const handlePartialHint = () => {
    if (status === "completed") return;
    const from = tip ?? cellCenter(geo, maze.start.row, maze.start.col);
    setHintPoints(computePartialHint(solutionSvgPoints, from));
    setUsedPartialHint(true);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHintPoints(null), HINT_DURATION_MS);
  };

  // 完整答案（需求 #31）：淡色常显，用户仍可自己走
  const handleFullSolution = () => {
    if (status === "completed") return;
    setShowFullSolution(true);
    setUsedFullSolution(true);
  };

  const stars = computeStars(usedPartialHint, usedFullSolution);

  const statusText: Record<DrawStatus, string> = {
    idle: `从 ${theme.startEmoji} 出发，画线找到 ${theme.endEmoji}`,
    drawing: "沿着路往前画…",
    paused: "点住线的末端，继续画",
    completed: "找到出口啦！🎉",
  };

  return (
    <main className="flex h-dvh flex-col" style={{ background: theme.pageBg }}>
      {/* 顶栏：迷宫名 + 💡（不醒目）+ 高级设置 */}
      <header className="flex items-center gap-2 px-4 py-3">
        <span className="text-xl" aria-hidden>🌀</span>
        <h1 className="text-base font-bold">迷宫</h1>
        <span className="hidden rounded bg-black/5 px-2 py-0.5 font-mono text-xs text-neutral-400 sm:inline">
          {seed}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <HintMenu
            onPartialHint={handlePartialHint}
            onFullSolution={handleFullSolution}
            fullSolutionShown={showFullSolution}
          />
          <button
            onClick={() => setPanelOpen(true)}
            className="flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm text-neutral-400 transition hover:bg-black/5 active:scale-95"
          >
            ⚙️ 高级设置
          </button>
        </div>
      </header>

      {/* 迷宫：绝对主角 */}
      <section className="relative min-h-0 flex-1 px-2 pb-2">
        <MazeBoard
          key={`${seed}-${rows}-${cols}-${level}-${algorithm}-${resetCount}`}
          maze={maze}
          interactive
          toleranceRatio={tolerance}
          geometryOptions={{
            wallWidth: wallWidth === 0 ? undefined : wallWidth,
            pathRatio,
          }}
          debug={{ showSolution, showGrid, showWalkable }}
          hintPoints={hintPoints}
          showFullSolution={showFullSolution}
          onTipChange={setTip}
          onStatusChange={setStatus}
          onComplete={(info) => setElapsedMs(info.elapsedMs)}
          onPointerMoveSvg={panelOpen ? setPointer : undefined}
          onPointerLeaveSvg={panelOpen ? () => setPointer(null) : undefined}
        />

        {status === "completed" && (
          <CompletionDialog
            stars={stars}
            elapsedMs={elapsedMs ?? undefined}
            nextLabel="换一张"
            onNext={() => {
              nextMaze();
            }}
            onReplay={resetBoard}
            onBack={() => router.push("/")}
          />
        )}
      </section>

      {/* 底部：状态 + 大按钮 */}
      {status !== "completed" && (
        <footer className="flex items-center gap-3 px-4 pb-4 pt-1">
          <p className="min-w-0 flex-1 text-sm text-neutral-500">{statusText[status]}</p>
          <button
            onClick={resetBoard}
            className="min-h-11 shrink-0 rounded-2xl border border-black/10 bg-white px-5 text-sm font-medium active:scale-95"
          >
            重画
          </button>
          <button
            onClick={nextMaze}
            className="min-h-11 shrink-0 rounded-2xl bg-[#5B7A4E] px-5 text-sm font-semibold text-white active:scale-95"
          >
            换一张
          </button>
        </footer>
      )}

      {/* 高级设置抽屉 */}
      {panelOpen && (
        <div className="fixed inset-0 z-20">
          <div
            className="absolute inset-0 bg-black/25"
            onClick={() => setPanelOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col gap-5 overflow-y-auto bg-[#FAF7F2] p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">高级设置</h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-neutral-400 hover:bg-black/5"
                aria-label="关闭"
              >
                ✕
              </button>
            </div>

            {validation.valid ? (
              <p className="rounded-xl bg-green-100 px-3 py-2 text-xs font-medium text-green-700">
                ✓ 地图结构合法
              </p>
            ) : (
              <ul className="list-disc space-y-1 rounded-xl bg-red-50 p-3 pl-6 text-xs text-red-700">
                {validation.errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}

            <section>
              <SectionTitle>预设地图（100 张固定 config）</SectionTitle>
              <select
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                value=""
                onChange={(e) => e.target.value && loadPreset(e.target.value)}
              >
                <option value="">选择预设快速载入…</option>
                {MAZE_CONFIGS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} · {c.rows}×{c.cols} · {THEMES[LEVEL_THEMES[c.level]].name}
                  </option>
                ))}
              </select>
            </section>

            <section className="space-y-3">
              <SectionTitle>生成参数</SectionTitle>
              <SliderRow label={`rows：${rows}`} min={3} max={15} step={1} value={rows} onChange={setRows} />
              <SliderRow label={`cols：${cols}`} min={3} max={15} step={1} value={cols} onChange={setCols} />
              <div>
                <span className="text-sm">seed</span>
                <div className="mt-1 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 font-mono text-sm"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                  />
                  <button
                    onClick={() => setSeed(randomSeed())}
                    className="h-11 w-11 shrink-0 rounded-xl border border-black/10 bg-white active:scale-95"
                    title="随机 seed"
                  >
                    🎲
                  </button>
                </div>
              </div>
              <div>
                <span className="text-sm">Level（主题）</span>
                <div className="mt-1 grid grid-cols-5 gap-1">
                  {([1, 2, 3, 4, 5] as MazeLevel[]).map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setLevel(lv)}
                      className={`min-h-11 rounded-xl border text-sm font-medium transition ${
                        level === lv
                          ? "border-transparent bg-[#5B7A4E] text-white"
                          : "border-black/10 bg-white text-neutral-600"
                      }`}
                    >
                      {lv}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  当前主题：{theme.name} {theme.startEmoji} → {theme.endEmoji}
                </p>
              </div>
              <div>
                <span className="text-sm">生成算法</span>
                <select
                  className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value as MazeAlgorithm | "auto")}
                >
                  <option value="auto">自动（当前：{algoName(effectiveAlgorithm)}）</option>
                  <option value="recursive-backtracking">Recursive Backtracking（长走廊）</option>
                  <option value="prim">Randomized Prim（均衡分支）</option>
                  <option value="wilson">Wilson（岔路密集）</option>
                </select>
                <p className="mt-1 text-xs text-neutral-400">
                  低等级默认 RB，Level 3-4 用 Prim，Level 5 用 Wilson
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <SectionTitle>渲染与碰撞</SectionTitle>
              <SliderRow
                label={`墙壁线宽：${wallWidth === 0 ? "自动" : wallWidth}`}
                min={0} max={14} step={1} value={wallWidth} onChange={setWallWidth}
              />
              <SliderRow
                label={`道路宽度比：${pathRatio.toFixed(2)}`}
                min={0.4} max={0.9} step={0.02} value={pathRatio} onChange={setPathRatio}
              />
              <SliderRow
                label={`碰撞容差：+${Math.round(tolerance * 100)}%`}
                min={0} max={0.5} step={0.05} value={tolerance} onChange={setTolerance}
              />
            </section>

            <section className="space-y-2">
              <SectionTitle>Debug 图层</SectionTitle>
              <ToggleRow label="完整正确路线（solution）" checked={showSolution} onChange={setShowSolution} />
              <ToggleRow label="合法道路区域（碰撞判定范围）" checked={showWalkable} onChange={setShowWalkable} />
              <ToggleRow label="Cell 网格" checked={showGrid} onChange={setShowGrid} />
              <p className="pt-1 text-xs text-neutral-400">
                Pointer 坐标：
                {pointer ? ` (${pointer.x.toFixed(1)}, ${pointer.y.toFixed(1)})` : " 移入迷宫查看"}
              </p>
            </section>

            <section>
              <SectionTitle>迷宫统计</SectionTitle>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <Stat label="difficultyScore" value={quality.difficultyScore} highlight />
                <Stat label="solutionLength" value={quality.solutionLength} />
                <Stat label="branches" value={quality.branches} />
                <Stat label="decisionPoints" value={quality.decisionPoints} />
                <Stat label="deadEnds" value={quality.deadEnds} />
                <Stat label="wrongPathDepth" value={quality.wrongPathDepth} />
              </dl>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}

function algoName(a: MazeAlgorithm): string {
  return a === "prim" ? "Prim" : a === "wilson" ? "Wilson" : "RB";
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold tracking-wider text-neutral-400">
      {children}
    </h3>
  );
}

function SliderRow({
  label, min, max, step, value, onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm">{label}</span>
      <input
        type="range"
        className="mt-1 w-full accent-[#5B7A4E]"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ToggleRow({
  label, checked, onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        className="h-5 w-5 accent-[#5B7A4E]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Stat({
  label, value, highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-black/5 bg-white px-3 py-2">
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd
        className={`text-lg font-bold tabular-nums ${
          highlight ? "text-[#5B7A4E]" : "text-neutral-700"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
