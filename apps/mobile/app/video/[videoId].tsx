import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View, useWindowDimensions, Modal } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  FadeIn,
  FadeOut
} from "react-native-reanimated";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react-native";
import type { KeyMoment, SummaryTakeaway, TranscriptSegment, VideoAnalysisPayload } from "@teach-player/shared";
import { postMoments, postSummary, postVideoAnalysis, getVideoMeta, streamTranscriptTranslations, ApiError, type VideoMetaResult } from "@/lib/api";
import { cacheKey, storage } from "@/lib/storage";
import { addParsingTask, updateParsingTask } from "@/lib/tasks";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useFadeInUp } from "@/lib/animation";
import { useHaptics } from "@/hooks/use-haptics";
import { LearningPanels } from "@/components/learning-panels";
import { Screen, StatusMessage } from "@/components/ui";
import { VideoPlayer, type PlayerHandle } from "@/components/video-player";
import { getChannelAvatarUrl, MOCK_VIDEOS } from "@/lib/mock-data";

export default function VideoScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const { accessToken } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const queryClient = useQueryClient();
  const playerRef = useRef<PlayerHandle | null>(null);
  const [isCinematicMode, setIsCinematicMode] = useState(false);
  const haptics = useHaptics();
  const [currentTime, setCurrentTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptSegment[]>([]);
  const [translationTotal, setTranslationTotal] = useState(0);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showReAnalyzeModal, setShowReAnalyzeModal] = useState(false);

  const [reparseCount, setReparseCount] = useState(0);

  const handleReAnalyze = () => {
    setShowReAnalyzeModal(false);
    // 清除本地缓存，强制重新解析
    storage.remove(cacheKey(["analysis", videoId]));
    storage.remove(cacheKey(["moments", videoId]));
    storage.remove(cacheKey(["summary", videoId]));
    
    // 更新计数器触发强制重新请求，避开服务端缓存
    setReparseCount(c => c + 1);
  };

  // 阶段1：快速获取元数据（2-3s 内必然返回）
  const metaQuery = useQuery({
    queryKey: ["video-meta", videoId],
    queryFn: () => getVideoMeta(videoId, accessToken).catch(() => null),
    staleTime: 300_000, // 5分钟内不重新获取
    gcTime: 600_000,
    enabled: Boolean(videoId),
  });

  const analysisQuery = useQuery({
    queryKey: ["video-analysis", videoId, reparseCount],
    queryFn: async () => {
      const result = await postVideoAnalysis(videoId, accessToken, reparseCount > 0);
      storage.set(cacheKey(["analysis", videoId]), result);
      return result;
    },
    initialData: () => storage.get<VideoAnalysisPayload | undefined>(cacheKey(["analysis", videoId]), undefined),
    enabled: Boolean(videoId),
    retry: 2,
    retryDelay: 2_000,
  });

  const momentsQuery = useQuery({
    queryKey: ["moments", videoId, reparseCount],
    queryFn: async () => {
      const result = await postMoments(videoId, accessToken);
      storage.set(cacheKey(["moments", videoId]), result.moments);
      return result;
    },
    initialData: () => {
      const moments = storage.get<KeyMoment[] | undefined>(cacheKey(["moments", videoId]), undefined);
      return moments ? { moments } : undefined;
    },
    enabled: Boolean(videoId && analysisQuery.data),
  });

  const summaryQuery = useQuery({
    queryKey: ["summary", videoId, reparseCount],
    queryFn: async () => {
      const result = await postSummary(videoId, accessToken);
      storage.set(cacheKey(["summary", videoId]), result.takeaways);
      return result;
    },
    initialData: () => {
      const takeaways = storage.get<SummaryTakeaway[] | undefined>(cacheKey(["summary", videoId]), undefined);
      return takeaways ? { takeaways } : undefined;
    },
    enabled: Boolean(videoId && analysisQuery.data),
  });

  useEffect(() => {
    const interval = setInterval(() => {
      playerRef.current?.getCurrentTime().then(setCurrentTime).catch(() => undefined);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (analysisQuery.data && videoId) {
      const currentIds = storage.get<string[]>("settings:my-media-ids", []);
      if (!currentIds.includes(videoId)) {
        storage.set("settings:my-media-ids", [...currentIds, videoId]);
      }
    }
  }, [analysisQuery.data, videoId]);

  const data = analysisQuery.data;
  const dataRef = useRef(data);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    dataRef.current = data;
    setDataLoaded(!!data);
  }, [data]);

  useEffect(() => {
    if (!data?.transcript) {
      setLiveTranscript([]);
      setTranslationTotal(0);
      return;
    }

    setLiveTranscript((current) => {
      if (current.length !== data.transcript.length) {
        return data.transcript;
      }

      return data.transcript.map((segment, index) => ({
        ...segment,
        text_zh: segment.text_zh?.trim() ? segment.text_zh : current[index]?.text_zh,
      }));
    });
  }, [data?.videoId, data?.transcript]);

  useEffect(() => {
    if (!videoId || !dataLoaded) {
      setTranslationTotal(0);
      setTranslationError(null);
      return;
    }

    const currentData = dataRef.current;
    if (!currentData) {
      return;
    }

    const missingTranslations = currentData.transcript
      .map((segment, index) => ({ ...segment, index }))
      .filter((segment) => !segment.text_zh?.trim());

    if (missingTranslations.length === 0) {
      setTranslationTotal(0);
      setTranslationError(null);
      return;
    }

    const controller = new AbortController();
    setTranslationTotal(missingTranslations.length);
    setTranslationError(null);

    const persistTranscript = (transcript: TranscriptSegment[]) => {
      const latestData = dataRef.current;
      if (!latestData) return;
      const nextAnalysis = { ...latestData, transcript };
      storage.set(cacheKey(["analysis", videoId]), nextAnalysis);
    };

    streamTranscriptTranslations(
      videoId,
      missingTranslations.map(({ index, startTime, endTime, text }) => ({ index, startTime, endTime, text })),
      accessToken,
      ({ index, text_zh }) => {
        if (controller.signal.aborted) {
          return;
        }

        setLiveTranscript((current) => {
          const base = current.length > 0 ? current : (dataRef.current?.transcript ?? []);
          const next = base.map((segment, segmentIndex) => (
            segmentIndex === index ? { ...segment, text_zh: text_zh || segment.text } : segment
          ));
          persistTranscript(next);
          return next;
        });
      },
      controller.signal
    ).catch((error) => {
      if (controller.signal.aborted) {
        return;
      }

      setTranslationError(error instanceof Error ? error.message : "Transcript translation failed.");
      setLiveTranscript((current) => {
        const base = current.length > 0 ? current : (dataRef.current?.transcript ?? []);
        return base.map((segment, index) => (
          missingTranslations.some((missing) => missing.index === index)
            ? { ...segment, text_zh: segment.text }
            : segment
        ));
      });
    });

    return () => controller.abort();
  }, [videoId, accessToken, dataLoaded]);

  const mockVideo = MOCK_VIDEOS.find(v => v.videoId === videoId);
  const fallbackMetadata = mockVideo ? {
    videoId: mockVideo.videoId,
    title: mockVideo.title,
    authorName: mockVideo.channelName,
    channelThumbnailUrl: getChannelAvatarUrl(mockVideo),
    thumbnailUrl: mockVideo.thumbnailUrl,
  } : undefined;

  const mergedMetadata = data?.metadata
    ? {
        ...data.metadata,
        channelThumbnailUrl: data.metadata.channelThumbnailUrl ?? getChannelAvatarUrl(mockVideo),
      }
    : metaQuery.data?.metadata ?? fallbackMetadata;

  const transcript = liveTranscript.length > 0 ? liveTranscript : data?.transcript ?? [];
  const activeIdx = transcript.findIndex((seg) => currentTime >= seg.startTime && currentTime < seg.endTime);
  const translatedCount = translationTotal > 0
    ? Math.max(0, translationTotal - transcript.filter((segment) => !segment.text_zh?.trim()).length)
    : 0;
  const isTranslating = translationTotal > 0 && translatedCount < translationTotal;
  const panelsStyle = useFadeInUp(400);
  const compact = height < 740;

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isCinematicMode ? 0 : 1, { duration: 400 }),
      height: withTiming(isCinematicMode ? 0 : 62, { duration: 400 }),
      transform: [{ translateY: withTiming(isCinematicMode ? -62 : 0, { duration: 400 }) }],
      overflow: "hidden"
    };
  });

  const playerContainerStyle = useAnimatedStyle(() => {
    return {
      paddingHorizontal: withTiming(isCinematicMode ? 0 : theme.spacing.page, { duration: 400 }),
      paddingBottom: withTiming(isCinematicMode ? 0 : (compact ? theme.spacing.sm : theme.spacing.md), { duration: 400 }),
      transform: [{ translateY: withTiming(isCinematicMode ? 20 : 0, { duration: 400 }) }]
    };
  });

  const panelsContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isCinematicMode ? 0 : 1, { duration: 400 }),
      transform: [{ translateY: withTiming(isCinematicMode ? 400 : 0, { duration: 400 }) }],
    };
  });

  useEffect(() => {
    if (!videoId) return;

    if (analysisQuery.isLoading || analysisQuery.isFetching) {
      const metaTitle = mergedMetadata?.title || "解析视频...";
      addParsingTask(videoId, metaTitle, "parsing", 40);
    } else if (analysisQuery.isSuccess && analysisQuery.data) {
      const title = mergedMetadata?.title || analysisQuery.data.metadata?.title || "解析视频";
      addParsingTask(videoId, title, "completed", 100);
    } else if (analysisQuery.isError) {
      const errorMessage = analysisQuery.error instanceof Error ? analysisQuery.error.message : "视频解析失败";
      const title = mergedMetadata?.title || "解析视频";
      addParsingTask(videoId, title, "failed", 0);
      updateParsingTask(videoId, { status: "failed", errorMessage });
    }
  }, [
    videoId,
    analysisQuery.isLoading,
    analysisQuery.isFetching,
    analysisQuery.isSuccess,
    analysisQuery.isError,
    analysisQuery.data,
    mergedMetadata?.title
  ]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* 自定义 Header：与全局统一风格保持一致 */}
        <Animated.View style={[headerStyle, {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }]}>
          <Pressable
            onPress={() => router.back()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceRaised,
            }}
          >
            <ArrowLeft color={theme.colors.text} size={22} />
          </Pressable>
          
          {/* 影院模式切换胶囊按钮 */}
          <Pressable
            onPress={() => { haptics.selection(); setIsCinematicMode(!isCinematicMode); }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: theme.radius.full,
              backgroundColor: isCinematicMode ? `${theme.colors.accent}24` : theme.colors.surfaceRaised,
              borderWidth: 1,
              borderColor: isCinematicMode ? theme.colors.accent : "transparent",
            }}
          >
            <Text style={{ color: isCinematicMode ? theme.colors.accent : theme.colors.text, fontSize: 11, fontWeight: "900" }}>
              🎬 开启影院
            </Text>
          </Pressable>

          {/* 重新解析按钮 */}
          <Pressable
            onPress={() => setShowReAnalyzeModal(true)}
            style={({ pressed }) => ({
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
              opacity: analysisQuery.isFetching ? 0.4 : 1,
            })}
            disabled={analysisQuery.isFetching}
          >
            <RefreshCw color={analysisQuery.isFetching ? theme.colors.muted : theme.colors.text} size={20} />
          </Pressable>
        </Animated.View>

        {/* 视频播放器区域 */}
        <Animated.View style={[playerContainerStyle, {
          backgroundColor: theme.colors.background,
        }]}>
          <VideoPlayer 
            ref={playerRef} 
            videoId={videoId} 
            metadata={mergedMetadata} 
            difficulty={(data as any)?.difficulty} 
          />
        </Animated.View>

        <View style={{
          flex: 1,
          minHeight: 0,
          paddingHorizontal: theme.spacing.page,
          paddingTop: compact ? theme.spacing.sm : theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, compact ? theme.spacing.md : theme.spacing.page),
        }}>
          {analysisQuery.isLoading ? <AnalysisLoadingCard /> : null}

          {/* 分析出错时显示错误和重试按钮 */}
          {analysisQuery.error && !analysisQuery.isLoading ? (
            <View style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
              gap: 16,
            }}>
              <Text style={{
                color: theme.colors.muted,
                fontSize: 15,
                lineHeight: 22,
                textAlign: "center",
              }}>
                {analysisQuery.error instanceof ApiError
                  ? analysisQuery.error.message
                  : "视频解析失败，请检查网络连接后重试。"}
              </Text>
              <Pressable
                onPress={() => analysisQuery.refetch()}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 14,
                  backgroundColor: theme.colors.accent,
                }}
              >
                <Text style={{ color: "#0A1A00", fontWeight: "900", fontSize: 15 }}>
                  重新尝试
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* 字幕翻译失败时静默处理（原文兜底），不弹出错误框 */}
          {data ? (
            <Animated.View style={[panelsStyle, panelsContainerStyle, { flex: 1, minHeight: 0 }]}>
              <LearningPanels
                videoId={videoId}
                transcript={transcript}
                analysis={data.analysis}
                moments={momentsQuery.data?.moments ?? data.analysis.highlights.map((item) => ({
                  title: item.title,
                  timestamp: `${secondsToTimestamp(item.startTime)}-${secondsToTimestamp(item.endTime)}`,
                  quote: item.quote,
                  reason: item.reason,
                }))}
                takeaways={summaryQuery.data?.takeaways ?? []}
                currentTime={currentTime}
                onSeekTo={(seconds) => playerRef.current?.seekTo(seconds)}
                translationStatus={translationTotal > 0 ? {
                  total: translationTotal,
                  translated: translatedCount,
                  isTranslating,
                } : undefined}
              />
            </Animated.View>
          ) : null}
        </View>

        {/* 🎬 影院悬浮毛玻璃字幕舱 */}
        {isCinematicMode && (
          <Animated.View
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(300)}
            style={{
              position: "absolute",
              bottom: 80,
              left: 20,
              right: 20,
              backgroundColor: "rgba(10, 26, 0, 0.8)",
              borderRadius: theme.radius.lg,
              borderWidth: 1.5,
              borderColor: `${theme.colors.accent}40`,
              padding: 20,
              gap: 12,
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
              elevation: 10
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.accent, fontSize: 11, fontWeight: "900" }}>CINEMATIC MODE</Text>
              <Pressable
                onPress={() => { haptics.selection(); setIsCinematicMode(false); }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.surfaceRaised,
                }}
              >
                <Text style={{ color: theme.colors.text, fontSize: 10, fontWeight: "800" }}>退出影院</Text>
              </Pressable>
            </View>

            {transcript[activeIdx] ? (
              <View style={{ gap: 8, paddingVertical: 4 }}>
                <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: "800", lineHeight: 25, textAlign: "center" }}>
                  {transcript[activeIdx].text}
                </Text>
                {transcript[activeIdx].text_zh ? (
                  <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 18, textAlign: "center" }}>
                    {transcript[activeIdx].text_zh}
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={{ color: theme.colors.muted, fontSize: 13, fontStyle: "italic", textAlign: "center" }}>
                (无字幕或静音片段)
              </Text>
            )}
          </Animated.View>
        )}
      </SafeAreaView>

      {/* 重新解析确认弹窗 */}
      {showReAnalyzeModal && (
        <Modal
          visible={showReAnalyzeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowReAnalyzeModal(false)}
        >
          <View style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.65)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
          }}>
            <View style={{
              width: "100%",
              borderRadius: 24,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              padding: 24,
              gap: 16,
            }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${theme.colors.gold}20`,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <AlertTriangle color={theme.colors.gold} size={24} />
                </View>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900", flex: 1 }}>
                  确认重新解析
                </Text>
              </View>

              <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 22 }}>
                重新解析将清除当前视频的本地缓存并再次向服务器发起请求，这会额外消耗一次视频解析额度。确定继续吗？
              </Text>

              <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                <Pressable
                  onPress={() => setShowReAnalyzeModal(false)}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: theme.colors.surfaceRaised,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "700" }}>取消</Text>
                </Pressable>
                <Pressable
                  onPress={handleReAnalyze}
                  style={{
                    flex: 1,
                    height: 48,
                    borderRadius: 16,
                    backgroundColor: theme.colors.gold,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#0A1A00", fontWeight: "900" }}>确认解析</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}

function AnalysisLoadingCard() {
  const { theme } = useTheme();
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0.75);
  const sweep = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 1800, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.cubic) }), -1, true);
    sweep.value = withRepeat(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }), -1, false);
  }, [pulse, spin, sweep]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }, { scale: pulse.value }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -80 + sweep.value * 220 }, { rotate: "16deg" }],
    opacity: 0.35 + sweep.value * 0.45,
  }));

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 1,
        borderColor: `${theme.colors.accent}44`,
        backgroundColor: theme.colors.surface,
        padding: 18,
        gap: 14,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 90,
          backgroundColor: `${theme.colors.accent}22`,
        }, sweepStyle]}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 58, height: 58, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[ringStyle, {
            position: "absolute",
            width: 52,
            height: 52,
            borderRadius: 26,
            borderWidth: 3,
            borderColor: `${theme.colors.accent}30`,
            borderTopColor: theme.colors.accent,
            borderRightColor: theme.colors.blue,
          }]} />
          <View style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: theme.colors.accent,
            borderWidth: 5,
            borderColor: `${theme.colors.accent}26`,
          }} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "900" }}>正在构建学习空间</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 18 }}>
            视频已打开，字幕、要点和总结正在后台解析，请稍候...
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: item === 0 ? theme.colors.accent : `${theme.colors.accent}33`,
          }} />
        ))}
      </View>
    </View>
  );
}

function secondsToTimestamp(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
