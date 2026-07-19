"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { HighlightsPanel } from "@/components/highlights-panel";
import { MobileVideoTabs } from "@/components/mobile-video-tabs";
import { SidebarTabs } from "@/components/sidebar-tabs";
import { SummaryPanel } from "@/components/summary-panel";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player";
import { useDisplayMode } from "@/lib/hooks/useDisplayMode";
import { useWordDefinitions } from "@/lib/hooks/useWordDefinitions";
import { hasCompleteTranslation } from "@/lib/utils/translation";
import type {
  GenerationDebug,
  JsonResponse,
  KeyMoment,
  SummaryTakeaway,
  TranscriptSegment,
  VideoAnalysis,
  VideoMetadata,
} from "@/lib/types";

type TranscriptPayload = {
  videoId: string;
  metadata: VideoMetadata;
  transcript: TranscriptSegment[];
  cached: boolean;
};

type AnalyzePayload = {
  videoId: string;
  transcript: TranscriptSegment[];
  analysis: VideoAnalysis;
  comprehensive?: {
    summary: string;
    takeaways: Array<{
      label: string;
      label_zh?: string;
      insight: string;
      insight_zh?: string;
      timestamps?: string[];
    }>;
    moments: Array<{
      title: string;
      title_zh?: string;
      timestamp: string;
      quote: string;
      quote_zh?: string;
      reason: string;
      reason_zh?: string;
    }>;
    highlights: Array<{
      startTime: number;
      endTime: number;
      title: string;
      quote: string;
      reason: string;
    }>;
    suggestedQuestions: string[];
  };
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
  const [translationError, setTranslationError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);

  const playerRef = useRef<VideoPlayerHandle>(null);
  const mainRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    gsap.fromTo(
      mainRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }
    );
  }, { scope: mainRef });

  // 转录文本显示模式
  const transcriptMode = useDisplayMode("en");

  // 词义定义
  const wordDefinitions = useWordDefinitions(transcript);

  const handleSeekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

  // 每 250ms 轮询播放器当前时间（从 100ms 降低，减少 React 重渲染）
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(playerRef.current?.getCurrentTime() ?? 0);
    }, 250);
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

    // Step 1: 获取字幕（快速，<30s）
    async function loadTranscript(): Promise<{ metadata: VideoMetadata; transcript: TranscriptSegment[] } | null> {
      setLoading(true);
      setError(null);

      try {
        const transcriptRes = await fetch("/api/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
        const transcriptPayload = (await transcriptRes.json()) as JsonResponse<TranscriptPayload>;

        if (cancelled) return null;

        if (!transcriptPayload.ok) {
          setError(transcriptPayload.error.message);
          setErrorCode(transcriptPayload.error.code ?? null);
          setLoading(false);
          return null;
        }

        // 立即展示字幕和元数据
        setMetadata(transcriptPayload.data.metadata);
        setTranscript(transcriptPayload.data.transcript);
        setLoading(false);

        return { metadata: transcriptPayload.data.metadata, transcript: transcriptPayload.data.transcript };
      } catch {
        if (!cancelled) {
          setError("无法解析此视频，请确认链接有效后重试。");
          setLoading(false);
        }
        return null;
      }
    }

    // Step 2: AI 分析（可能较慢，<120s）
    async function loadAnalysis(metadata: VideoMetadata, transcript: TranscriptSegment[]): Promise<AnalyzePayload | null> {
      try {
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, title: metadata.title, transcript }),
        });
        const analyzePayload = (await analyzeRes.json()) as JsonResponse<AnalyzePayload>;

        if (cancelled) return null;

        if (analyzePayload.ok) {
          setAnalysis(analyzePayload.data.analysis);
          return analyzePayload.data;
        } else {
          setError(analyzePayload.error.message);
          setErrorCode(analyzePayload.error.code ?? null);
          return null;
        }
      } catch {
        if (!cancelled) {
          setError("AI 分析失败，请重试。");
        }
        return null;
      }
    }

    // Step 3: 从 analyze 结果提取 moments + takeaways，或 fallback 到独立 API
    async function loadMomentsAndSummary(analyzeData: AnalyzePayload | null) {
      setMomentsLoading(true);
      setSummaryLoading(true);

      // 优先从 comprehensive 结果直接提取
      if (analyzeData?.comprehensive) {
        const c = analyzeData.comprehensive;
        if (c.moments && c.moments.length > 0) {
          setMoments(c.moments.map((m) => ({
            title: m.title,
            title_zh: m.title_zh ?? m.title,
            timestamp: m.timestamp,
            quote: m.quote,
            quote_zh: m.quote_zh ?? m.quote,
            reason: m.reason,
            reason_zh: m.reason_zh ?? m.reason,
          })));
        }
        setMomentsLoading(false);

        if (c.takeaways && c.takeaways.length > 0) {
          setTakeaways(c.takeaways.map((t) => ({
            label: t.label,
            label_zh: t.label_zh ?? t.label,
            insight: t.insight,
            insight_zh: t.insight_zh ?? t.insight,
            timestamps: t.timestamps ?? [],
          })));
        }
        setSummaryLoading(false);
        return;
      }

      // Fallback：并行请求独立 API
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
          if (payload.ok) {
            setMoments(payload.data.moments);
          }
        } catch {
          // ignore
        }
      }
      setMomentsLoading(false);

      if (summaryRes.status === "fulfilled") {
        try {
          const payload = (await summaryRes.value.json()) as JsonResponse<{
            takeaways: SummaryTakeaway[];
            _debug?: GenerationDebug;
          }>;
          if (payload.ok) {
            setTakeaways(payload.data.takeaways);
          }
        } catch {
          // ignore
        }
      }
      setSummaryLoading(false);
    }

    // 编排：字幕 → 分析 → 从分析结果提取或 fallback
    async function loadAll() {
      const result = await loadTranscript();
      if (cancelled || !result) {
        setMomentsLoading(false);
        setSummaryLoading(false);
        return;
      }

      // Step 2: 分析
      const analyzeData = await loadAnalysis(result.metadata, result.transcript);

      if (cancelled) return;

      // Step 3: 从分析结果提取 moments/summary，或 fallback
      await loadMomentsAndSummary(analyzeData);
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
    if (hasCompleteTranslation(transcript)) return;

    setTranslating(true);
    setTranslationError(null);
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
        } else {
          setTranslationError(payload.error?.message ?? "翻译失败，请稍后重试。");
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
      let receivedTranslation = false;

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
              receivedTranslation = true;
              setTranscript((prev) =>
                prev.map((s) =>
                  s.startTime === startTime ? { ...s, text_zh } : s
                )
              );
            } else if (event.type === "done") {
              if (!receivedTranslation || event.data?.translatedCount === 0) {
                setTranslationError("未生成可用翻译，请稍后重试。");
              }
              setTranslating(false);
            } else if (event.type === "error") {
              console.error("[Translate] 服务端错误:", event.data?.message);
              setTranslationError(event.data?.message ?? "翻译失败，请稍后重试。");
              setTranslating(false);
            }
          } catch {
            // 忽略解析失败的行
          }
        }
      }
    } catch (err) {
      console.error("[Translate] 翻译请求失败:", err);
      setTranslationError("翻译请求失败，请稍后重试。");
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
      <main ref={mainRef} className="mx-auto w-full max-w-full px-3 pt-16 pb-20 sm:px-5 sm:pt-20 md:max-w-[85%] lg:max-w-[80%] md:pb-16">
        <div className="grid gap-4 md:gap-6 md:grid-cols-[1fr_auto]">
          {/* 左侧：视频 + 章节列表 + 核心摘要 */}
          <div className="min-w-0 space-y-6">
            {/* 视频播放器 */}
            <VideoPlayer
              ref={playerRef}
              videoId={videoId}
              metadata={metadata}
              fallbackTitle={error ? "视频信息加载失败" : undefined}
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
                translationError={translationError}
                chatEnabled={transcript.length > 0}
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
                translationError={translationError}
                chatEnabled={transcript.length > 0}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
