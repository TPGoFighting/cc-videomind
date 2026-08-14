import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "视频笔记",
  description: "查看与视频和时间点关联的个人学习笔记。",
  path: "/notes",
});

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
