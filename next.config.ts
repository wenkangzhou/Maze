import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // V1 纯前端应用：静态导出，无需服务器
  output: "export",
  // 目录式导出（/dev/maze/index.html），兼容任意静态服务器
  trailingSlash: true,
  images: { unoptimized: true },
  // 所有页面内容都在 JS 里（客户端渲染），CSS 直接内联进 HTML，
  // 减少需要部署的文件数，避免部署丢文件
  experimental: {
    inlineCss: true,
  },
  productionBrowserSourceMaps: false,
};

export default nextConfig;
