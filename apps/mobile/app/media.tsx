import { useState, useMemo } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, SlidersHorizontal } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { Screen } from "@/components/ui";
import { isBilibiliVideoId } from "@teach-player/shared";
import { MOCK_VIDEOS } from "@/lib/mock-data";
import { SafeAreaView } from "react-native-safe-area-context";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { getHistory } from "@/lib/api";

export default function MyCorpusScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { accessToken } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeChip, setActiveChip] = useState<"all" | "youtube">("all");

  // User corpus video IDs (can be added via URL import)
  const [mediaIds] = useStorageState<string[]>(
    "settings:my-media-ids",
    ["dMYcI2F2csw", "J788Zt55w3o", "h9F0F1F2", "b8xP90hC62s", "h5F6F7F8", "h1F2F3F4", "h7F8F9F0", "h3F4F5F6"]
  );

  const historyQuery = useQuery({
    queryKey: ["history"],
    queryFn: () => getHistory(accessToken),
    enabled: Boolean(accessToken),
  });

  const combinedVideos = useMemo(() => {
    const localVideos = MOCK_VIDEOS.filter((v) => mediaIds.includes(v.videoId));
    const apiVideos = (historyQuery.data ?? []).map((item) => {
      const existing = MOCK_VIDEOS.find((v) => v.videoId === item.videoId);
      if (existing) return existing;
      return {
        videoId: item.videoId,
        title: item.title ?? "未命名视频",
        channelId: "imported",
        channelName: item.channelName ?? "已导入视频",
        thumbnailUrl: item.thumbnail ?? "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&auto=format&fit=crop&q=60",
        duration: "0:00",
        views: "0",
        parsedAt: item.parsedAt.split("T")[0],
      };
    });

    const mergedMap = new Map<string, typeof MOCK_VIDEOS[0]>();
    localVideos.forEach((v) => mergedMap.set(v.videoId, v));
    apiVideos.forEach((v) => mergedMap.set(v.videoId, v));

    // 补充 mediaIds 中尚未合并的 B站/本地视频，使其也能在媒体列表中显示
    mediaIds.forEach((id) => {
      if (!mergedMap.has(id) && isBilibiliVideoId(id)) {
        mergedMap.set(id, {
          videoId: id,
          title: id.startsWith("local-") ? "本地导入" : "B站视频",
          channelId: "bilibili",
          channelName: "哔哩哔哩",
          thumbnailUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=120&auto=format&fit=crop&q=60",
          duration: "",
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
      if (activeChip === "youtube" && !video.title.toLowerCase().includes("ted") && !video.channelName.toLowerCase().includes("bbc") && !video.channelName.toLowerCase().includes("vox")) {
        // Simple heuristic: YouTube videos are Ted, BBC, Vox in our mock data
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
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>我的语料</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Search Input and Filter Icon */}
        <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.page }]}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索我的视频..."
              placeholderTextColor={theme.colors.subtle}
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
            <Pressable
              onPress={() => {
                haptics.light();
                alert("过滤器已重置");
              }}
              style={styles.filterBtn}
            >
              <SlidersHorizontal color={theme.colors.muted} size={18} />
            </Pressable>
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
                },
              ]}
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
                },
              ]}
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
            paddingBottom: 40,
            gap: 16,
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                暂无符合条件的语料视频。可以使用“创建”导入视频！
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleVideoPress(item.videoId)}
              style={({ pressed }) => [
                styles.videoRow,
                {
                  backgroundColor: pressed ? theme.colors.surfaceRaised : "transparent",
                },
              ]}
            >
              {/* Left Thumbnail */}
              <Image source={{ uri: item.thumbnailUrl }} style={[styles.thumbnail, { borderRadius: theme.radius.md }]} />

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
    width: 40,
    height: 40,
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
  filterBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsContainer: {
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 20,
    height: 38,
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
    paddingVertical: 8,
    borderRadius: 8,
  },
  thumbnail: {
    width: 120,
    height: 70,
    backgroundColor: "#333",
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
