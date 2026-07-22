import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "精选英语学习视频",
  description: "选择一条知识型 YouTube 视频，体验双语字幕、可追溯要点和保存复习。",
  path: "/explore",
  index: true,
});

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
