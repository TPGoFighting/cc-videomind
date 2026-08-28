import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  ZoomInEasyUp,
  ZoomOutEasyDown
} from "react-native-reanimated";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck, Crosshair, Sparkles, X, Share2 } from "lucide-react-native";
import { formatTime, type DisplayMode, type TranscriptSegment } from "@teach-player/shared";
import { GrammarCardModal } from "./grammar-card-modal";
import { QuoteShareCard } from "./quote-share-card";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { postQuote, postVocabulary, postWordDefinitions } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Button, MutedText } from "./ui";

// ─────────────────────────────────────────────────────────────────────────────
// DisplayModeToggle
// ─────────────────────────────────────────────────────────────────────────────
export const DisplayModeToggle = memo(function DisplayModeToggle({
  mode,
  onChange,
  compact = false,
}: {
  mode: DisplayMode;
  onChange: (m: DisplayMode) => void;
  compact?: boolean;
}) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const options: Array<{ id: DisplayMode; label: string }> = [
    { id: "en", label: "EN" },
    { id: "zh", label: "中文" },
    { id: "bilingual", label: "双语" },
  ];

  return (
    <View style={{ width: compact ? 152 : undefined, flexDirection: "row", gap: 4, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceRaised, padding: 3, flexShrink: 0 }}>
      {options.map((opt) => {
        const selected = mode === opt.id;
        return (
          <Pressable
            key={opt.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`显示${opt.label}字幕`}
            onPress={() => { haptics.selection(); onChange(opt.id); }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              borderRadius: theme.radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selected ? theme.colors.surface : "transparent",
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <Text style={{ color: selected ? theme.colors.text : theme.colors.muted, fontSize: 12, fontWeight: "800" }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// WordCapsuleButton — memo 防止每次字幕行 re-render 时重新渲染
// ─────────────────────────────────────────────────────────────────────────────
const WordCapsuleButton = memo(function WordCapsuleButton({
  word,
  onWordPress,
}: {
  word: string;
  onWordPress: (word: string) => void;
}) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`查询单词 ${word}`}
      onPress={(event) => { event.stopPropagation(); haptics.selection(); onWordPress(word); }}
      style={({ pressed }) => ({
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: theme.radius.sm,
        backgroundColor: pressed ? `${theme.colors.accent}24` : "transparent",
        transform: [{ scale: pressed ? 0.92 : 1 }],
      })}
    >
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 15,
          fontWeight: "700",
          textDecorationLine: "underline",
          textDecorationStyle: "dotted",
          textDecorationColor: theme.colors.accent,
        }}
      >
        {word}
      </Text>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// ClickableEnglishText — useMemo 缓存 token split，仅在 text 变化时重算
// ─────────────────────────────────────────────────────────────────────────────
const ClickableEnglishText = memo(function ClickableEnglishText({
  text,
  onWordPress,
}: {
  text: string;
  onWordPress: (word: string) => void;
}) {
  const { theme } = useTheme();

  const tokens = useMemo(() => text.split(/(\s+)/g), [text]);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) {
          return <Text key={`space-${i}`} style={{ fontSize: 15 }}> </Text>;
        }
        const match = token.match(/^(\p{P}*)([\w'-]+)(\p{P}*)$/u);
        if (!match) return <Text key={`${token}-${i}`} style={{ color: theme.colors.text, fontSize: 15 }}>{token}</Text>;

        const [, prefix, word, suffix] = match;
        return (
          <View key={`${word}-${i}`} style={{ flexDirection: "row", alignItems: "center" }}>
            {prefix ? <Text style={{ color: theme.colors.text, fontSize: 15 }}>{prefix}</Text> : null}
            <WordCapsuleButton word={word} onWordPress={onWordPress} />
            {suffix ? <Text style={{ color: theme.colors.text, fontSize: 15 }}>{suffix}</Text> : null}
          </View>
        );
      })}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// WordCardModal
// ─────────────────────────────────────────────────────────────────────────────
function WordCardModal({
  word,
  videoId,
  visible,
  onClose,
}: {
  word: string;
  videoId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const lookupWord = useMemo(() => normalizeSelectedWord(word), [word]);

  // 按钮果冻缩放
  const btnScale = useSharedValue(1);

  const defQuery = useMutation({
    mutationFn: () => postWordDefinitions(lookupWord, accessToken),
  });

  const definition = defQuery.data?.definitions?.[0];
  const saveMutation = useMutation({
    mutationFn: () => postVocabulary(definition?.lemma ?? lookupWord, videoId, accessToken),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["user-vocabulary"] });
    },
  });

  useEffect(() => {
    if (visible && lookupWord) {
      defQuery.reset();
      saveMutation.reset();
      defQuery.mutate();
    }
  }, [visible, lookupWord]);

  const animatedBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }]
  }));

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent onRequestClose={onClose} animationType="none">
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={{ flex: 1, backgroundColor: "rgba(10, 26, 0, 0.45)", justifyContent: "center", alignItems: "center", padding: 24 }}
      >
        <Pressable style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} onPress={onClose} />

        <Animated.View
          entering={ZoomInEasyUp.springify().damping(12).stiffness(160)}
          exiting={ZoomOutEasyDown.duration(150)}
          style={{
            width: "100%",
            maxWidth: 340,
            borderRadius: theme.radius.xl,
            backgroundColor: `${theme.colors.surface}DD`,
            padding: 24,
            gap: 16,
            borderWidth: 1.5,
            borderColor: `${theme.colors.accent}40`,
            shadowColor: theme.colors.accent,
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 8
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: "900" }}>{lookupWord || word}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="关闭单词释义"
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <X color={theme.colors.muted} size={20} />
            </Pressable>
          </View>

          {defQuery.isPending ? (
            <View style={{ alignItems: "center", gap: 12, paddingVertical: 20 }}>
              <ActivityIndicator color={theme.colors.accent} />
              <MutedText>查询中...</MutedText>
            </View>
          ) : defQuery.error instanceof Error ? (
            <MutedText>查询失败: {defQuery.error.message}</MutedText>
          ) : definition ? (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}>
                {definition.phonetic ? <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{definition.phonetic}</Text> : null}
                {definition.partOfSpeech ? <Text style={{ color: theme.colors.accent, fontSize: 13, fontWeight: "700" }}>{definition.partOfSpeech}</Text> : null}
              </View>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700" }}>{definition.definitionZh}</Text>
              {definition.definitionEn ? <MutedText>{definition.definitionEn}</MutedText> : null}
              {definition.exampleEn ? (
                <View style={{ borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceRaised, padding: 10, gap: 4 }}>
                  <Text style={{ color: theme.colors.muted, fontSize: 13, fontStyle: "italic" }}>{definition.exampleEn}</Text>
                  {definition.exampleZh ? <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{definition.exampleZh}</Text> : null}
                </View>
              ) : null}
            </View>
          ) : (
            <MutedText>未找到该单词的释义。</MutedText>
          )}

          {user && definition ? (
            <Animated.View style={animatedBtnStyle}>
              <Pressable
                onPressIn={() => {
                  haptics.selection();
                  btnScale.value = withSpring(0.96, { damping: 12, stiffness: 400 });
                }}
                onPressOut={() => {
                  btnScale.value = withSpring(1.0, { damping: 12, stiffness: 400 });
                }}
                onPress={() => {
                  if (!saveMutation.isSuccess && !saveMutation.isPending) {
                    saveMutation.mutate();
                  }
                }}
                disabled={saveMutation.isSuccess || saveMutation.isPending}
                style={{
                  minHeight: 48,
                  borderRadius: theme.radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: saveMutation.isSuccess ? theme.colors.surfaceRaised : theme.colors.accent,
                  borderWidth: saveMutation.isSuccess ? 1.5 : 0,
                  borderColor: theme.colors.border
                }}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color={saveMutation.isSuccess ? theme.colors.text : "#0A1A00"} />
                ) : (
                  <Text style={{ color: saveMutation.isSuccess ? theme.colors.muted : "#0A1A00", fontWeight: "900", fontSize: 15 }}>
                    {saveMutation.isSuccess ? "已收藏" : "加入单词本"}
                  </Text>
                )}
              </Pressable>
            </Animated.View>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TranscriptItem — memo 化，避免 activeIdx 变化时无关行 re-render
