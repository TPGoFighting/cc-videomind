import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "AI 控制台",
  description: "Teach Player 管理员 AI 模型、接口和缓存控制台。",
  path: "/admin",
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
