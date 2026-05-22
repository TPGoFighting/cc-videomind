"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { HighlightsPanel } from "@/components/highlights-panel";
import { MobileVideoTabs } from "@/components/mobile-video-tabs";
import { SidebarTabs } from "@/components/sidebar-tabs";
import { SummaryPanel } from "@/components/summary-panel";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player";
import { useDisplayMode } from "@/lib/hooks/useDisplayMode";
import { useWordDefinitions } from "@/lib/hooks/useWordDefinitions";
import type {
  GenerationDebug,
  JsonResponse,
  KeyMoment,
  SummaryTakeaway,
  TranscriptSegment,
  VideoAnalysis,
  VideoMetadata,
} from "@/lib/types";

type AnalysisPayload = {
  videoId: string;
  metadata: VideoMetadata;
  transcript: TranscriptSegment[];
  analysis: VideoAnalysis;
  cached: boolean;
  preview: boolean;
};

export function VideoWorkspace({ videoId }: { videoId: string }) {
  const [metadata, setMetadata] = useState<VideoMetadata | undefined>();
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // 要点时刻 + 核心摘要（独立数据源）
  const [moments, setMoments] = useState<KeyMoment[]>([]);
  const [takeaways, setTakeaways] = useState<SummaryTakeaway[]>([]);
  const [momentsLoading, setMomentsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // 翻译状态
  const [translating, setTranslating] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const playerRef = useRef<VideoPlayerHandle>(null);

  // 转录文本显示模式
  const transcriptMode = useDisplayMode("en");

  // 词义定义
  const wordDefinitions = useWordDefinitions(transcript);

  const handleSeekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  // 每 100ms 轮询播放器当前时间，确保转录文本跟随精准对齐
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(playerRef.current?.getCurrentTime() ?? 0);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // 渲染状态日志
  useEffect(() => {
    console.log("[Frontend:Render] 状态快照:", {
      momentsLoading,
      summaryLoading,
      loading,
      momentCount: moments.length,
      takeawayCount: takeaways.length,
      error
    });
  }, [momentsLoading, summaryLoading, loading, moments.length, takeaways.length, error]);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<boolean> {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/video-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
        const payload = (await response.json()) as JsonResponse<AnalysisPayload>;

        if (cancelled) return false;

        if (!payload.ok) {
          setError(payload.error.message);
          setErrorCode(payload.error.code ?? null);
          setLoading(false);
          return false;
        }

        setMetadata(payload.data.metadata);
        setTranscript(payload.data.transcript);
        setAnalysis(payload.data.analysis);
        setLoading(false);
        return true;
      } catch {
        if (!cancelled) {
          setError("无法解析此视频，请确认链接有效后重试。");
          setLoading(false);
        }
        return false;
      }
    }

    async function loadMomentsAndSummary() {
      setMomentsLoading(true);
      setSummaryLoading(true);

      const [momentsRes, summaryRes] = await Promise.allSettled([
        fetch("/api/generate-moments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, mode: "smart" }),
        }),
        fetch("/api/generate-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        }),
      ]);

      if (cancelled) return;

      if (momentsRes.status === "fulfilled") {
        try {
          const payload = (await momentsRes.value.json()) as JsonResponse<{
            moments: KeyMoment[];
            _debug?: GenerationDebug;
          }>;
          console.log("[Frontend:Moments] 收到响应:", {
            ok: payload.ok,
            status: momentsRes.value.status,
            momentCount: payload.ok ? payload.data.moments.length : "N/A",
            error: payload.ok ? null : payload.error?.message,
          });
          if (payload.ok) {
            setMoments(payload.data.moments);
          }
        } catch (err) {
          console.error("[Frontend:Moments] JSON 解析失败:", err instanceof Error ? err.message : err);
        }
      } else {
        console.error("[Frontend:Moments] 请求失败(rejected):", momentsRes.reason);
      }
      setMomentsLoading(false);

      if (summaryRes.status === "fulfilled") {
        try {
          const payload = (await summaryRes.value.json()) as JsonResponse<{
            takeaways: SummaryTakeaway[];
            _debug?: GenerationDebug;
          }>;
          console.log("[Frontend:Summary] 收到响应:", {
            ok: payload.ok,
            status: summaryRes.value.status,
            takeawayCount: payload.ok ? payload.data.takeaways.length : "N/A",
            error: payload.ok ? null : payload.error?.message,
          });
          if (payload.ok) {
            setTakeaways(payload.data.takeaways);
          }
        } catch (err) {
          console.error("[Frontend:Summary] JSON 解析失败:", err instanceof Error ? err.message : err);
        }
      } else {
        console.error("[Frontend:Summary] 请求失败(rejected):", summaryRes.reason);
      }
      setSummaryLoading(false);
    }

    // 先加载主分析（含字幕缓存写入），成功后再加载要点/摘要
    async function loadAll() {
      const ok = await load();
      if (cancelled || !ok) {
        setMomentsLoading(false);
        setSummaryLoading(false);
        return;
      }
      await loadMomentsAndSummary();
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // 切换到中英/中文模式时，懒加载翻译（SSE 流式，逐句返回）
  const ensureTranslation = useCallback(async (mode: string) => {
    if (mode === "en") return;
    // 检查是否已有翻译
    const hasTranslation = transcript.some((s) => s.text_zh);
    if (hasTranslation) return;

    setTranslating(true);
    try {
      const res = await fetch("/api/translate-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });

      // 快速路径：非流式（已全部翻译完成）
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("text/event-stream")) {
        const payload = await res.json();
        if (payload.ok && payload.data?.transcript) {
          setTranscript(payload.data.transcript);
        }
        setTranslating(false);
        return;
      }

      // 流式读取 SSE
      const reader = res.body?.getReader();
      if (!reader) {
        setTranslating(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "segment" && event.data?.text_zh) {
              const { startTime, text_zh } = event.data;
              setTranscript((prev) =>
                prev.map((s) =>
                  s.startTime === startTime ? { ...s, text_zh } : s
                )
              );
            } else if (event.type === "done") {
              setTranslating(false);
            } else if (event.type === "error") {
              console.error("[Translate] 服务端错误:", event.data?.message);
              setTranslating(false);
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }
    } catch (err) {
      console.error("[Translate] 翻译请求失败:", err);
      setTranslating(false);
    }
  }, [transcript, videoId]);

  // 切换显示模式（翻译 + 面板）
  const transcriptModeChange = useCallback((mode: typeof transcriptMode.displayMode) => {
    transcriptMode.setDisplayMode(mode);
    ensureTranslation(mode);
  }, [transcriptMode, ensureTranslation]);

  // 收藏单词
  const handleSaveWord = useCallback(async (lemma: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/user-vocabulary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lemma, videoId }),
      });
      const payload = await res.json();
      return payload.ok === true;
    } catch {
      return false;
    }
  }, [videoId]);

  // 收藏句子
  const handleSaveQuote = useCallback(async (segment: TranscriptSegment): Promise<boolean> => {
    try {
      const res = await fetch("/api/user-quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          textEn: segment.text,
          textZh: segment.text_zh,
          startTime: segment.startTime,
          endTime: segment.endTime,
        }),
      });
      const payload = await res.json();
      return payload.ok === true;
    } catch {
      return false;
    }
  }, [videoId]);

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      {/* 主内容 */}
      <main className="mx-auto w-full max-w-full px-3 pt-16 pb-20 sm:px-5 sm:pt-20 md:max-w-[85%] lg:max-w-[80%] md:pb-16 page-enter">
        <div className="grid gap-4 md:gap-6 md:grid-cols-[1fr_auto]">
          {/* 左侧：视频 + 章节列表 + 核心摘要 */}
          <div className="min-w-0 space-y-6">
            {/* 视频播放器 */}
            <VideoPlayer
              ref={playerRef}
              videoId={videoId}
              metadata={metadata}
            />

            {error ? (
              <div>
                <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-[14px] font-medium text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                  {error}
                </div>
                {errorCode === "quota_exceeded" && (
                  <div className="mt-3 flex gap-2">
                    <Link href="/login" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-5 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-white/15">
                      立即登录
                    </Link>
                    <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-[#0099ff]/15 px-5 py-2.5 text-[13px] font-medium text-[#0099ff] transition-colors hover:bg-[#0099ff]/25">
                      免费注册
                    </Link>
                    <Link href="/subscribe" className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-5 py-2.5 text-[13px] font-medium text-amber-400 transition-colors hover:bg-amber-500/20">
                      ⚡ 升级订阅
                    </Link>
                  </div>
                )}
              </div>
            ) : null}

            {/* 移动端：标签页切换（转录文本 / Chat / 笔记） */}
            <div className="md:hidden mt-6">
              <MobileVideoTabs
                videoId={videoId}
                transcript={transcript}
                transcriptLoading={loading}
                currentTime={currentTime}
                analysis={analysis}
                displayMode={transcriptMode.displayMode}
                onDisplayModeChange={transcriptModeChange}
                wordDefinitions={wordDefinitions}
                onSaveWord={handleSaveWord}
                onSaveQuote={handleSaveQuote}
                onSeekTo={handleSeekTo}
                translating={translating}
              />
            </div>

            {/* 要点时刻（章节列表） */}
            <HighlightsPanel
              moments={moments}
              loading={momentsLoading}
              onSeekTo={handleSeekTo}
            />

            {/* 核心摘要 */}
            <SummaryPanel
              takeaways={takeaways}
              loading={summaryLoading}
              onSeekTo={handleSeekTo}
            />
          </div>

          {/* 右侧：标签页（转录文本 / Chat / 笔记） */}
          <aside className="hidden md:block md:sticky md:top-20 md:w-[18rem] md:self-start lg:w-[20rem] xl:w-[26rem]">
            <div className="h-[calc(100vh-6rem)]">
              <SidebarTabs
                videoId={videoId}
                transcript={transcript}
                transcriptLoading={loading}
                currentTime={currentTime}
                analysis={analysis}
                displayMode={transcriptMode.displayMode}
                onDisplayModeChange={transcriptModeChange}
                wordDefinitions={wordDefinitions}
                onSaveWord={handleSaveWord}
                onSaveQuote={handleSaveQuote}
                onSeekTo={handleSeekTo}
                translating={translating}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
