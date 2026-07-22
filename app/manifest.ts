import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Teach Player",
    short_name: "Teach Player",
    description: "把知识型 YouTube 视频变成可核验、可收藏、可复习的双语学习材料。",
    start_url: "/",
    display: "standalone",
    background_color: "#080b0f",
    theme_color: "#080b0f",
    lang: "zh-CN",
    icons: [{ src: "/icon.png", sizes: "1280x1280", type: "image/png" }],
  };
}
