"use client";

import { useState } from "react";
import { FileText, MessageSquare, NotebookPen } from "lucide-react";
import { TranscriptViewer } from "./transcript-viewer";
import { ChatPanel } from "./chat-panel";
import { NotesPanel } from "./notes-panel";
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
}: SidebarTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("transcript");

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/8 bg-[#0d0d0d]">
      {/* 标签页头部 */}
      <div className="flex items-center gap-1 border-b border-white/8 px-2 py-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 标签页内容 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "transcript" && (
          <div className="h-full">
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
          </div>
        )}
        {activeTab === "chat" && (
          <div className="h-full overflow-auto p-4">
            <ChatPanel
              videoId={videoId}
              suggestedQuestions={analysis?.suggestedQuestions ?? []}
              compact
              onSeekTo={onSeekTo}
            />
          </div>
        )}
        {activeTab === "notes" && (
          <div className="h-full overflow-auto p-4">
            <NotesPanel videoId={videoId} compact />
          </div>
        )}
      </div>
    </div>
  );
}
