"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SERVICE_WORKER_PATH = "/sw.js";

function collectCacheUrls(): string[] {
  const urls = new Set<string>([window.location.href]);
  for (const entry of performance.getEntriesByType("resource")) {
    const url = new URL((entry as PerformanceResourceTiming).name, window.location.href);
    if (url.origin === window.location.origin) urls.add(url.href);
  }
  return [...urls];
}

async function warmCurrentPage(): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const worker =
    navigator.serviceWorker.controller ?? registration.active ?? registration.waiting;
  worker?.postMessage({
    type: "CACHE_URLS",
    pageUrl: window.location.href,
    urls: collectCacheUrls(),
  });
}

/** 注册离线缓存，并在每次客户端导航后保存当前页面及其静态资源。 */
export function ServiceWorkerRegistration() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let cancelled = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
          scope: "/",
          updateViaCache: "none",
        });
        if (registration.active) await registration.update().catch(() => undefined);
        if (!cancelled) await warmCurrentPage();
      } catch {
        // 不支持或注册失败时保持普通网页体验。
      }
    };
    void register();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }
    void warmCurrentPage().catch(() => undefined);
  }, [pathname]);

  return null;
}
