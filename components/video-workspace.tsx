"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { AlertCircle, ArrowLeft, CircleCheck, Info } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { HighlightsPanel } from "@/components/highlights-panel";
import { MobileVideoTabs } from "@/components/mobile-video-tabs";
import { SidebarTabs } from "@/components/sidebar-tabs";
import { SummaryPanel } from "@/components/summary-panel";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player";
import { useDisplayMode } from "@/lib/hooks/useDisplayMode";
import { useWordDefinitions } from "@/lib/hooks/useWordDefinitions";
import {
  WORKSPACE_FIXTURE,
  type WorkspaceFixtureState,
} from "@/lib/video/workspace-fixture";
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

export function VideoWorkspace({
  videoId,
  fixtureState,
}: {
  videoId: string;
  fixtureState?: WorkspaceFixtureState;
}) {
  const fixtureHasTranscript = fixtureState === "ready" || fixtureState === "partial";
  const [metadata, setMetadata] = useState<VideoMetadata | undefined>(
    fixtureState && fixtureState !== "failure" ? WORKSPACE_FIXTURE.metadata : undefined
  );
  const [transcript, setTranscript] = useState<TranscriptSegment[]>(
    fixtureHasTranscript ? [...WORKSPACE_FIXTURE.transcript] : []
  );
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(
    fixtureState === "ready" ? WORKSPACE_FIXTURE.analysis : null
  );
  const [loading, setLoading] = useState(fixtureState ? fixtureState === "loading" : true);
  const [transcriptError, setTranscriptError] = useState<string | null>(
    fixtureState === "failure" ? "这条视频没有可用字幕，暂时无法建立学习工作台。" : null
  );
  const [errorCode, setErrorCode] = useState<string | null>(
    fixtureState === "failure" ? "NO_CAPTION_TRACKS" : null
  );
  const [analysisNotice, setAnalysisNotice] = useState<string | null>(
    fixtureState === "partial" ? "字幕已经可以学习；深入解析暂时不可用，稍后可再试。" : null
  );

  // 要点时刻 + 核心摘要（独立数据源）
  const [moments, setMoments] = useState<KeyMoment[]>(
    fixtureState === "ready" ? [...WORKSPACE_FIXTURE.moments] : []
  );
  const [takeaways, setTakeaways] = useState<SummaryTakeaway[]>(
    fixtureState === "ready" ? [...WORKSPACE_FIXTURE.takeaways] : []
  );
  const [momentsLoading, setMomentsLoading] = useState(fixtureState ? fixtureState === "loading" : true);
  const [summaryLoading, setSummaryLoading] = useState(fixtureState ? fixtureState === "loading" : true);

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
  const wordDefinitions = useWordDefinitions(transcript, !fixtureState);

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
      transcriptError,
      analysisNotice,
    });
  }, [momentsLoading, summaryLoading, loading, moments.length, takeaways.length, transcriptError, analysisNotice]);

  useEffect(() => {
    if (fixtureState) return;
    let cancelled = false;

    // Step 1: 获取字幕（快速，<30s）
    async function loadTranscript(): Promise<{ metadata: VideoMetadata; transcript: TranscriptSegment[] } | null> {
      setLoading(true);
      setTranscriptError(null);

      try {
        const transcriptRes = await fetch("/api/transcript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId }),
        });
        const transcriptPayload = (await transcriptRes.json()) as JsonResponse<TranscriptPayload>;

        if (cancelled) return null;

        if (!transcriptPayload.ok) {
          setTranscriptError(transcriptPayload.error.message);
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
          setTranscriptError("无法解析此视频，请确认链接有效后重试。");
          setLoading(false);
        }
        return null;
      }
    }

    // Step 2: AI 分析（可能较慢，<120s）
    async function loadAnalysis(metadata: VideoMetadata, transcript: TranscriptSegment[]): Promise<AnalyzePayload | null> {
      setAnalysisNotice(null);
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
          setAnalysisNotice("字幕已经可以学习；深入解析暂时不可用，稍后可再试。");
          return null;
        }
      } catch {
        if (!cancelled) {
          setAnalysisNotice("字幕已经可以学习；深入解析暂时不可用，稍后可再试。");
        }
        return null;
      }
    }

    // Step 3: 从 analyze 结果提取 moments + takeaways，或 fallback 到独立 API
    async function loadMomentsAndSummary(analyzeData: AnalyzePayload | null) {
      setMomentsLoading(true);
      setSummaryLoading(true);

      // 字幕成功但主分析失败时，保留可用工作台，不再自动触发两次额外 AI 请求。
      if (!analyzeData) {
        setMomentsLoading(false);
        setSummaryLoading(false);
        return;
      }

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
  }, [fixtureState, videoId]);

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
    if (fixtureState) return true;
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
  }, [fixtureState, videoId]);

  // 收藏句子
  const handleSaveQuote = useCallback(async (segment: TranscriptSegment): Promise<boolean> => {
    if (fixtureState) return true;
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
  }, [fixtureState, videoId]);

  const showLearningPanels = loading || transcript.length > 0;

  return (
    <div className="min-h-screen bg-[var(--tp-bg)] text-[var(--tp-text)]">
      <Navbar />

      <main ref={mainRef} className="mx-auto w-full max-w-[90rem] px-4 pb-24 pt-20 sm:px-6 md:pb-16 md:pt-24 lg:px-8">
        <header className="mb-5 flex flex-col gap-4 border-b border-[var(--tp-border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/explore" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--tp-text-muted)] transition-colors hover:text-[var(--tp-text)]">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              返回学习选题
            </Link>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tp-accent)]">学习工作台</p>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--tp-text-muted)]">先读字幕与出处，再看提炼结果；每个要点都保留回到原视频的时间位置。</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--tp-text-muted)]" aria-label="工作台原则">
            <span className="inline-flex min-h-8 items-center rounded-full border border-[var(--tp-border)] px-3">字幕优先</span>
            <span className="inline-flex min-h-8 items-center rounded-full border border-[var(--tp-border)] px-3">出处可回看</span>
            {fixtureState ? <span className="inline-flex min-h-8 items-center rounded-full border border-[rgba(91,168,255,0.4)] bg-[rgba(91,168,255,0.1)] px-3 text-[var(--tp-accent)]">本地状态：{fixtureState}</span> : null}
          </div>
        </header>

        <div className={showLearningPanels
          ? "grid gap-5 md:grid-cols-[minmax(0,1fr)_18rem] lg:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]"
          : "grid max-w-4xl gap-5"
        }>
          {/* 左侧：视频 + 章节列表 + 核心摘要 */}
          <div className="min-w-0 space-y-6">
            {/* 视频播放器 */}
            <VideoPlayer
              ref={playerRef}
              videoId={videoId}
              metadata={metadata}
              fallbackTitle={transcriptError ? "视频信息加载失败" : undefined}
              previewOnly={Boolean(fixtureState)}
            />

            {loading ? (
              <div role="status" aria-live="polite" className="flex items-start gap-3 rounded-[0.875rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-4 text-sm leading-6 text-[var(--tp-text-secondary)]">
                <Info className="mt-1 h-4 w-4 shrink-0 text-[var(--tp-accent)]" aria-hidden />
                <div>
                  <p className="font-semibold text-[var(--tp-text)]">正在读取字幕</p>
                  <p>先确认视频来源与字幕可用性；理解提炼会在字幕出现后继续。</p>
                </div>
              </div>
            ) : null}

            {transcriptError ? (
              <div role="alert" className="rounded-[0.875rem] border border-red-400/25 bg-red-400/[0.07] p-4 sm:p-5">
                <div className="flex items-start gap-3 text-sm font-medium leading-6 text-red-300">
                  <AlertCircle className="mt-1 h-4 w-4 shrink-0" aria-hidden />
                  <div>
                    <p>{transcriptError}</p>
                    <p className="mt-1 font-normal text-[var(--tp-text-muted)]">
                      {errorCode === "NO_CAPTION_TRACKS"
                        ? "可以换一条带英文字幕的视频，或先在 YouTube 检查字幕是否开启。"
                        : "输入内容仍可保留；请稍后重试，或换一条已核对的视频。"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/explore" className="inline-flex min-h-11 items-center rounded-lg bg-[var(--tp-text)] px-4 text-sm font-semibold text-[var(--tp-bg)] transition-colors hover:bg-white">
                    选择其他视频
                  </Link>
                  <a href={`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--tp-border-strong)] px-4 text-sm font-semibold text-[var(--tp-text)] transition-colors hover:bg-white/8">
                    在 YouTube 检查
                  </a>
                  {errorCode === "quota_exceeded" ? (
                    <Link href={`/login?next=${encodeURIComponent(`/video/${videoId}`)}`} className="inline-flex min-h-11 items-center rounded-lg border border-[var(--tp-border-strong)] px-4 text-sm font-semibold text-[var(--tp-text)] transition-colors hover:bg-white/8">
                      立即登录
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {analysisNotice ? (
              <div role="status" className="flex items-start gap-3 rounded-[0.875rem] border border-[var(--tp-border-strong)] bg-[var(--tp-surface)] p-4 text-sm leading-6 text-[var(--tp-text-secondary)]">
                <Info className="mt-1 h-4 w-4 shrink-0 text-[var(--tp-accent)]" aria-hidden />
                <div>
                  <p className="font-semibold text-[var(--tp-text)]">字幕已就绪</p>
                  <p>{analysisNotice}</p>
                </div>
              </div>
            ) : null}

            {!loading && !transcriptError && transcript.length === 0 ? (
              <div role="status" className="rounded-[0.875rem] border border-[var(--tp-border)] bg-[var(--tp-surface)] p-5">
                <div className="flex items-start gap-3">
                  <CircleCheck className="mt-1 h-4 w-4 shrink-0 text-[var(--tp-accent)]" aria-hidden />
                  <div>
                    <h2 className="font-semibold text-[var(--tp-text)]">暂时没有可读字幕</h2>
                    <p className="mt-1 text-sm leading-6 text-[var(--tp-text-muted)]">工作台不会用空白结果冒充分析。请换一条带字幕的视频，或稍后重试。</p>
                    <Link href="/explore" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--tp-accent)]">查看已核对视频</Link>
                  </div>
                </div>
              </div>
            ) : null}

            {/* 移动端：标签页切换（转录文本 / Chat / 笔记） */}
            {showLearningPanels ? <div className="mt-6 md:hidden">
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
            </div> : null}

            {showLearningPanels ? (
              <>
                <HighlightsPanel
                  moments={moments}
                  loading={momentsLoading}
                  onSeekTo={handleSeekTo}
                />
                <SummaryPanel
                  takeaways={takeaways}
                  loading={summaryLoading}
                  onSeekTo={handleSeekTo}
                />
              </>
            ) : null}
          </div>

          {/* 右侧：标签页（转录文本 / Chat / 笔记） */}
          {showLearningPanels ? <aside className="hidden md:sticky md:top-20 md:block md:self-start">
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
          </aside> : null}
        </div>
      </main>
    </div>
  );
}