// ─────────────────────────────────────────────────────────────────────────────
const TranscriptItem = memo(function TranscriptItem({
  item,
  active,
  displayMode,
  videoId,
  onSeekTo,
  onWordPress,
  onGrammarPress,
  onSharePress,
}: {
  item: TranscriptSegment;
  active: boolean;
  displayMode: DisplayMode;
  videoId: string;
  onSeekTo: () => void;
  onWordPress: (word: string) => void;
  onGrammarPress: (segment: TranscriptSegment) => void;
  onSharePress: (segment: TranscriptSegment) => void;
}) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { accessToken } = useAuth();
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: () => postQuote(videoId, item.text, item.text_zh ?? undefined, item.startTime, item.endTime, undefined, accessToken),
    onSuccess: () => {
      haptics.success();
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["user-quotes", accessToken] });
    },
    onError: () => haptics.error(),
  });

  const showEn = displayMode === "en" || displayMode === "bilingual";
  const showZh = displayMode === "zh" || displayMode === "bilingual";
  const translatedText = item.text_zh?.trim();
  const zhText = translatedText && translatedText !== item.text.trim() ? translatedText : null;
  // 双语模式不重复渲染英文原文；中文模式在译文未返回时保留单行原文兜底。
  const shouldShowZh = showZh && (Boolean(zhText) || displayMode === "zh");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Jump to transcript at ${formatTime(item.startTime)}`}
      onPress={() => {
        haptics.selection();
        onSeekTo();
      }}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: theme.radius.md,
        borderWidth: 1.5,
        padding: 12,
        gap: 6,
        borderColor: active ? `${theme.colors.accent}AA` : theme.colors.border,
        backgroundColor: active ? `${theme.colors.accent}18` : theme.colors.surfaceRaised,
        borderLeftWidth: active ? 3 : 1.5,
        borderLeftColor: active ? theme.colors.accent : theme.colors.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="AI 语法解析"
              onPress={(event) => { event.stopPropagation(); haptics.light(); onGrammarPress(item); }}
              hitSlop={8}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Sparkles color={theme.colors.accent} size={16} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="分享金句"
              onPress={(event) => { event.stopPropagation(); haptics.selection(); onSharePress(item); }}
              hitSlop={8}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              <Share2 color={theme.colors.blue} size={16} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? "已收藏" : "收藏句子"}
              onPress={(event) => { event.stopPropagation(); if (!saved && !saveMutation.isPending) { haptics.light(); saveMutation.mutate(); } }}
              hitSlop={8}
              disabled={saved || saveMutation.isPending}
              style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            >
              {saved ? (
                <BookmarkCheck color={theme.colors.accent} size={16} />
              ) : (
                <Bookmark color={theme.colors.muted} size={16} />
              )}
            </Pressable>
          </View>
        </View>

        {showEn ? <ClickableEnglishText text={item.text} onWordPress={onWordPress} /> : null}

        {shouldShowZh ? (
          <Text selectable style={{ color: zhText ? theme.colors.muted : theme.colors.subtle, fontSize: 14, lineHeight: 20 }}>
            {zhText ?? item.text}
          </Text>
        ) : null}
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 二分查找当前活跃字幕索引（O(log n)，替代原来的 O(n) 遍历）
// ─────────────────────────────────────────────────────────────────────────────
function findActiveIdx(transcript: TranscriptSegment[], currentTime: number): number {
  if (transcript.length === 0) return -1;

  // 先检查精确区间（大多数情况命中）
  let lo = 0;
  let hi = transcript.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const seg = transcript[mid];
    if (currentTime < seg.startTime) {
      hi = mid - 1;
    } else if (currentTime > seg.endTime) {
      lo = mid + 1;
    } else {
      return mid; // 命中
    }
  }

  // 未命中区间（处于两段之间的间隙），取最近过去的那段
  // hi 此时指向最后一个 startTime <= currentTime 的位置
  if (hi >= 0 && currentTime >= transcript[hi].startTime) {
    return hi;
  }
  return -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// TranscriptList（主组件）
// ─────────────────────────────────────────────────────────────────────────────
export function TranscriptList({
  videoId,
  transcript,
  currentTime,
  onSeekTo,
  autoFollow,
  onAutoFollowChange,
  displayMode,
  videoTitle,
  thumbnailUrl,
}: {
  videoId: string;
  transcript: TranscriptSegment[];
  currentTime: number;
  onSeekTo: (seconds: number) => void;
  autoFollow: boolean;
  onAutoFollowChange: (value: boolean) => void;
  displayMode: DisplayMode;
  videoTitle?: string;
  thumbnailUrl?: string;
}) {
  const { theme } = useTheme();
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [activeGrammarSegment, setActiveGrammarSegment] = useState<TranscriptSegment | null>(null);
  const [sharingSegment, setSharingSegment] = useState<TranscriptSegment | null>(null);
  const viewShotRef = useRef<View>(null);
  const listRef = useRef<FlatList<TranscriptSegment>>(null);
  const autoFollowRef = useRef(autoFollow);
  const lastActiveIdxRef = useRef(-1);
  const haptics = useHaptics();

  // ── 二分查找当前活跃索引，性能 O(log n)
  const activeIdx = useMemo(
    () => findActiveIdx(transcript, currentTime),
    [transcript, currentTime]
  );

  // ── 自动滚动：仅当 activeIdx 真正变化时触发（避免每次 currentTime 都 scroll）
  useEffect(() => {
    autoFollowRef.current = autoFollow;
  }, [autoFollow]);

  const scrollToActive = useCallback((idx: number) => {
    if (idx >= 0 && autoFollowRef.current && listRef.current) {
      listRef.current.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
  }, []);

  useEffect(() => {
    if (activeIdx === lastActiveIdxRef.current) return; // 未变化，跳过

    if (activeIdx >= 0) {
      if (autoFollowRef.current) {
        scrollToActive(activeIdx);
      }
    }
    lastActiveIdxRef.current = activeIdx;
  }, [activeIdx, scrollToActive, haptics]);

  // ── onContentSizeChange 时将已有活跃行滚入视野
  const handleContentSizeChange = useCallback(() => {
    scrollToActive(lastActiveIdxRef.current);
  }, [scrollToActive]);

  const handleScrollBeginDrag = useCallback(() => {
    if (autoFollowRef.current) {
      autoFollowRef.current = false;
      onAutoFollowChange(false);
    }
  }, [onAutoFollowChange]);

  const scrollRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (scrollRetryTimerRef.current) {
      clearTimeout(scrollRetryTimerRef.current);
      scrollRetryTimerRef.current = null;
    }
  }, []);

  const handleScrollToIndexFailed = useCallback(({ index, averageItemLength }: { index: number; averageItemLength: number }) => {
    if (!autoFollowRef.current || !listRef.current) return;

    // Fast seeks can target a cell FlatList has not measured yet. Move close
    // to the target immediately, then retry after the missing cells render.
    const average = Math.max(averageItemLength || 0, 64);
    listRef.current.scrollToOffset({
      offset: Math.max(0, index * average - average * 2),
      animated: false,
    });
    if (scrollRetryTimerRef.current) clearTimeout(scrollRetryTimerRef.current);
    scrollRetryTimerRef.current = setTimeout(() => {
      scrollRetryTimerRef.current = null;
      if (autoFollowRef.current) {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
      }
    }, 300);
  }, []);

  // ── renderItem：完全稳定的 callback，防止 FlatList 重绘
  useEffect(() => {
    // 当需要分享的数据就绪时，延迟一点执行截图以防渲染未完成
    let cancelled = false;
    let shareTimer: ReturnType<typeof setTimeout> | null = null;

    if (sharingSegment) {
      shareTimer = setTimeout(async () => {
        try {
          if (!cancelled && viewShotRef.current) {
            const uri = await captureRef(viewShotRef, {
              format: "png",
              quality: 1,
            });
            const isAvailable = await Sharing.isAvailableAsync();
            if (!cancelled && isAvailable) {
              await Sharing.shareAsync(uri);
            }
          }
        } catch (error) {
          console.error("Share failed", error);
        } finally {
          if (!cancelled) setSharingSegment(null);
        }
      }, 100);
    }

    return () => {
      cancelled = true;
      if (shareTimer) clearTimeout(shareTimer);
    };
  }, [sharingSegment]);

  const renderItem = useCallback(
    ({ item, index }: { item: TranscriptSegment; index: number }) => {
      const active = index === activeIdx;
      return (
        <TranscriptItem
          item={item}
          active={active}
          displayMode={displayMode}
          videoId={videoId}
          onSeekTo={() => onSeekTo(item.startTime)}
          onWordPress={setSelectedWord}
          onGrammarPress={setActiveGrammarSegment}
          onSharePress={setSharingSegment}
        />
      );
    },
    [activeIdx, displayMode, videoId, onSeekTo]
  );

  const keyExtractor = useCallback(
    (item: TranscriptSegment) => `${item.startTime}-${item.endTime}`,
    []
  );

  const ItemSeparator = useCallback(
    () => <View style={{ height: theme.spacing.sm }} />,
    [theme.spacing.sm]
  );

  return (
    <View style={{ flex: 1, minHeight: 0, gap: 10 }}>
      <FlatList
        ref={listRef}
        data={transcript}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 12 }}
        keyExtractor={keyExtractor}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollToIndexFailed={handleScrollToIndexFailed}
        onContentSizeChange={handleContentSizeChange}
        ItemSeparatorComponent={ItemSeparator}
        renderItem={renderItem}
        // 性能优化：关闭过度的动画与渲染优先级提升
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={7}
        initialNumToRender={12}
        updateCellsBatchingPeriod={50}
        getItemLayout={undefined} // 字幕高度不固定，不能用 getItemLayout
      />

      {/* 单词查询弹窗 — 从 list 中独立，避免更新 transcript 时触发 modal re-render */}
      {selectedWord ? (
        <WordCardModal
          word={selectedWord}
          videoId={videoId}
          visible={!!selectedWord}
          onClose={() => setSelectedWord(null)}
        />
      ) : null}

      <GrammarCardModal
        segment={activeGrammarSegment}
        videoId={videoId}
        visible={!!activeGrammarSegment}
        onClose={() => setActiveGrammarSegment(null)}
      />

      {/* 回到当前行按钮（autoFollow 关闭时出现） */}
      {activeIdx >= 0 && !autoFollow ? (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={{ position: "absolute", bottom: 12, right: 12 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="跳转到当前播放位置并开启自动跟随"
            onPress={() => {
              autoFollowRef.current = true;
              onAutoFollowChange(true);
              scrollToActive(activeIdx);
            }}
            style={{
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.accent,
              paddingHorizontal: 16,
              minHeight: 48,
              paddingVertical: 8,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Crosshair size={16} color="#0A1A00" strokeWidth={2.5} />
              <Text style={{ color: "#0A1A00", fontSize: 13, fontWeight: "900" }}>当前</Text>
            </View>
          </Pressable>
        </Animated.View>
      ) : null}

      {/* 隐藏的视图，用于截屏分享 */}
      {sharingSegment && (
        <View style={{ position: "absolute", top: -10000, left: -10000 }}>
          <QuoteShareCard
            ref={viewShotRef}
            segment={sharingSegment}
            thumbnailUrl={thumbnailUrl}
            videoTitle={videoTitle ?? "Teach Player 学习金句"}
          />
        </View>
      )}
    </View>
  );
}

function normalizeSelectedWord(word: string): string {
  return word
    .normalize("NFKC")
    .replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "")
    .replace(/['']/g, "'")
    .toLowerCase();
}
