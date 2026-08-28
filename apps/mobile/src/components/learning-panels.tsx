import { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Crosshair } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { formatTime, parseTimestampRange, type ChatAnswer, type DisplayMode, type KeyMoment, type SummaryTakeaway, type TranscriptSegment, type VideoAnalysis } from "@teach-player/shared";
import { postChat, postNote } from "@/lib/api";
import { useStorageState } from "@/hooks/use-storage-state";
import { cacheKey } from "@/lib/storage";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Button, MutedText, SectionTitle, StatusMessage } from "./ui";
import { DisplayModeToggle, TranscriptList } from "./transcript-list";
import { LocalIcon, type LocalIconName } from "./local-icon";

type Panel = "transcript" | "moments" | "summary" | "chat" | "notes";

const tabs: Array<{ id: Panel; label: string; icon: LocalIconName }> = [
  { id: "transcript", label: "字幕", icon: "transcript" },
  { id: "moments", label: "要点", icon: "moments" },
  { id: "summary", label: "摘要", icon: "summary" },
  { id: "chat", label: "问答", icon: "panelChat" },
  { id: "notes", label: "笔记", icon: "notes" },
];

export function LearningPanels({
  videoId,
  transcript,
  analysis,
  moments,
  takeaways,
  currentTime,
  onSeekTo,
  momentsError,
  summaryError,
  videoTitle,
  thumbnailUrl,
}: {
  videoId: string;
  transcript: TranscriptSegment[];
  analysis: VideoAnalysis | null;
  moments: KeyMoment[];
  takeaways: SummaryTakeaway[];
  currentTime: number;
  onSeekTo: (seconds: number) => void;
  momentsError?: string | null;
  summaryError?: string | null;
  videoTitle?: string;
  thumbnailUrl?: string;
}) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [active, setActive] = useState<Panel>("transcript");
  const [autoFollow, setAutoFollow] = useState(true);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("bilingual");

  return (
    <View style={{
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      padding: 10,
      gap: 10,
      flex: 1,
      minHeight: 0,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {/* 面板按钮使用图标，保留辅助功能标签，避免占用字幕空间 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.full }}
          contentContainerStyle={{ gap: 2, padding: 2 }}
        >
          {tabs.map((tab) => {
            const selected = tab.id === active;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={`打开${tab.label}面板`}
                onPress={() => { haptics.selection(); setActive(tab.id); }}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: theme.radius.full,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: selected ? theme.colors.accent : "transparent",
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                })}
              >
                <LocalIcon name={tab.icon} size={16} color={selected ? "#0A1A00" : theme.colors.muted} />
              </Pressable>
            );
          })}
        </ScrollView>

        <DisplayModeToggle compact mode={displayMode} onChange={setDisplayMode} />

        {/* 自动跟随按钮 */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: autoFollow }}
          accessibilityLabel={autoFollow ? "关闭字幕自动跟随" : "开启字幕自动跟随"}
          onPress={() => {
            haptics.selection();
            setAutoFollow((value) => !value);
          }}
          style={({ pressed }) => ({
            width: 48,
            height: 48,
            borderRadius: theme.radius.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: autoFollow ? `${theme.colors.blue}22` : theme.colors.surfaceRaised,
            borderWidth: 1,
            borderColor: autoFollow ? `${theme.colors.blue}88` : theme.colors.border,
            transform: [{ scale: pressed ? 0.94 : 1 }],
            flexShrink: 0,
          })}
        >
          <Crosshair size={16} color={autoFollow ? theme.colors.blue : theme.colors.muted} strokeWidth={2.5} />
        </Pressable>
      </View>

      <Animated.View entering={FadeIn.duration(200)} key={active} style={{ flex: 1, minHeight: 0 }}>
        {active === "transcript" ? (
          <TranscriptList
            videoId={videoId}
            transcript={transcript}
            currentTime={currentTime}
            onSeekTo={onSeekTo}
            autoFollow={autoFollow}
            onAutoFollowChange={setAutoFollow}
            displayMode={displayMode}
            videoTitle={videoTitle}
            thumbnailUrl={thumbnailUrl}
          />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {active === "moments" ? <MomentsPanel moments={moments} error={momentsError} onSeekTo={onSeekTo} /> : null}
            {active === "summary" ? <SummaryPanel analysis={analysis} takeaways={takeaways} error={summaryError} onSeekTo={onSeekTo} /> : null}
            {active === "chat" ? <ChatPanel videoId={videoId} suggestedQuestions={analysis?.suggestedQuestions ?? []} onSeekTo={onSeekTo} /> : null}
            {active === "notes" ? <NotesPanel videoId={videoId} currentTime={currentTime} /> : null}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function MomentsPanel({ moments, error, onSeekTo }: { moments: KeyMoment[]; error?: string | null; onSeekTo: (seconds: number) => void }) {
  const { theme } = useTheme();
  if (moments.length === 0) {
    return error ? (
      <StatusMessage tone="danger">视频要点暂时不可用：{error}</StatusMessage>
    ) : <MutedText>深度解析完成后会显示视频要点。</MutedText>;
  }
  return (
    <View style={{ gap: 10 }}>
      {error ? <StatusMessage tone="danger">部分视频要点加载失败，当前显示已有内容：{error}</StatusMessage> : null}
      {moments.map((moment, index) => {
        const range = parseTimestampRange(moment.timestamp);
        return (
          <Animated.View
            key={`${moment.timestamp}-${moment.title}`}
            entering={FadeIn.delay(index * 50).duration(200)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`跳转到视频要点：${moment.title_zh ?? moment.title}`}
              onPress={() => { if (range) onSeekTo(range.startTime); }}
              style={{
                minHeight: 56,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceRaised,
                padding: 12,
                gap: 6,
              }}
            >
              <Text style={{ color: theme.colors.warm, fontSize: 12, fontWeight: "800" }}>{moment.timestamp}</Text>
              <Text selectable style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800" }}>{moment.title_zh ?? moment.title}</Text>
              <Text selectable style={{ color: theme.colors.muted, lineHeight: 20 }}>{moment.reason_zh ?? moment.reason}</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

function SummaryPanel({ analysis, takeaways, error, onSeekTo }: { analysis: VideoAnalysis | null; takeaways: SummaryTakeaway[]; error?: string | null; onSeekTo: (seconds: number) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>核心摘要</SectionTitle>
      {error ? <StatusMessage tone="danger">摘要暂时不可用：{error}</StatusMessage> : null}
      <MutedText>{analysis?.summary ?? "深度解析完成后会显示摘要。"}</MutedText>
      {takeaways.map((item, index) => {
        const timestamps = item.timestamps ?? [];
        return (
          <Animated.View
            key={`${item.label}-${timestamps.join(",")}`}
            entering={FadeIn.delay(index * 50).duration(200)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`跳转到摘要要点：${item.label_zh ?? item.label}`}
              onPress={() => {
                if (timestamps[0]) {
                  onSeekTo(timestampToSeconds(timestamps[0]));
                }
              }}
              style={{ borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceRaised, padding: 12, gap: 6 }}
            >
              <Text selectable style={{ color: theme.colors.text, fontWeight: "800", fontSize: 15 }}>{item.label_zh ?? item.label}</Text>
              <Text selectable style={{ color: theme.colors.muted, lineHeight: 20 }}>{item.insight_zh ?? item.insight}</Text>
              {timestamps.length > 0 ? (
                <Text style={{ color: theme.colors.accent, fontVariant: ["tabular-nums"], fontSize: 12 }}>{timestamps.join(" -> ")}</Text>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

function ChatPanel({ videoId, suggestedQuestions, onSeekTo }: { videoId: string; suggestedQuestions: string[]; onSeekTo: (seconds: number) => void }) {
  const { theme } = useTheme();
  const { accessToken } = useAuth();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ChatAnswer | null>(null);
  const mutation = useMutation({
    mutationFn: () => postChat(videoId, question, accessToken),
    onSuccess: setAnswer,
  });

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>视频问答</SectionTitle>
      <TextInput
        accessibilityLabel="视频问题"
        placeholder="输入关于这个视频的问题"
        placeholderTextColor={theme.colors.subtle}
        value={question}
        onChangeText={setQuestion}
        multiline
        style={{
          minHeight: 96,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceRaised,
          color: theme.colors.text,
          padding: 12,
          textAlignVertical: "top",
        }}
      />
      <Button title="提问" loading={mutation.isPending} disabled={question.trim().length < 3} onPress={() => mutation.mutate()} />
      {suggestedQuestions.length > 0 ? (
        <View style={{ gap: 8 }}>
          {suggestedQuestions.slice(0, 3).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`使用推荐问题：${item}`}
              onPress={() => setQuestion(item)}
              style={{ minHeight: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceRaised, padding: 12 }}
            >
              <Text style={{ color: theme.colors.muted }}>{item}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {mutation.error instanceof Error ? <StatusMessage tone="danger">{mutation.error.message}</StatusMessage> : null}
      {answer ? (
        <View style={{ gap: 10 }}>
          <MutedText>{answer.answer}</MutedText>
          {answer.citations.map((citation) => (
            <Pressable
              key={`${citation.startTime}-${citation.quote}`}
              accessibilityRole="button"
              accessibilityLabel={`跳转到引用：${formatTime(citation.startTime)}`}
              onPress={() => onSeekTo(citation.startTime)}
              style={{ borderRadius: theme.radius.md, backgroundColor: `${theme.colors.success}18`, padding: 10 }}
            >
              <Text style={{ color: theme.colors.success, fontWeight: "800" }}>{formatTime(citation.startTime)}-{formatTime(citation.endTime)}</Text>
              <Text selectable style={{ color: theme.colors.text, lineHeight: 20 }}>{citation.quote}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function NotesPanel({ videoId, currentTime }: { videoId: string; currentTime: number }) {
  const { theme } = useTheme();
  const { accessToken, user } = useAuth();
  const [body, setBody, clearBody] = useStorageState(cacheKey(["note-draft", videoId]), "");
  const mutation = useMutation({
    mutationFn: () => postNote(videoId, body, Math.floor(currentTime), accessToken),
    onSuccess: () => clearBody(),
  });

  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>个人笔记</SectionTitle>
      {!user ? <StatusMessage>登录后可将笔记同步到你的账号。</StatusMessage> : null}
      <TextInput
        accessibilityLabel="笔记内容"
        placeholder="记录当前时间点的笔记"
        placeholderTextColor={theme.colors.subtle}
        value={body}
        onChangeText={setBody}
        multiline
        style={{
          minHeight: 120,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surfaceRaised,
          color: theme.colors.text,
          padding: 12,
          textAlignVertical: "top",
        }}
      />
      <Button
        title={`保存至 ${formatTime(currentTime)}`}
        disabled={!user || body.trim().length === 0}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
      {mutation.isSuccess ? <StatusMessage tone="success">笔记已保存。</StatusMessage> : null}
      {mutation.error instanceof Error ? <StatusMessage tone="danger">{mutation.error.message}</StatusMessage> : null}
    </View>
  );
}

function timestampToSeconds(value: string): number {
  if (!value) return 0;
  const parts = value.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) {
    return 0;
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}
