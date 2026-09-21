import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "儿童迷宫",
    short_name: "儿童迷宫",
    description: "面向儿童的触屏划线迷宫：安静、简单、高容错。",
    lang: "zh-CN",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // 允许 iPad 两个横屏方向，不强迫孩子固定把某一侧朝上。
    orientation: "landscape",
    background_color: "#faf7f2",
    theme_color: "#faf7f2",
    categories: ["games", "education", "kids"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
