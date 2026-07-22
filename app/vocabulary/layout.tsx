import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "单词本",
  description: "查看从双语字幕中保存的单词、释义、例句和复习状态。",
  path: "/vocabulary",
});

export default function VocabularyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
