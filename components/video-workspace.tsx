"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { ChatPanel } from "@/components/chat-panel";
import { HighlightsPanel } from "@/components/highlights-panel";
import { NotesPanel } from "@/components/notes-panel";
import { SidebarTabs } from "@/components/sidebar-tabs";
import { SummaryPanel } from "@/components/summary-panel";
import { TranscriptViewer } from "@/components/transcript-viewer";
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

  // 要点时刻 + 核心摘要（独立数据源）
  const [moments, setMoments] = useState<KeyMoment[]>([]);
  const [takeaways, setTakeaways] = useState<SummaryTakeaway[]>([]);
  const [momentsLoading, setMomentsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // 翻译状态
  const [translating, setTranslating] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);

  const playerRef = useRef<VideoPlayerHandle>(null);

  // 各面板独立显示模式
  const transcriptMode = useDisplayMode("en");
  const highlightsMode = useDisplayMode("en");
  const summaryMode = useDisplayMode("en");

  // 词义定义
  const wordDefinitions = useWordDefinitions(transcript);

  const handleSeekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  // 每秒轮询播放器当前时间
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(playerRef.current?.getCurrentTime() ?? 0);
    }, 1000);
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

    async function load() {
      setLoading(true);
      setMomentsLoading(true);
      setSummaryLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/video-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
        const payload = (await response.json()) as JsonResponse<AnalysisPayload>;

        if (cancelled) return;

        if (!payload.ok) {
          setError(payload.error.message);
          setLoading(false);
          setMomentsLoading(false);
          setSummaryLoading(false);
          return;
        }

        setMetadata(payload.data.metadata);
        setTranscript(payload.data.transcript);
        setAnalysis(payload.data.analysis);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("无法解析此视频，请确认链接有效后重试。");
          setLoading(false);
          setMomentsLoading(false);
          setSummaryLoading(false);
        }
      }
    }

    async function loadMomentsAndSummary() {
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

    void load();
    void loadMomentsAndSummary();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // 切换到中英/中文模式时，懒加载翻译
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
      const payload = await res.json();
      if (payload.ok && payload.data?.transcript) {
        setTranscript(payload.data.transcript);
      }
    } catch (err) {
      console.error("[Translate] 翻译请求失败:", err);
    } finally {
      setTranslating(false);
    }
  }, [transcript, videoId]);

  // 切换显示模式（翻译 + 面板）
  const transcriptModeChange = useCallback((mode: typeof transcriptMode.displayMode) => {
    transcriptMode.setDisplayMode(mode);
    ensureTranslation(mode);
  }, [transcriptMode, ensureTranslation]);

  const highlightsModeChange = useCallback((mode: typeof highlightsMode.displayMode) => {
    highlightsMode.setDisplayMode(mode);
  }, [highlightsMode]);

  const summaryModeChange = useCallback((mode: typeof summaryMode.displayMode) => {
    summaryMode.setDisplayMode(mode);
  }, [summaryMode]);

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
      <main className="mx-auto w-full max-w-full px-3 pt-16 pb-6 sm:px-5 sm:pt-20 lg:max-w-[80%]">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
          {/* 左侧：视频 + 章节列表 + 核心摘要 */}
          <div className="min-w-0 space-y-6">
            {/* 视频播放器 */}
            <VideoPlayer
              ref={playerRef}
              videoId={videoId}
              metadata={metadata}
            />

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-[14px] font-medium text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {error}
              </div>
            ) : null}

            {/* 移动端：转录文本 + Chat + 笔记依次排列 */}
            <div className="lg:hidden space-y-4">
              <TranscriptViewer
                transcript={transcript}
                loading={loading}
                currentTime={currentTime}
                displayMode={transcriptMode.displayMode}
                onDisplayModeChange={transcriptModeChange}
                wordDefinitions={wordDefinitions}
                onSaveWord={handleSaveWord}
                onSaveQuote={handleSaveQuote}
                onSeekTo={handleSeekTo}
                translating={translating}
              />
              {translating && (
                <p className="text-[12px] text-white/30">翻译中...</p>
              )}
              <ChatPanel
                videoId={videoId}
                suggestedQuestions={analysis?.suggestedQuestions ?? []}
                compact
                onSeekTo={handleSeekTo}
              />
              <NotesPanel videoId={videoId} compact />
            </div>

            {/* 要点时刻（章节列表） */}
            <HighlightsPanel
              moments={moments}
              loading={momentsLoading}
              displayMode={highlightsMode.displayMode}
              onDisplayModeChange={highlightsModeChange}
              onSeekTo={handleSeekTo}
            />

            {/* 核心摘要 */}
            <SummaryPanel
              takeaways={takeaways}
              loading={summaryLoading}
              displayMode={summaryMode.displayMode}
              onDisplayModeChange={summaryModeChange}
              onSeekTo={handleSeekTo}
            />
          </div>

          {/* 右侧：标签页（转录文本 / Chat / 笔记） */}
          <aside className="hidden lg:block lg:sticky lg:top-20 lg:w-[20rem] lg:self-start xl:w-[26rem]">
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
