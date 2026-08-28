import { useState, useMemo } from "react";
import { FlatList, Image, Pressable, Text, View, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { Search, Play, CheckCircle, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { ParsingStatusButton } from "@/components/parsing-status-button";
import { EmptyState, Screen, StatusMessage } from "@/components/ui";
import { storage, cacheKey } from "@/lib/storage";
import { CHANNELS, MOCK_VIDEOS, type MockVideo } from "@/lib/mock-data";
import { DEFAULT_USER_AVATAR } from "@/lib/user-profile";
import { useVideoSearch } from "@/hooks/use-video-search";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isBilibiliVideoId } from "@teach-player/shared";
import { formatDuration } from "@/lib/mobile-utils";

const CATEGORIES = ["Youtube", "BiliBili"];

function VideoCard({ item, onPress }: { item: MockVideo; onPress: () => void }) {
  const { theme } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`打开视频：${item.title}`}
      onPress={onPress}
      style={({ pressed }) => [styles.videoCard, { opacity: pressed ? 0.82 : 1 }]}
    >
      {/* Thumbnail Container */}
      <View style={[styles.thumbnailContainer, { borderRadius: theme.radius.md }]}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailFallback, { backgroundColor: theme.colors.surfaceRaised }]}>
            <Play color={theme.colors.muted} size={24} />
          </View>
        )}

        {/* Only show metadata that comes from the source. */}
        <View style={styles.overlayContainer}>
          <Text style={styles.statText}>{item.duration || "待解析"}</Text>
        </View>
      </View>

      {/* Info Container */}
      <View style={styles.infoContainer}>
        {/* Title: 2 lines */}
        <Text numberOfLines={2} style={[styles.videoTitle, { color: theme.colors.text }]}>
          {item.title}
        </Text>

        {/* Meta Creator Row */}
        <View style={styles.metaRow}>
          <View style={styles.creatorContainer}>
            {/* Small orange check badge to mimic '已关注' check circle */}
            <View style={[styles.followBadge, { backgroundColor: `${theme.colors.accent}18` }]}>
              <CheckCircle color={theme.colors.accent} size={9} strokeWidth={3} />
            </View>
            <Text numberOfLines={1} style={[styles.metaText, { color: theme.colors.muted, flex: 1 }]}>
              {item.channelName}
            </Text>
          </View>

        </View>
      </View>
    </Pressable>
  );
}

