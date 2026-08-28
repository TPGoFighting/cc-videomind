import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View, useWindowDimensions, Modal } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect, useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, AlertTriangle } from "lucide-react-native";
import {
  getTranslationPollDelay,
  isRetryableTranslationFailure,
  shouldContinueTranslation,
  TRANSLATION_POLL_MAX_ATTEMPTS,
  type KeyMoment,
  type SummaryTakeaway,
  type TranscriptSegment,
  type VideoAnalysisPayload,
} from "@teach-player/shared";
import {
  getVideoMeta,
  getVideoTranscript,
  postMoments,
  postSummary,
  postVideoAnalysisFromTranscript,
  streamTranscriptTranslations,
  ApiError,
} from "@/lib/api";
import { cacheKey, storage } from "@/lib/storage";
import {
  cacheTimestampKey,
  getCacheStaleTime,
  markCacheUpdated,
  MOBILE_CACHE_POLICY,
  networkStaleTimeMs,
} from "@/lib/cache-policy";
import { addParsingTask, updateParsingTask } from "@/lib/tasks";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useFadeInUp } from "@/lib/animation";
import { LearningPanels } from "@/components/learning-panels";
import { Screen } from "@/components/ui";
import { VideoPlayer, type PlayerHandle } from "@/components/video-player";
import { getChannelAvatarUrl, MOCK_VIDEOS } from "@/lib/mock-data";

