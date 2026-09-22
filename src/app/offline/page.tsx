export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#FAF7F2] px-6 text-center">
      <span className="text-6xl" aria-hidden>🐰</span>
      <h1 className="text-2xl font-bold">现在没有网络</h1>
      <p className="max-w-sm text-sm leading-6 text-neutral-500">
        已经打开过的迷宫仍然可以继续玩。恢复网络后，新的迷宫会自动保存到设备。
      </p>
      <a
        href="/"
        className="min-h-11 rounded-2xl bg-[#5B7A4E] px-6 py-3 font-semibold text-white active:scale-95"
      >
        回到首页
      </a>
    </main>
  );
}
