import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";
import YoutubeIframe, { type YoutubeIframeRef } from "react-native-youtube-iframe";
import { WebView } from "react-native-webview";
import { isBilibiliVideoId, type VideoMetadata } from "@teach-player/shared";
import { useTheme } from "@/providers/theme-provider";
import { getApiBaseUrl } from "@/lib/runtime-config";
import { useScaleIn } from "@/lib/animation";
import { storage } from "@/lib/storage";

export type PlayerHandle = {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => Promise<number>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Bilibili WebView 注入脚本：
//   - 改用 ontimeupdate 事件（浏览器约 250ms 触发，完全事件驱动无需轮询）
//   - 同时保留 seekTo 接口
// ─────────────────────────────────────────────────────────────────────────────
const BILIBILI_INJECTED_JS = `
(function() {
  if (window.__teachPlayerInjected) return;
  window.__teachPlayerInjected = true;

  function attachTimeUpdate() {
    const video = document.querySelector('video');
    if (!video) {
      // 视频元素还未挂载，等待 500ms 后重试
      setTimeout(attachTimeUpdate, 500);
      return;
    }
    video.addEventListener('timeupdate', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'timeupdate',
        currentTime: video.currentTime
      }));
    });
    // 初始同步一次
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'ready',
      currentTime: video.currentTime
    }));
  }
  attachTimeUpdate();
})();
true;
`;

export const VideoPlayer = forwardRef<PlayerHandle, { videoId: string; metadata?: VideoMetadata; difficulty?: { portrait: any; heatmap: number[] } }>(
  function VideoPlayer({ videoId, metadata, difficulty }, ref) {
    const { theme } = useTheme();
    const playerRef = useRef<YoutubeIframeRef | null>(null);
    const webViewRef = useRef<WebView | null>(null);
    const readyRef = useRef(false);
    // 防并发锁：保证同时只有一个 getCurrentTime 请求在飞
    const pendingGetTimeRef = useRef<Promise<number> | null>(null);
    const lastCurrentTimeRef = useRef(0);
    const [playerError, setPlayerError] = useState<string | null>(null);
    const [playerAttempt, setPlayerAttempt] = useState(0);

    const { width } = useWindowDimensions();
    const playerWidth = Math.min(width - theme.spacing.page * 2, 760);
    const playerHeight = Math.round((playerWidth * 9) / 16);

    const localUri = storage.get<string | null>(`local-video-uri:${videoId}`, null);
    const isLocal = !!localUri || videoId.startsWith("local-");
    const isBilibili = isBilibiliVideoId(videoId) || isLocal;

    const seekToSeconds = useCallback((seconds: number) => {
      const clamped = Math.max(0, seconds);
      lastCurrentTimeRef.current = clamped;
      if (isBilibili) {
        webViewRef.current?.injectJavaScript(`
          (function() {
            const video = document.querySelector('video');
            if (video) {
              video.currentTime = ${clamped};
              video.play();
            }
          })();
          true;
        `);
      } else {
        playerRef.current?.seekTo(clamped, true);
      }
    }, [isBilibili]);

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number) {
        seekToSeconds(seconds);
      },
      async getCurrentTime() {
        if (isBilibili) {
          // Bilibili 通过事件驱动更新 lastCurrentTimeRef，直接返回缓存值
          return lastCurrentTimeRef.current;
        }

        if (!readyRef.current || !playerRef.current) {
          return lastCurrentTimeRef.current;
        }

        // 若已有飞行中的请求，直接复用同一个 Promise 而非发起新请求
        if (pendingGetTimeRef.current) {
          return pendingGetTimeRef.current;
        }

        const p = playerRef.current.getCurrentTime().then((value) => {
          lastCurrentTimeRef.current = value;
          return value;
        }).finally(() => {
          pendingGetTimeRef.current = null;
        });

        pendingGetTimeRef.current = p;
        return p;
      }
    }), [isBilibili, seekToSeconds]);

    const animatedStyle = useScaleIn(0);

    // B站播放器参数：启用超清(high_quality=1)，关闭弹幕(danmaku=0)，宽屏自适应(as_wide=1)
    const bvidParam = videoId.toLowerCase().startsWith("av") ? `aid=${videoId.slice(2)}` : `bvid=${videoId}`;
    const bilibiliPlayerUrl = `https://player.bilibili.com/player.html?${bvidParam}&as_wide=1&high_quality=1&danmaku=0&autoplay=0`;

    const apiBaseUrl = getApiBaseUrl();
    const streamUrl = localUri ?? `${apiBaseUrl}/api/video-stream?id=${videoId}`;
    const safeStreamUrl = JSON.stringify(streamUrl)
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");

    const localPlayerHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; }
          video { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <video id="player" controls playsinline webkit-playsinline style="width:100%; height:100%;"></video>
        <script>
          document.getElementById("player").src = ${safeStreamUrl};
        </script>
      </body>
      </html>
    `;

    // ─────────────────────────────────────────────────────────────────────────
    // WebView 消息处理（Bilibili/Local 均通过此接收时间更新）
    // ─────────────────────────────────────────────────────────────────────────
    const handleWebViewMessage = useCallback((e: any) => {
      try {
        const data = JSON.parse(e.nativeEvent.data);
        if ((data.type === "timeupdate" || data.type === "ready") && typeof data.currentTime === "number") {
          lastCurrentTimeRef.current = data.currentTime;
        }
      } catch {
        // ignore parse error
      }
    }, []);

    useEffect(() => {
      readyRef.current = false;
      pendingGetTimeRef.current = null;
      lastCurrentTimeRef.current = 0;
      playerRef.current = null;
      webViewRef.current = null;
      setPlayerError(null);
      setPlayerAttempt(0);
    }, [videoId]);

    return (
      <Animated.View style={[animatedStyle, {
        width: playerWidth,
        alignSelf: "center",
        overflow: "hidden",
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }]}>
        <View style={{ width: playerWidth, height: playerHeight, backgroundColor: "#000" }}>
          {isBilibili ? (
            <WebView
              key={`${videoId}-${playerAttempt}`}
              ref={webViewRef}
              source={isLocal ? { html: localPlayerHtml, baseUrl: apiBaseUrl } : { uri: bilibiliPlayerUrl }}
              injectedJavaScript={BILIBILI_INJECTED_JS}
              onMessage={handleWebViewMessage}
              onError={() => setPlayerError("视频播放器加载失败，请检查网络后重试。")}
              allowsFullscreenVideo
              onShouldStartLoadWithRequest={(request) => {
                if (isLocal) {
                  return request.url === "about:blank"
                    || request.url.startsWith("data:")
                    || request.url.startsWith("file:")
                    || request.url.startsWith("content:")
                    || request.url === streamUrl
                    || request.url.startsWith(apiBaseUrl);
                }
                return (
                  request.url.includes("player.bilibili.com") ||
                  request.url === "about:blank"
                );
              }}
              javaScriptCanOpenWindowsAutomatically={false}
              setSupportMultipleWindows={false}
              // 伪装成 PC 浏览器 User-Agent，强制解锁 B站 1080P/720P 超清分辨率
              userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              style={{ flex: 1, backgroundColor: "#000" }}
            />
          ) : (
            <YoutubeIframe
              key={`${videoId}-${playerAttempt}`}
              ref={playerRef}
              height={playerHeight}
              width={playerWidth}
              videoId={videoId}
              initialPlayerParams={{ controls: true, rel: false }}
              onReady={() => {
                readyRef.current = true;
                setPlayerError(null);
              }}
              onError={() => setPlayerError("视频播放器加载失败，请检查网络后重试。")}
              onChangeState={(state: string) => {
                if (state === "playing" || state === "paused" || state === "buffering") {
                  readyRef.current = true;
                }
              }}
              webViewProps={{ allowsFullscreenVideo: true }}
            />
          )}
          {playerError ? (
            <View style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.78)", alignItems: "center", justifyContent: "center", padding: 20, gap: 10 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700", textAlign: "center" }}>{playerError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重试视频播放器"
                onPress={() => { setPlayerError(null); setPlayerAttempt((value) => value + 1); }}
                style={{ minHeight: 48, paddingHorizontal: 18, borderRadius: 12, backgroundColor: theme.colors.accent, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: "#0A1A00", fontWeight: "900" }}>重试播放</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
          <Text selectable numberOfLines={2} style={{ color: theme.colors.text, fontSize: 15, fontWeight: "800", lineHeight: 20 }}>
            {metadata?.title ?? "Loading video..."}
          </Text>
          {metadata?.authorName ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {metadata.thumbnailUrl && isBilibili ? (
                <Image
                  source={{ uri: metadata.thumbnailUrl }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceRaised }}
                />
              ) : metadata.channelThumbnailUrl ? (
                <Image
                  source={{ uri: metadata.channelThumbnailUrl }}
                  style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceRaised }}
                />
              ) : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text selectable numberOfLines={1} style={{ color: theme.colors.text, fontSize: 13, fontWeight: "800" }}>
                  {metadata.authorName}
                </Text>
                <Text selectable numberOfLines={1} style={{ color: theme.colors.muted, fontSize: 11 }}>
                  {isBilibili ? "B站 UP主" : "YouTube 频道"}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* 生词雷达热力进度条 */}
        {difficulty?.heatmap && difficulty.heatmap.length > 0 ? (
          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, padding: 12, gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "800" }}>生词雷达热力条</Text>
              <Text style={{ color: theme.colors.warm, fontSize: 11, fontWeight: "800" }}>红橙色代表生词密集区</Text>
            </View>
            <View style={{ height: 5, width: "100%", flexDirection: "row", borderRadius: 2, overflow: "hidden", backgroundColor: `${theme.colors.surfaceRaised}` }}>
              {difficulty.heatmap.map((val, idx) => {
                let bgColor = "rgba(255,255,255,0.08)";
                if (val > 0 && val <= 2) bgColor = `${theme.colors.accent}66`;
                else if (val > 2 && val <= 5) bgColor = `${theme.colors.warm}CC`;
                else if (val > 5) bgColor = "#FF3B30EE";
                return (
                  <View
                    key={`heatmap-bar-${idx}`}
                    style={{ flex: 1, height: 5, backgroundColor: bgColor, marginHorizontal: 0.5 }}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

      </Animated.View>
    );
  }
);
