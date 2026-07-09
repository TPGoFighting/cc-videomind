import { useState, useEffect } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Crosshair } from "lucide-react-native";
import { useMutation } from "@tanstack/react-query";
import { formatTime, parseTimestampRange, type ChatAnswer, type KeyMoment, type SummaryTakeaway, type TranscriptSegment, type VideoAnalysis } from "@teach-player/shared";
import { postChat, postNote } from "@/lib/api";
import { useStorageState } from "@/hooks/use-storage-state";
import { cacheKey } from "@/lib/storage";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Button, MutedText, SectionTitle, StatusMessage } from "./ui";
import { TranscriptList } from "./transcript-list";
import { LocalIcon, type LocalIconName } from "./local-icon";

type Panel = "transcript" | "moments" | "summary" | "chat" | "notes";

const tabs: Array<{ id: Panel; label: string; icon: LocalIconName }> = [
  { id: "transcript", label: "Transcript", icon: "transcript" },
  { id: "moments", label: "Moments", icon: "moments" },
  { id: "summary", label: "Summary", icon: "summary" },
  { id: "chat", label: "Chat", icon: "panelChat" },
  { id: "notes", label: "Notes", icon: "notes" },
];

export function LearningPanels({
  videoId,
  transcript,
  analysis,
  moments,
  takeaways,
  currentTime,
  onSeekTo,
  translationStatus,
}: {
  videoId: string;
  transcript: TranscriptSegment[];
  analysis: VideoAnalysis | null;
  moments: KeyMoment[];
  takeaways: SummaryTakeaway[];
  currentTime: number;
  onSeekTo: (seconds: number) => void;
  translationStatus?: { total: number; translated: number; isTranslating: boolean };
}) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [active, setActive] = useState<Panel>("transcript");
  const [autoFollow, setAutoFollow] = useState(true);

  const activeIdx = tabs.findIndex((t) => t.id === active);

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {/* 时间标签 */}
        <View style={{
          height: 34,
          borderRadius: theme.radius.full,
          paddingHorizontal: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.colors.surfaceRaised,
          flexShrink: 0,
        }}>
          <Text style={{ color: theme.colors.muted, fontSize: 11, fontWeight: "900", fontVariant: ["tabular-nums"] }}>
            {formatTime(currentTime)}
          </Text>
        </View>

        {/* Tab 按钮组 */}
        <View style={{ flex: 1, height: 34, flexDirection: "row", backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.full, padding: 2, position: "relative", flexShrink: 1 }}>

          <View style={{ flex: 1, flexDirection: "row", gap: 5, justifyContent: "center" }}>
            {tabs.map((tab) => {
              const selected = tab.id === active;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Open ${tab.label}`}
                  onPress={() => { haptics.selection(); setActive(tab.id); }}
                  style={({ pressed }) => ({
                    width: 30,
                    height: 30,
                    borderRadius: theme.radius.full,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: selected ? theme.colors.accent : "transparent",
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  })}
                >
                  <LocalIcon name={tab.icon} size={16} color={selected ? "#0A1A00" : theme.colors.muted} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* 自动跟随按钮 */}
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: autoFollow }}
          accessibilityLabel={autoFollow ? "Disable auto follow" : "Enable auto follow"}
          onPress={() => {
            haptics.selection();
            setAutoFollow((value) => !value);
          }}
          style={({ pressed }) => ({
            width: 34,
            height: 34,
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


      {translationStatus ? (
        <View style={{
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surfaceRaised,
          paddingHorizontal: 10,
          paddingVertical: 7,
        }}>
          <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "700" }}>
            {translationStatus.isTranslating
              ? `字幕翻译 ${translationStatus.translated}/${translationStatus.total}`
              : `字幕翻译已缓存 ${translationStatus.total}/${translationStatus.total}`}
          </Text>
        </View>
      ) : null}

      <Animated.View entering={FadeIn.duration(200)} key={active} style={{ flex: 1, minHeight: 0 }}>
        {active === "transcript" ? (
          <TranscriptList
            videoId={videoId}
            transcript={transcript}
            currentTime={currentTime}
            onSeekTo={onSeekTo}
            autoFollow={autoFollow}
            onAutoFollowChange={setAutoFollow}
          />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
            {active === "moments" ? <MomentsPanel moments={moments} onSeekTo={onSeekTo} /> : null}
            {active === "summary" ? <SummaryPanel analysis={analysis} takeaways={takeaways} onSeekTo={onSeekTo} /> : null}
            {active === "chat" ? <ChatPanel videoId={videoId} suggestedQuestions={analysis?.suggestedQuestions ?? []} onSeekTo={onSeekTo} /> : null}
            {active === "notes" ? <NotesPanel videoId={videoId} currentTime={currentTime} /> : null}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

function MomentsPanel({ moments, onSeekTo }: { moments: KeyMoment[]; onSeekTo: (seconds: number) => void }) {
  const { theme } = useTheme();
  if (moments.length === 0) return <MutedText>Moments will appear after analysis completes.</MutedText>;
  return (
    <View style={{ gap: 10 }}>
      {moments.map((moment, index) => {
        const range = parseTimestampRange(moment.timestamp);
        return (
          <Animated.View 
            key={`${moment.timestamp}-${moment.title}`}
            entering={FadeIn.delay(index * 50).duration(200)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Jump to moment ${moment.title}`}
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

function SummaryPanel({ analysis, takeaways, onSeekTo }: { analysis: VideoAnalysis | null; takeaways: SummaryTakeaway[]; onSeekTo: (seconds: number) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <SectionTitle>Grounded summary</SectionTitle>
      <MutedText>{analysis?.summary ?? "Summary will appear after analysis completes."}</MutedText>
      {takeaways.map((item, index) => {
        const timestamps = item.timestamps ?? [];
        return (
          <Animated.View 
            key={`${item.label}-${timestamps.join(",")}`}
            entering={FadeIn.delay(index * 50).duration(200)}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Jump to takeaway ${item.label}`}
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
      <SectionTitle>Ask with citations</SectionTitle>
      <TextInput
        accessibilityLabel="Question"
        placeholder="Ask about this video"
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
      <Button title="Ask" loading={mutation.isPending} disabled={question.trim().length < 3} onPress={() => mutation.mutate()} />
      {suggestedQuestions.length > 0 ? (
        <View style={{ gap: 8 }}>
          {suggestedQuestions.slice(0, 3).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Use suggested question ${item}`}
              onPress={() => setQuestion(item)}
              style={{ minHeight: 44, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceRaised, padding: 12 }}
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
              accessibilityLabel={`Jump to citation at ${formatTime(citation.startTime)}`}
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
      <SectionTitle>Personal note</SectionTitle>
      {!user ? <StatusMessage>Sign in to save notes to your account.</StatusMessage> : null}
      <TextInput
        accessibilityLabel="Note body"
        placeholder="Write a note for this timestamp"
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
        title={`Save at ${formatTime(currentTime)}`}
        disabled={!user || body.trim().length === 0}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
      {mutation.isSuccess ? <StatusMessage tone="success">Note saved.</StatusMessage> : null}
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
