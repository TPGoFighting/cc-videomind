"use client";

import { useEffect, useState } from "react";

export type YouTubeStatus = "checking" | "available" | "blocked" | "restricted";

/**
 * 检测 YouTube 是否可访问
 * - 先 ping youtube.com 的静态资源，判断网络可达性
 * - 再尝试加载 IFrame API，判断浏览器环境兼容性
 */
export function useYouTubeStatus(): YouTubeStatus {
  const [status, setStatus] = useState<YouTubeStatus>("checking");

  useEffect(() => {
    let cancelled = false;

    async function check() {
      // 第一步：检测网络可达性（no-cors 模式避免 CORS 错误）
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        await fetch("https://www.youtube.com/favicon.ico", {
          mode: "no-cors",
          signal: controller.signal,
        });
        clearTimeout(timeout);
      } catch {
        if (!cancelled) setStatus("blocked");
        return;
      }

      // 第二步：YouTube 可达但需确认 IFrame API 能否加载
      // 如果 window.YT 已存在，直接标记可用
      if (window.YT?.Player) {
        if (!cancelled) setStatus("available");
        return;
      }

      // 检查 onYouTubeIframeAPIReady 是否已被设置（video-player 可能已加载）
      const hadCallback = typeof (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady === "function";

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";

      const apiTimeout = setTimeout(() => {
        if (!cancelled) setStatus("restricted");
        script.remove();
      }, 8000);

      script.onload = () => {
        clearTimeout(apiTimeout);
        if (!cancelled) setStatus("available");
      };

      script.onerror = () => {
        clearTimeout(apiTimeout);
        if (!cancelled) setStatus("restricted");
        script.remove();
      };

      // 如果之前没有回调，添加一个空回调防止控制台警告
      if (!hadCallback) {
        (window as unknown as Record<string, unknown>).onYouTubeIframeAPIReady = () => {};
      }

      document.head.appendChild(script);
    }

    void check();
    return () => { cancelled = true; };
  }, []);

  return status;
}
