interface AppLoadingProps {
  label?: string;
}

/** localStorage 同步期间的稳定首屏，避免先闪出默认进度。 */
export function AppLoading({ label = "正在读取本机进度…" }: AppLoadingProps) {
  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#FAF7F2]"
      aria-busy="true"
    >
      <span className="loading-hop text-4xl" aria-hidden>🐰</span>
      <p className="text-sm text-neutral-400">{label}</p>
    </main>
  );
}