export default function VideoScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const { accessToken } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const playerRef = useRef<PlayerHandle | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState<TranscriptSegment[]>([]);
  const [translationStatus, setTranslationStatus] = useState<"idle" | "translating" | "retrying" | "complete" | "paused" | "failed">("idle");
  const [translationRetryAttempt, setTranslationRetryAttempt] = useState(0);
  const [showReAnalyzeModal, setShowReAnalyzeModal] = useState(false);

  const [reparseCount, setReparseCount] = useState(0);

  const analysisCacheKey = cacheKey(["analysis", videoId]);
  const transcriptCacheKey = cacheKey(["transcript", videoId]);
  const momentsCacheKey = cacheKey(["moments", videoId]);
  const summaryCacheKey = cacheKey(["summary", videoId]);
  const translationCacheKey = cacheKey(["translation", videoId]);
  const cachedAnalysis = storage.get<VideoAnalysisPayload | undefined>(analysisCacheKey, undefined);
  const cachedMoments = storage.get<KeyMoment[] | undefined>(momentsCacheKey, undefined);
  const cachedTakeaways = storage.get<SummaryTakeaway[] | undefined>(summaryCacheKey, undefined);

  const handleReAnalyze = () => {
    setShowReAnalyzeModal(false);
    // 清除本地缓存，强制重新解析
    storage.remove(analysisCacheKey);
    storage.remove(cacheTimestampKey(analysisCacheKey));
    storage.remove(cacheTimestampKey(transcriptCacheKey));
    storage.remove(momentsCacheKey);
    storage.remove(cacheTimestampKey(momentsCacheKey));
    storage.remove(summaryCacheKey);
    storage.remove(cacheTimestampKey(summaryCacheKey));
    storage.remove(cacheTimestampKey(translationCacheKey));

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

  const transcriptQuery = useQuery({
    queryKey: ["video-transcript", videoId, reparseCount],
    queryFn: async () => {
      const result = await getVideoTranscript(videoId, accessToken);
      const current = storage.get<any>(analysisCacheKey, null);
      storage.set(analysisCacheKey, {
        videoId: result.videoId,
        metadata: result.metadata,
        transcript: result.transcript,
        analysis: current?.analysis,
      });
      markCacheUpdated(analysisCacheKey);
      markCacheUpdated(transcriptCacheKey);
      return result;
    },
    initialData: cachedAnalysis?.metadata && cachedAnalysis.transcript.length > 0
      ? {
          videoId: cachedAnalysis.videoId,
          metadata: cachedAnalysis.metadata,
          transcript: cachedAnalysis.transcript,
          cached: true,
        }
      : undefined,
    enabled: Boolean(videoId),
    retry: 2,
    retryDelay: 2_000,
    staleTime: cachedAnalysis?.metadata && cachedAnalysis.transcript.length > 0
      ? getCacheStaleTime(transcriptCacheKey, MOBILE_CACHE_POLICY.transcriptMs)
      : networkStaleTimeMs,
  });

  const analysisQuery = useQuery({
    queryKey: ["video-analysis", videoId, reparseCount],
    queryFn: async () => {
      const transcriptData = transcriptQuery.data;
      if (!transcriptData) {
        throw new Error("字幕尚未加载完成");
      }
      const result = await postVideoAnalysisFromTranscript(
        videoId,
        transcriptData.metadata.title,
        transcriptData.transcript,
        accessToken,
      );
      storage.set(analysisCacheKey, result);
      markCacheUpdated(analysisCacheKey);
      markCacheUpdated(transcriptCacheKey);
      return result;
    },
    initialData: () => {
      return cachedAnalysis?.analysis ? cachedAnalysis : undefined;
    },
    enabled: Boolean(videoId && transcriptQuery.data?.transcript.length),
    retry: 1,
    retryDelay: 2_000,
    staleTime: cachedAnalysis?.analysis
      ? getCacheStaleTime(analysisCacheKey, MOBILE_CACHE_POLICY.analysisMs)
      : networkStaleTimeMs,
  });

  const momentsQuery = useQuery({
    queryKey: ["moments", videoId, reparseCount],
    queryFn: async () => {
      const result = await postMoments(videoId, accessToken);
      storage.set(momentsCacheKey, result.moments);
      markCacheUpdated(momentsCacheKey);
      return result;
    },
    initialData: cachedMoments ? { moments: cachedMoments } : undefined,
    enabled: Boolean(videoId && transcriptQuery.data),
    staleTime: cachedMoments
      ? getCacheStaleTime(momentsCacheKey, MOBILE_CACHE_POLICY.analysisMs)
      : networkStaleTimeMs,
  });

  const summaryQuery = useQuery({
    queryKey: ["summary", videoId, reparseCount],
    queryFn: async () => {
      const result = await postSummary(videoId, accessToken);
      storage.set(summaryCacheKey, result.takeaways);
      markCacheUpdated(summaryCacheKey);
      return result;
    },
    initialData: cachedTakeaways ? { takeaways: cachedTakeaways } : undefined,
    enabled: Boolean(videoId && transcriptQuery.data),
    staleTime: cachedTakeaways
      ? getCacheStaleTime(summaryCacheKey, MOBILE_CACHE_POLICY.analysisMs)
      : networkStaleTimeMs,
  });

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const updateCurrentTime = () => {
        playerRef.current?.getCurrentTime().then((value) => {
          if (!cancelled) setCurrentTime(value);
        }).catch(() => undefined);
      };

      updateCurrentTime();
      const interval = setInterval(updateCurrentTime, 1000);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, []),
  );

  useEffect(() => {
    if (transcriptQuery.data && videoId) {
      const currentIds = storage.get<string[]>("settings:my-media-ids", []);
      if (!currentIds.includes(videoId)) {
        storage.set("settings:my-media-ids", [...currentIds, videoId]);
      }
    }
  }, [transcriptQuery.data, videoId]);

  const data = transcriptQuery.data
    ? {
        videoId: transcriptQuery.data.videoId,
        metadata: transcriptQuery.data.metadata,
        transcript: analysisQuery.data?.transcript ?? transcriptQuery.data.transcript,
        analysis: analysisQuery.data?.analysis ?? null,
      }
    : undefined;
  const dataRef = useRef(data);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    dataRef.current = data;
    setDataLoaded(Boolean(transcriptQuery.data));
  }, [data, transcriptQuery.data]);

  useEffect(() => {
    if (!data?.transcript) {
      setLiveTranscript([]);
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
      setTranslationStatus("complete");
      return;
    }

    const controller = new AbortController();
    let persistTimer: ReturnType<typeof setTimeout> | null = null;
    let latestTranscriptForPersistence: TranscriptSegment[] | null = null;
    let receivedUpdates = 0;
    const translatedIndices = new Set<number>();
    let pendingTranslations = missingTranslations.map(({ index, startTime, endTime, text }) => ({ index, startTime, endTime, text }));
    let retryStreak = 0;

    setTranslationStatus("translating");
    setTranslationRetryAttempt(0);

    const persistTranscript = (transcript: TranscriptSegment[]) => {
      latestTranscriptForPersistence = transcript;
      if (persistTimer) return;
      persistTimer = setTimeout(() => {
        persistTimer = null;
        const latestData = dataRef.current;
        if (!latestData || !latestTranscriptForPersistence) return;
        storage.set(analysisCacheKey, { ...latestData, transcript: latestTranscriptForPersistence });
        markCacheUpdated(translationCacheKey);
      }, 250);
    };

    const applyTranslation = ({ index, text_zh }: { index: number; text_zh: string }) => {
      if (controller.signal.aborted) {
        return;
      }

      translatedIndices.add(index);
      receivedUpdates += 1;

      setLiveTranscript((current) => {
        const base = current.length > 0 ? current : (dataRef.current?.transcript ?? []);
        const next = base.map((segment, segmentIndex) => (
          segmentIndex === index ? { ...segment, text_zh: text_zh || segment.text } : segment
        ));
        persistTranscript(next);
        return next;
      });
    };

    const waitForRetry = (delayMs: number) => new Promise<boolean>((resolve) => {
      if (controller.signal.aborted) {
        resolve(false);
        return;
      }

      const timer = setTimeout(() => {
        controller.signal.removeEventListener("abort", onAbort);
        resolve(true);
      }, delayMs);
      const onAbort = () => {
        clearTimeout(timer);
        resolve(false);
      };
      controller.signal.addEventListener("abort", onAbort, { once: true });
    });

    const translateRemainingPages = async () => {
      while (pendingTranslations.length > 0 && !controller.signal.aborted) {
        let result;
        try {
          result = await streamTranscriptTranslations(
            videoId,
            pendingTranslations,
            accessToken,
            applyTranslation,
            controller.signal
          );
        } catch (error) {
          if (controller.signal.aborted) return;
          if (!isRetryableTranslationFailure(error) || retryStreak >= TRANSLATION_POLL_MAX_ATTEMPTS) {
            throw error;
          }

          retryStreak += 1;
          setTranslationRetryAttempt(retryStreak);
          setTranslationStatus("retrying");
          if (!await waitForRetry(getTranslationPollDelay(retryStreak - 1))) return;
          setTranslationStatus("translating");
          continue;
        }

        const nextPendingTranslations = pendingTranslations.filter(({ index }) => !translatedIndices.has(index));
        pendingTranslations = nextPendingTranslations;

        if (pendingTranslations.length === 0) {
          setTranslationStatus("complete");
          return;
        }

        retryStreak = result.receivedUpdates > 0 ? 0 : retryStreak + 1;
        if (!shouldContinueTranslation(result, pendingTranslations.length)) {
          setTranslationStatus("paused");
          return;
        }

        if (retryStreak >= TRANSLATION_POLL_MAX_ATTEMPTS) {
          setTranslationStatus("paused");
          return;
        }

        setTranslationRetryAttempt(retryStreak);
        setTranslationStatus("retrying");
        if (!await waitForRetry(getTranslationPollDelay(Math.max(0, retryStreak - 1)))) return;
        setTranslationStatus("translating");
      }
    };

    translateRemainingPages().then(() => {
      if (!controller.signal.aborted && receivedUpdates > 0) {
        markCacheUpdated(translationCacheKey);
      }
    }).catch(() => {
      if (controller.signal.aborted) {
        return;
      }
      setTranslationStatus("failed");
    });

    return () => {
      controller.abort();
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }
      const latestData = dataRef.current;
      if (latestData && latestTranscriptForPersistence) {
        storage.set(analysisCacheKey, { ...latestData, transcript: latestTranscriptForPersistence });
        markCacheUpdated(translationCacheKey);
      }
    };
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
  const panelsStyle = useFadeInUp(400);
  const compact = height < 740;

  useEffect(() => {
    if (!videoId) return;

    if (transcriptQuery.isLoading || transcriptQuery.isFetching) {
      const metaTitle = mergedMetadata?.title || "解析视频...";
      addParsingTask(videoId, metaTitle, "parsing", 40);
    } else if (transcriptQuery.isSuccess && transcriptQuery.data) {
      const title = mergedMetadata?.title || transcriptQuery.data.metadata?.title || "解析视频";
      addParsingTask(videoId, title, "completed", 100);
    } else if (transcriptQuery.isError) {
      const errorMessage = transcriptQuery.error instanceof Error ? transcriptQuery.error.message : "视频解析失败";
      const title = mergedMetadata?.title || "解析视频";
      addParsingTask(videoId, title, "failed", 0);
      updateParsingTask(videoId, { status: "failed", errorMessage });
    }
  }, [
    videoId,
    transcriptQuery.isLoading,
    transcriptQuery.isFetching,
    transcriptQuery.isSuccess,
    transcriptQuery.isError,
    transcriptQuery.data,
    mergedMetadata?.title
  ]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* 自定义 Header：与全局统一风格保持一致 */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}>
          <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="返回上一页"
                style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceRaised,
            }}
          >
            <ArrowLeft color={theme.colors.text} size={22} />
          </Pressable>

          {/* 重新解析按钮 */}
          <Pressable
            onPress={() => setShowReAnalyzeModal(true)}
            accessibilityRole="button"
            accessibilityLabel="重新解析视频"
            accessibilityState={{ disabled: analysisQuery.isFetching }}
            style={({ pressed }) => ({
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
              opacity: analysisQuery.isFetching ? 0.4 : 1,
            })}
            disabled={analysisQuery.isFetching}
          >
            <RefreshCw color={analysisQuery.isFetching ? theme.colors.muted : theme.colors.text} size={20} />
          </Pressable>
        </View>

        {/* 视频播放器区域 */}
        <View style={{
          paddingHorizontal: theme.spacing.page,
          paddingBottom: compact ? theme.spacing.sm : theme.spacing.md,
          backgroundColor: theme.colors.background,
        }}>
          <VideoPlayer
            ref={playerRef}
            videoId={videoId}
            metadata={mergedMetadata}
            difficulty={(data as any)?.difficulty}
          />
        </View>

        <View style={{
          flex: 1,
          minHeight: 0,
          paddingHorizontal: theme.spacing.page,
          paddingTop: compact ? theme.spacing.sm : theme.spacing.md,
          paddingBottom: Math.max(insets.bottom, compact ? theme.spacing.md : theme.spacing.page),
        }}>
          {transcriptQuery.isLoading ? <AnalysisLoadingCard /> : null}

          {transcriptQuery.error && !transcriptQuery.isLoading ? (
            <View style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
              gap: 16,
            }}>
              <Text style={{ color: theme.colors.muted, fontSize: 15, lineHeight: 22, textAlign: "center" }}>
                {transcriptQuery.error instanceof ApiError
                  ? transcriptQuery.error.message
                  : "字幕加载失败，请检查网络连接后重试。"}
              </Text>
              <Pressable
                onPress={() => transcriptQuery.refetch()}
                accessibilityRole="button"
                accessibilityLabel="重试字幕加载"
                style={{ minHeight: 48, justifyContent: "center", paddingHorizontal: 24, borderRadius: 14, backgroundColor: theme.colors.accent }}
              >
                <Text style={{ color: "#0A1A00", fontWeight: "900", fontSize: 15 }}>重试字幕</Text>
              </Pressable>
            </View>
          ) : null}

          {analysisQuery.error && transcriptQuery.data ? (
            <View style={{
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderColor: `${theme.colors.gold}55`,
              backgroundColor: `${theme.colors.gold}12`,
              padding: 12,
              gap: 8,
            }}>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: "800" }}>
                字幕已就绪，AI 要点稍后可重试
              </Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 19 }}>
                {analysisQuery.error instanceof ApiError ? analysisQuery.error.message : "当前仍可阅读字幕、跳转时间点和保存词句。"}
              </Text>
              <Pressable
                onPress={() => analysisQuery.refetch()}
                accessibilityRole="button"
                accessibilityLabel="重试 AI 要点"
                style={{ alignSelf: "flex-start", minHeight: 48, justifyContent: "center", paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.colors.gold }}
              >
                <Text style={{ color: "#17120A", fontWeight: "900", fontSize: 14 }}>重试 AI 要点</Text>
              </Pressable>
            </View>
          ) : null}

          {/* 字幕翻译失败时静默处理（原文兜底），不弹出错误框 */}
          {data ? (
            <Animated.View style={[panelsStyle, { flex: 1, minHeight: 0 }]}>
              {translationStatus === "retrying" ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 8 }}
                >
                  翻译连接暂时中断，正在自动重试（第 {translationRetryAttempt} 次）...
                </Text>
              ) : translationStatus === "translating" ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={{ color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 8 }}
                >
                  译文正在后台逐页生成，完成后会自动继续。
                </Text>
              ) : null}
              <LearningPanels
                videoId={videoId}
                transcript={transcript}
                analysis={data.analysis}
                moments={momentsQuery.data?.moments ?? data.analysis?.highlights.map((item) => ({
                  title: item.title,
                  timestamp: `${secondsToTimestamp(item.startTime)}-${secondsToTimestamp(item.endTime)}`,
                  quote: item.quote,
                  reason: item.reason,
                })) ?? []}
                takeaways={summaryQuery.data?.takeaways ?? []}
                currentTime={currentTime}
                onSeekTo={(seconds) => playerRef.current?.seekTo(seconds)}
                momentsError={momentsQuery.error instanceof Error ? momentsQuery.error.message : null}
                summaryError={summaryQuery.error instanceof Error ? summaryQuery.error.message : null}
                videoTitle={mergedMetadata?.title}
                thumbnailUrl={mergedMetadata?.thumbnailUrl}
              />
            </Animated.View>
          ) : null}
        </View>

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
          <Image
            source={require("../../assets/mascot-video.png")}
            accessibilityLabel="视频学习小助手"
            style={{ width: 58, height: 58, position: "absolute", right: 0, top: -14, resizeMode: "contain" }}
          />
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
