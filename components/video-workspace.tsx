"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { HighlightsPanel } from "@/components/highlights-panel";
import { NotesPanel } from "@/components/notes-panel";
import { SummaryPanel } from "@/components/summary-panel";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { VideoPlayer, type VideoPlayerHandle } from "@/components/video-player";
import type {
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

  const playerRef = useRef<VideoPlayerHandle>(null);

  const handleSeekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds);
  }, []);

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
      // 并行请求 moments 和 summary，各自错误独立处理
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
          }>;
          if (payload.ok) {
            setMoments(payload.data.moments);
          }
        } catch { /* moments 加载失败不影响其他功能 */ }
      }
      setMomentsLoading(false);

      if (summaryRes.status === "fulfilled") {
        try {
          const payload = (await summaryRes.value.json()) as JsonResponse<{
            takeaways: SummaryTakeaway[];
          }>;
          if (payload.ok) {
            setTakeaways(payload.data.takeaways);
          }
        } catch { /* summary 加载失败不影响其他功能 */ }
      }
      setSummaryLoading(false);
    }

    void load();
    void loadMomentsAndSummary();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* 顶部栏 */}
      <div className="sticky top-0 z-40 border-b border-white/8 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-7xl items-center px-5">
          <Link
            href="/"
            className="text-[14px] font-semibold tracking-[-0.01em] text-white/60 transition-colors hover:text-white"
          >
            &larr; VideoMind
          </Link>
        </div>
      </div>

      {/* 主内容 */}
      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          {/* 左侧：视频 + 摘要 + 转录 */}
          <div className="space-y-6">
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

            <SummaryPanel
              takeaways={takeaways}
              loading={summaryLoading}
              onSeekTo={handleSeekTo}
            />
            <TranscriptViewer transcript={transcript} loading={loading} />
          </div>

          {/* 右侧：要点时刻 + 问答 + 笔记 */}
          <aside className="space-y-6 lg:sticky lg:top-[4.5rem] lg:self-start">
            <HighlightsPanel
              moments={moments}
              loading={momentsLoading}
              onSeekTo={handleSeekTo}
            />
            <ChatPanel
              videoId={videoId}
              suggestedQuestions={analysis?.suggestedQuestions ?? []}
            />
            <NotesPanel videoId={videoId} />
          </aside>
        </div>
      </main>
    </div>
  );
}
