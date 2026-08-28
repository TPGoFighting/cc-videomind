import { useState, useMemo } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Play, SlidersHorizontal, X } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { EmptyState, Screen } from "@/components/ui";
import { isBilibiliVideoId } from "@teach-player/shared";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { getHistory } from "@/lib/api";
import { isYoutubeVideoId } from "@/lib/mobile-utils";

export default function MyCorpusScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { accessToken } = useAuth();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<"all" | "youtube">("all");

  // User corpus video IDs (can be added via URL import)
  const [mediaIds] = useStorageState<string[]>(
    "settings:my-media-ids",
    []
  );

  const historyQuery = useQuery({
    queryKey: ["history", accessToken],
    queryFn: () => getHistory(accessToken),
    enabled: Boolean(accessToken),
  });

  const combinedVideos = useMemo(() => {
    const localVideos = MOCK_VIDEOS.filter((v) => mediaIds.includes(v.videoId));
    const apiVideos = (historyQuery.data ?? []).map((item) => {
      const existing = MOCK_VIDEOS.find((v) => v.videoId === item.videoId);
      if (existing) return existing;
      const isBilibili = isBilibiliVideoId(item.videoId);
      return {
        videoId: item.videoId,
        title: item.title ?? "未命名视频",
        channelId: "imported",
        channelName: item.channelName ?? "已导入视频",
        thumbnailUrl: item.thumbnailUrl ?? item.thumbnail ?? (!isBilibili ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` : ""),
        duration: "待解析",
        views: "",
        parsedAt: item.parsedAt.split("T")[0],
      };
    });

    const mergedMap = new Map<string, typeof MOCK_VIDEOS[0]>();
    localVideos.forEach((v) => mergedMap.set(v.videoId, v));
    apiVideos.forEach((v) => mergedMap.set(v.videoId, v));

    // Keep imported ids visible before history or transcript metadata arrives.
    mediaIds.forEach((id) => {
      if (!mergedMap.has(id)) {
        const isBilibili = isBilibiliVideoId(id);
        mergedMap.set(id, {
          videoId: id,
          title: id.startsWith("local-") ? "本地视频（解析中）" : isBilibili ? "B站视频（解析中）" : "YouTube 视频（解析中）",
          channelId: isBilibili ? "bilibili" : "youtube",
          channelName: isBilibili ? "哔哩哔哩" : "已导入视频",
          thumbnailUrl: !isBilibili && isYoutubeVideoId(id) ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "",
          duration: "待解析",
          views: "",
          parsedAt: new Date().toISOString().split("T")[0],
        });
      }
    });

    return Array.from(mergedMap.values());
  }, [mediaIds, historyQuery.data]);

  // Filter videos
  const videos = useMemo(() => {
    return combinedVideos.filter((video) => {
      // Must match chip filter
      if (activeChip === "youtube" && (isBilibiliVideoId(video.videoId) || video.videoId.startsWith("local-"))) {
        return false;
      }

      // Must match search query
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        return video.title.toLowerCase().includes(query) || video.channelName.toLowerCase().includes(query);
      }

      return true;
    });
  }, [combinedVideos, activeChip, searchQuery]);

  const handleVideoPress = (videoId: string) => {
    haptics.success();
    router.push(`/video/${videoId}`);
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics.light();
              router.back();
            }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="返回上一页"
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>我的语料</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Search Input and Filter Icon */}
        <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.page }]}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索我的视频..."
              placeholderTextColor={theme.colors.subtle}
              accessibilityLabel="搜索我的视频"
              returnKeyType="search"
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
            <Pressable
              onPress={() => {
                haptics.light();
                setSearchQuery("");
                setActiveChip("all");
              }}
              style={styles.filterBtn}
              accessibilityRole="button"
              accessibilityLabel="重置搜索和过滤"
            >
              <SlidersHorizontal color={theme.colors.muted} size={18} />
            </Pressable>
            {searchQuery.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="清除搜索"
                onPress={() => setSearchQuery("")}
                style={styles.searchClearButton}
              >
                <X color={theme.colors.muted} size={18} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Chips */}
        <View style={styles.chipsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.page, gap: 10 }}>
            <Pressable
              onPress={() => {
                haptics.selection();
                setActiveChip("all");
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: activeChip === "all" ? theme.colors.accent : theme.colors.surfaceRaised,
                  borderRadius: theme.radius.xl,
                  minHeight: 48,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeChip === "all" }}
              accessibilityLabel="显示全部语料视频"
            >
              <Text style={[styles.chipText, { color: activeChip === "all" ? "#0A1A00" : theme.colors.text }]}>
                全部
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.selection();
                setActiveChip("youtube");
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: activeChip === "youtube" ? theme.colors.accent : theme.colors.surfaceRaised,
                  borderRadius: theme.radius.xl,
                  minHeight: 48,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeChip === "youtube" }}
              accessibilityLabel="只显示 YouTube 视频"
            >
              <Text style={[styles.chipText, { color: activeChip === "youtube" ? "#0A1A00" : theme.colors.text }]}>
                YouTube
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Video List */}
        <FlatList
          data={videos}
          keyExtractor={(item) => item.videoId}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.page,
            paddingBottom: insets.bottom + 24,
            gap: 16,
          }}
          ListEmptyComponent={
            historyQuery.isError ? (
              <EmptyState
                title="语料加载失败"
                description="网络请求没有完成，重试后仍失败时请检查服务状态。"
                actionLabel="重试"
                onAction={() => historyQuery.refetch()}
              />
            ) : (
              <EmptyState
                title="暂无符合条件的语料视频"
                description="回到视频列表后，使用底部“创建”导入视频。"
                actionLabel="返回视频列表"
                onAction={() => router.replace("/(tabs)")}
              />
            )
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleVideoPress(item.videoId)}
              accessibilityRole="button"
              accessibilityLabel={`打开语料视频：${item.title}`}
              style={({ pressed }) => [
                styles.videoRow,
                {
                  backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
                },
              ]}
            >
              {/* Left Thumbnail */}
              {item.thumbnailUrl ? (
                <Image source={{ uri: item.thumbnailUrl }} style={[styles.thumbnail, { borderRadius: theme.radius.md }]} />
              ) : (
                <View style={[styles.thumbnail, styles.thumbnailFallback, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}>
                  <Play color={theme.colors.muted} size={24} />
                </View>
              )}

              {/* Right Info */}
              <View style={styles.infoCol}>
                <Text numberOfLines={2} style={[styles.videoTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>

                <View style={styles.metaRow}>
                  {/* Duration Badge */}
                  <View style={[styles.durationBadge, { backgroundColor: theme.colors.surfaceRaised }]}>
                    <Text style={[styles.durationText, { color: theme.colors.text }]}>
                      {item.duration}
                    </Text>
                  </View>
                  <Text style={[styles.dateText, { color: theme.colors.muted }]}>
                    {item.parsedAt}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
  },
  searchClearButton: {
    position: "absolute",
    right: 42,
    top: 2,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsContainer: {
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 20,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "800",
  },
  videoRow: {
    flexDirection: "row",
    gap: 12,
    minHeight: 86,
    paddingVertical: 8,
    borderRadius: 8,
  },
  thumbnail: {
    width: 120,
    height: 70,
    backgroundColor: "#333",
  },
  thumbnailFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  durationBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 11,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
