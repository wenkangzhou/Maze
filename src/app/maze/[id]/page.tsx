/**
 * 游戏页面的静态参数（output: export 需要预生成全部 100 张）。
 */

import { MAZE_CONFIGS } from "@/data/levels";
import { MazeClient } from "./MazeClient";

export function generateStaticParams() {
  return MAZE_CONFIGS.map((c) => ({ id: c.id }));
}

export default async function MazePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await params;
  return <MazeClient />;
}
