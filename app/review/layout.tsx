import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "今日复习",
  description: "复习从视频中保存的词句，并随时回到原视频和时间点核验语境。",
  path: "/review",
});

export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
