import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "学习历史",
  description: "查看当前账户解析过的视频和学习记录。",
  path: "/history",
});

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
