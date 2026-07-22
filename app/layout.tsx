import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth-context";
import { GsapProvider } from "@/components/gsap-provider";
import { MobileTabBarClient } from "@/components/mobile-tab-bar-client";
import { MagneticCursor } from "@/components/magnetic-cursor";
import { ScrollProgress } from "@/components/scroll-progress";
import { createPageMetadata, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";
import "./globals.css";

const homeMetadata = createPageMetadata({
  title: "把 YouTube 视频变成可复习的双语学习材料",
  description: SITE_DESCRIPTION,
  path: "/",
  index: true,
});

export const metadata: Metadata = {
  ...homeMetadata,
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} — 把 YouTube 视频变成可复习的双语学习材料`,
    template: `%s | ${SITE_NAME}`,
  },
  manifest: "/manifest.webmanifest",
  category: "education",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="antialiased">
        <AuthProvider>
          <GsapProvider>
            {children}
            <MobileTabBarClient />
          </GsapProvider>
        </AuthProvider>
        <ScrollProgress />
        <MagneticCursor />
      </body>
    </html>
  );
}
