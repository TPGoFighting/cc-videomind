"use client";

import { YouTubeStatusBanner } from "@/components/youtube-status-banner";
import { useYouTubeStatus } from "@/lib/hooks/useYouTubeStatus";

/** 客户端包装器：在首页顶部显示 YouTube 连通性告警 */
export function YouTubeStatusAlert() {
  const status = useYouTubeStatus();
  return <YouTubeStatusBanner status={status} variant="banner" />;
}
