"use client";

import { useState } from "react";
import { FileText, MessageSquare, NotebookPen } from "lucide-react";
import { TranscriptViewer } from "./transcript-viewer";
import { ChatPanel } from "./chat-panel";
import { NotesPanel } from "./notes-panel";
import { cn } from "@/lib/utils/cn";
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
  onSaveWord?: (lemma: string) => Promise<boolean>;
  onSaveQuote?: (segment: TranscriptSegment) => Promise<boolean>;
  onSeekTo?: (seconds: number) => void;
  translating?: boolean;
}

type TabId = "transcript" | "chat" | "notes";

const TABS = [
  { id: "transcript" as TabId, label: "转录文本", icon: FileText },
  { id: "chat" as TabId, label: "Chat", icon: MessageSquare },
  { id: "notes" as TabId, label: "笔记", icon: NotebookPen },
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
}: MobileVideoTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("transcript");

  return (
    <div className="rounded-xl border border-white/8 bg-[#0d0d0d] overflow-hidden">
      {/* 标签页头部 */}
      <div className="flex border-b border-white/8 bg-[#0d0d0d]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 px-3 py-3",
                "text-[13px] font-medium transition-all duration-200 min-h-[44px]",
                "border-b-2",
                isActive
                  ? "border-[#0099ff] text-[#0099ff]"
                  : "border-transparent text-white/50 hover:text-white/70"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 内容区 */}
      <div className="min-h-[300px]" key={activeTab}>
        <div className="tab-enter">
        {activeTab === "transcript" && (
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
          />
        )}
        {activeTab === "chat" && (
          <div className="p-4">
            <ChatPanel
              videoId={videoId}
              suggestedQuestions={analysis?.suggestedQuestions ?? []}
              compact
              onSeekTo={onSeekTo}
            />
          </div>
        )}
        {activeTab === "notes" && (
          <div className="p-4">
            <NotesPanel videoId={videoId} compact />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
