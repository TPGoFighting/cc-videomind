import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ videoId: string }>;
}): Promise<Metadata> {
  const { videoId } = await params;

  return createPageMetadata({
    title: "视频学习工作区",
    description: "在同一工作区对照视频、双语字幕、可追溯要点、问答、收藏和笔记。",
    path: `/video/${encodeURIComponent(videoId)}`,
  });
}

export default function VideoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
