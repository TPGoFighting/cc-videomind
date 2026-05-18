"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { HighlightsPanel } from "@/components/highlights-panel";
import { NotesPanel } from "@/components/notes-panel";
import { SummaryPanel } from "@/components/summary-panel";
import { TranscriptViewer } from "@/components/transcript-viewer";
import { VideoPlayer } from "@/components/video-player";
import type {
  JsonResponse,
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
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
          return;
        }

        setMetadata(payload.data.metadata);
        setTranscript(payload.data.transcript);
        setAnalysis(payload.data.analysis);
      } catch {
        if (!cancelled) {
          setError("无法解析此视频，请确认链接有效后重试。");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
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
            ← VideoMind
          </Link>
        </div>
      </div>

      {/* 主内容 */}
      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          {/* 左侧：视频 + 摘要 + 转录 */}
          <div className="space-y-6">
            <VideoPlayer videoId={videoId} metadata={metadata} />

            {error ? (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/8 p-4 text-[14px] font-medium text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {error}
              </div>
            ) : null}

            <SummaryPanel analysis={analysis} loading={loading} />
            <TranscriptViewer transcript={transcript} loading={loading} />
          </div>

          {/* 右侧：要点 + 问答 + 笔记 */}
          <aside className="space-y-6 lg:sticky lg:top-[4.5rem] lg:self-start">
            <HighlightsPanel
              highlights={analysis?.highlights ?? []}
              loading={loading}
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
