import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "句子本",
  description: "查看从视频字幕中保存的原句、译文和出处时间点。",
  path: "/quotes",
});

export default function QuotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