export default function VideoFeedScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("Youtube");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [avatarUri] = useStorageState<string | null>("user:avatar-uri", null);
  const insets = useSafeAreaInsets();

  const { results: searchResults, isLoading: isSearching, isError: isSearchError } = useVideoSearch(searchQuery);

  // Retrieve user's parsed Bilibili and local video media IDs from storage
  const [myMediaIds] = useStorageState<string[]>("settings:my-media-ids", []);

  // Subscribed channels IDs (default initialized in manage-channels)
  const [subscribedIds] = useStorageState<string[]>(
    "settings:subscribed-channels",
    ["1001-album", "10-percent-happier", "13-again", "14-minuten"]
  );

  // Filter videos functionally based on platform category selection
  const filteredVideos = useMemo(() => {
    let list = [...MOCK_VIDEOS];

    // Merge parsed videos from settings:my-media-ids
    for (const id of myMediaIds) {
      if (!list.some(v => v.videoId === id)) {
        const cachedAnalysis = storage.get<any>(cacheKey(["analysis", id]), null);
        const metadata = cachedAnalysis?.metadata;
        const isBilibili = isBilibiliVideoId(id);
        list.unshift({
          videoId: id,
          title: metadata?.title || (isBilibili ? "B站视频（解析中）" : "YouTube 视频（解析中）"),
          channelId: "custom",
          channelName: metadata?.authorName || (isBilibili ? "哔哩哔哩" : "已导入视频"),
          thumbnailUrl: metadata?.thumbnailUrl || (!isBilibili ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ""),
          duration: formatDuration(metadata?.durationSeconds),
          views: "",
          parsedAt: new Date().toISOString(),
        });
      }
    }

    // 如果正在搜索，优先展示搜索结果
    if (searchQuery.trim() !== "") {
      const apiResults: MockVideo[] = searchResults.map(r => ({
        videoId: r.id,
        title: r.title,
        channelId: "search-result",
        channelName: r.author,
        thumbnailUrl: r.thumbnail,
        duration: r.duration || "未知",
        views: "",
        parsedAt: new Date().toISOString(),
      }));

      // 合并本地符合条件的记录（优先级高，排前面）
      const query = searchQuery.toLowerCase();
      const localMatches = list.filter((video) => {
        const matchesTitle = video.title.toLowerCase().includes(query);
        const matchesChannel = video.channelName.toLowerCase().includes(query);
        return matchesTitle || matchesChannel;
      });

      // 去重合并
      const localIds = new Set(localMatches.map(v => v.videoId));
      const filteredApiResults = apiResults.filter(v => !localIds.has(v.videoId));

      return [...localMatches, ...filteredApiResults];
    }

    if (selectedCategory === "Youtube") {
      // Show YouTube videos (which are length 11 and don't start with "local-" or "BV")
      return list.filter(v => !isBilibiliVideoId(v.videoId) && !v.videoId.startsWith("local-"));
    } else {
      // Show Bilibili and local files (starts with BV/bv, or local-)
      return list.filter(v => isBilibiliVideoId(v.videoId) || v.videoId.startsWith("local-") || v.channelName === "哔哩哔哩");
    }
  }, [selectedCategory, searchQuery, myMediaIds, searchResults]);

  const handleVideoPress = (videoId: string) => {
    haptics.success();
    router.push(`/video/${videoId}`);
  };

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Custom Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              haptics.selection();
              router.push("/settings");
            }}
            style={[styles.avatarButton, { backgroundColor: theme.colors.surfaceRaised }]}
            accessibilityRole="button"
            accessibilityLabel="打开设置"
          >
            <Image
              source={avatarUri ? { uri: avatarUri } : DEFAULT_USER_AVATAR}
              style={[styles.headerAvatar, avatarUri ? styles.userAvatar : styles.tpLogoAvatar]}
            />
          </Pressable>

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t("tabs.video")}</Text>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => {
                haptics.light();
                setIsSearchVisible(!isSearchVisible);
                if (isSearchVisible) setSearchQuery("");
              }}
              style={[styles.actionButton, { backgroundColor: theme.colors.surfaceRaised }]}
              accessibilityRole="button"
              accessibilityLabel={isSearchVisible ? "关闭搜索" : "打开搜索"}
            >
              <Search color={theme.colors.text} size={20} />
            </Pressable>
            <ParsingStatusButton />
          </View>
        </View>

        {/* Search Bar */}
        {isSearchVisible && (
          <View style={[styles.searchBarContainer, { paddingHorizontal: theme.spacing.page }]}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("videoFeed.searchPlaceholder")}
              placeholderTextColor={theme.colors.subtle}
              accessibilityLabel="搜索视频"
              returnKeyType="search"
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  color: theme.colors.text,
                  borderRadius: theme.radius.md,
                },
              ]}
            />
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
        )}

        {/* Bilibili Category Navigation Bar */}
        <View style={[styles.categoryBarContainer, { borderBottomColor: theme.colors.border }]}>
          <View style={{ flexDirection: "row", paddingHorizontal: theme.spacing.page, gap: 28 }}>
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category;
              return (
                <Pressable
                  key={category}
                  onPress={() => {
                    haptics.selection();
                    setSelectedCategory(category);
                  }}
                  style={styles.categoryTab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`切换到${category}频道`}
                >
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: isSelected ? theme.colors.accent : theme.colors.muted,
                        fontWeight: isSelected ? "800" : "500",
                      },
                    ]}
                  >
                    {category}
                  </Text>
                  {isSelected && (
                    <View style={[styles.activeIndicator, { backgroundColor: theme.colors.accent }]} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Videos Grid */}
        <FlatList
          data={filteredVideos}
          keyExtractor={(item) => item.videoId}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.page,
            paddingBottom: insets.bottom + 96,
            gap: 12,
          }}
          ListEmptyComponent={
            isSearching ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>搜索中...</Text>
              </View>
            ) : isSearchError ? (
              <View style={styles.emptyContainer}>
                <StatusMessage tone="danger">搜索暂时失败，请检查网络后重试。</StatusMessage>
              </View>
            ) : (
              <EmptyState
                title={t("videoFeed.emptyFiltered")}
                description="导入视频后，它会出现在这里。"
                actionLabel="返回视频列表"
                onAction={() => setSelectedCategory("Youtube")}
              />
            )
          }
          renderItem={({ item }) => (
            <VideoCard item={item} onPress={() => handleVideoPress(item.videoId)} />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatar: {
    width: 48,
    height: 48,
  },
  userAvatar: {
    borderRadius: 22,
    resizeMode: "cover",
  },
  tpLogoAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    resizeMode: "contain",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarContainer: {
    position: "relative",
    marginBottom: 10,
  },
  searchInput: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  searchClearButton: {
    position: "absolute",
    right: 30,
    top: 2,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryBarContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  categoryTab: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 4,
    position: "relative",
  },
  categoryText: {
    fontSize: 15,
  },
  activeIndicator: {
    position: "absolute",
    bottom: -4,
    width: 16,
    height: 3,
    borderRadius: 1.5,
  },
  columnWrapper: {
    justifyContent: "space-between",
    gap: 12,
  },
  videoCard: {
    flex: 1,
    maxWidth: "48.5%", // Fits perfectly with justifyContent space-between
    marginBottom: 6,
  },
  thumbnailContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  overlayContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  overlayLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  infoContainer: {
    paddingTop: 6,
    paddingHorizontal: 4,
    gap: 4,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    minHeight: 36,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  creatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
    marginRight: 4,
  },
  followBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
