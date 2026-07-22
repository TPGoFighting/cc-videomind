"use client";

import { useState } from "react";
import { FileText, Flame, MessageSquare, NotebookPen } from "lucide-react";
import { TranscriptViewer } from "./transcript-viewer";
import { ChatPanel } from "./chat-panel";
import { NotesPanel } from "./notes-panel";
import Link from "next/link";
import type { DisplayMode, TranscriptSegment, VideoAnalysis, WordDefinition } from "@/lib/types";

interface SidebarTabsProps {
  videoId: string;
  transcript: TranscriptSegment[];
  transcriptLoading: boolean;
  currentTime?: number;
  analysis: VideoAnalysis | null;
  displayMode?: DisplayMode;
  onDisplayModeChange?: (mode: DisplayMode) => void;
  wordDefinitions?: Map<string, WordDefinition>;
  onSaveWord?: (lemma: string, startTime?: number) => Promise<boolean>;
  onSaveQuote?: (segment: TranscriptSegment) => Promise<boolean>;
  onSeekTo?: (seconds: number) => void;
  translating?: boolean;
  translationError?: string | null;
  onRetryTranslation?: () => void;
  saveNotice?: string | null;
  chatEnabled: boolean;
}

type TabId = "transcript" | "chat" | "notes" | "review";

const TABS = [
  { id: "transcript" as TabId, label: "转录文本", icon: FileText },
  { id: "chat" as TabId, label: "提问", icon: MessageSquare },
  { id: "notes" as TabId, label: "笔记", icon: NotebookPen },
  { id: "review" as TabId, label: "复习", icon: Flame },
] as const;

export function SidebarTabs({
  videoId,
  transcript,
  transcriptLoading,
  currentTime,
  analysis,
  displayMode,
  onDisplayModeChange,
  wordDefinitions,
  onSaveWord,
  onSaveQuote,
  onSeekTo,
  translating,
  translationError,
  onRetryTranslation,
  saveNotice,
  chatEnabled,
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("transcript");

  return (
    <div className="flex h-full flex-col rounded-[0.875rem] border border-[var(--tp-border)] bg-[var(--tp-surface)]">
      {/* 标签页头部 */}
      <div className="flex items-center gap-1 border-b border-[var(--tp-border)] px-2 py-2" role="tablist" aria-label="视频学习功能">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`desktop-video-tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`desktop-video-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-[rgba(91,168,255,0.12)] text-[var(--tp-accent)]"
                  : "text-[var(--tp-text-muted)] hover:bg-white/5 hover:text-[var(--tp-text)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div id="desktop-video-panel-transcript" role="tabpanel" aria-labelledby="desktop-video-tab-transcript" hidden={activeTab !== "transcript"} className="h-full">
            <TranscriptViewer
              transcript={transcript}
              loading={transcriptLoading}
              currentTime={currentTime}
              hideHeader
              displayMode={displayMode}
              onDisplayModeChange={onDisplayModeChange}
              wordDefinitions={wordDefinitions}
              onSaveWord={onSaveWord}
              onSaveQuote={onSaveQuote}
              onSeekTo={onSeekTo}
              translating={translating}
              translationError={translationError}
              onRetryTranslation={onRetryTranslation}
              saveNotice={saveNotice}
            />
        </div>
        <div id="desktop-video-panel-chat" role="tabpanel" aria-labelledby="desktop-video-tab-chat" hidden={activeTab !== "chat"} className="h-full overflow-auto p-4">
            <ChatPanel
              videoId={videoId}
              suggestedQuestions={analysis?.suggestedQuestions ?? []}
              compact
              onSeekTo={onSeekTo}
              disabled={!chatEnabled}
            />
        </div>
        <div id="desktop-video-panel-notes" role="tabpanel" aria-labelledby="desktop-video-tab-notes" hidden={activeTab !== "notes"} className="h-full overflow-auto p-4">
            <NotesPanel videoId={videoId} compact />
        </div>
        <div id="desktop-video-panel-review" role="tabpanel" aria-labelledby="desktop-video-tab-review" hidden={activeTab !== "review"} className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <Flame className="h-10 w-10 text-[var(--tp-accent)]" aria-hidden />
            <p className="text-[15px] font-medium text-[var(--tp-text)]">今日复习</p>
            <p className="text-[13px] leading-6 text-[var(--tp-text-muted)]">
              保存词句后，系统会安排下一次回看<br/>从复习页回到原视频语境
            </p>
            <Link
              href="/review"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[var(--tp-accent)] px-5 text-[14px] font-semibold text-[#08101a] transition-colors hover:bg-[var(--tp-accent-hover)]"
            >
              开始复习
            </Link>
        </div>
      </div>
    </div>
  );
}
