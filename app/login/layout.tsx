import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "登录",
  description: "登录 Teach Player，继续保存视频学习记录、词句、笔记与复习进度。",
  path: "/login",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
