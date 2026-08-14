"use client";

import { useRef, useState } from "react";
import { FileText, Flame, MessageSquare, NotebookPen } from "lucide-react";
import { TranscriptViewer } from "./transcript-viewer";
import { ChatPanel } from "./chat-panel";
import { NotesPanel } from "./notes-panel";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { getNextTabIndex, isTabNavigationKey } from "@/lib/accessibility/tabs";
import type { DisplayMode, TranscriptSegment, VideoAnalysis, WordDefinition } from "@/lib/types";

interface MobileVideoTabsProps {
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

export function MobileVideoTabs({
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
}: MobileVideoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("transcript");
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (!isTabNavigationKey(event.key)) return;

    event.preventDefault();
    const nextIndex = getNextTabIndex(currentIndex, event.key, TABS.length);
    setActiveTab(TABS[nextIndex].id);
    tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus();
  };

  return (
    <div className="overflow-hidden rounded-[0.875rem] border border-[var(--tp-border)] bg-[var(--tp-surface)]">
      {/* 标签页头部 */}
      <div ref={tabListRef} className="flex border-b border-[var(--tp-border)] bg-[var(--tp-surface)]" role="tablist" aria-label="视频学习功能">
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`mobile-video-tab-${tab.id}`}
              role="tab"
              aria-label={tab.label}
              aria-selected={isActive}
              aria-controls={`mobile-video-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-3",
                "min-h-11 text-[13px] font-medium transition-colors duration-200",
                "border-b-2",
                isActive
                  ? "border-[var(--tp-accent)] text-[var(--tp-accent)]"
                  : "border-transparent text-[var(--tp-text-muted)] hover:text-[var(--tp-text)]"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[300px]">
        <div id="mobile-video-panel-transcript" role="tabpanel" aria-labelledby="mobile-video-tab-transcript" hidden={activeTab !== "transcript"}>
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
        <div id="mobile-video-panel-chat" role="tabpanel" aria-labelledby="mobile-video-tab-chat" hidden={activeTab !== "chat"}>
          <div className="p-4">
            <ChatPanel
              videoId={videoId}
              suggestedQuestions={analysis?.suggestedQuestions ?? []}
              compact
              onSeekTo={onSeekTo}
              disabled={!chatEnabled}
            />
          </div>
        </div>
        <div id="mobile-video-panel-notes" role="tabpanel" aria-labelledby="mobile-video-tab-notes" hidden={activeTab !== "notes"}>
          <div className="p-4">
            <NotesPanel videoId={videoId} compact />
          </div>
        </div>
        <div id="mobile-video-panel-review" role="tabpanel" aria-labelledby="mobile-video-tab-review" hidden={activeTab !== "review"}>
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <Flame className="mt-8 h-10 w-10 text-[var(--tp-accent)]" aria-hidden />
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
    </div>
  );
}
