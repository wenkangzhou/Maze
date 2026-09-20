/**
 * Level 页面的静态参数（output: export 需要）。
 * 客户端组件逻辑在 LevelClient.tsx。
 */

import { LevelClient } from "./LevelClient";

export function generateStaticParams() {
  return [{ level: "1" }, { level: "2" }, { level: "3" }, { level: "4" }, { level: "5" }];
}

export default async function LevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  await params;
  return <LevelClient />;
}
