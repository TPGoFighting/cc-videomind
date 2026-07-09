import { useState, useMemo } from "react";
import { FlatList, Image, Pressable, ScrollView, Text, View, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { Plus, Search, User, Play, MessageSquare, MoreVertical, CheckCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { ParsingStatusButton } from "@/components/parsing-status-button";
import { Screen } from "@/components/ui";
import { storage, cacheKey } from "@/lib/storage";
import { CHANNELS, MOCK_VIDEOS, type MockVideo } from "@/lib/mock-data";
import { DEFAULT_USER_AVATAR } from "@/lib/user-profile";
import { useVideoSearch } from "@/hooks/use-video-search";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES = ["Youtube", "BiliBili"];

function BilibiliVideoCard({ item, onPress }: { item: MockVideo; onPress: () => void }) {
  const { theme } = useTheme();

  // Calculate mock comment/danmaku count
  const commentCount = useMemo(() => {
    const viewsNum = parseFloat(item.views);
    const multiplier = item.views.includes("M") ? 1000 : (item.views.includes("K") ? 1 : 0.1);
    const totalViews = viewsNum * multiplier * 1000;
    return Math.floor(Math.sqrt(totalViews) * 1.5 + 23);
  }, [item.views]);

  return (
    <Pressable onPress={onPress} style={styles.videoCard}>
      {/* Thumbnail Container */}
      <View style={[styles.thumbnailContainer, { borderRadius: theme.radius.md }]}>
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
        
        {/* Semi-transparent Bottom Overlay */}
        <View style={styles.overlayContainer}>
          <View style={styles.overlayLeft}>
            {/* View Count */}
            <View style={styles.statItem}>
              <Play color="#FFFFFF" size={10} fill="#FFFFFF" />
              <Text style={styles.statText}>{item.views}</Text>
            </View>
            
            {/* Danmaku Count */}
            <View style={styles.statItem}>
              <MessageSquare color="#FFFFFF" size={10} fill="#FFFFFF" />
              <Text style={styles.statText}>
                {commentCount >= 1000 ? `${(commentCount / 1000).toFixed(1)}k` : commentCount}
              </Text>
            </View>
          </View>
          
          {/* Duration */}
          <Text style={styles.statText}>{item.duration}</Text>
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
          
          {/* Options */}
          <MoreVertical color={theme.colors.subtle} size={12} />
        </View>
      </View>
    </Pressable>
  );
}

function secondsToTimestamp(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function VideoFeedScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState("Youtube");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [avatarUri] = useStorageState<string | null>("user:avatar-uri", null);

  const { results: searchResults, isLoading: isSearching } = useVideoSearch(searchQuery);

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
        if (cachedAnalysis?.metadata) {
          list.unshift({
            videoId: id,
            title: cachedAnalysis.metadata.title || "已解析的视频",
            channelId: "custom",
            channelName: cachedAnalysis.metadata.authorName || "哔哩哔哩",
            thumbnailUrl: cachedAnalysis.metadata.thumbnailUrl || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500",
            duration: secondsToTimestamp(cachedAnalysis.metadata.durationSeconds || 180),
            views: "10K",
            parsedAt: new Date().toISOString(),
          });
        }
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
        views: "10K", // 搜索接口暂无准确播放量，用占位符
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
      return list.filter(v => v.videoId.length === 11 && !v.videoId.startsWith("local-") && !v.videoId.toLowerCase().startsWith("bv"));
    } else {
      // Show Bilibili and local files (starts with BV/bv, or local-)
      return list.filter(v => v.videoId.toLowerCase().startsWith("bv") || v.videoId.startsWith("local-") || v.channelName === "哔哩哔哩");
    }
  }, [selectedCategory, searchQuery, myMediaIds, searchResults]);

  const handleRefresh = () => {
    haptics.light();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

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
          >
            <Image
              source={avatarUri ? { uri: avatarUri } : DEFAULT_USER_AVATAR}
              style={styles.headerAvatar}
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
              style={[
                styles.searchInput,
                {
                  backgroundColor: theme.colors.surfaceRaised,
                  color: theme.colors.text,
                  borderRadius: theme.radius.md,
                },
              ]}
            />
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
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.page,
            paddingBottom: 40,
            gap: 12,
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {isSearching ? (
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>搜索中...</Text>
              ) : (
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                  {t("videoFeed.emptyFiltered")}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <BilibiliVideoCard item={item} onPress={() => handleVideoPress(item.videoId)} />
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    resizeMode: "cover",
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarContainer: {
    marginBottom: 10,
  },
  searchInput: {
    height: 44,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  categoryBarContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  categoryTab: {
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
    height: 36, // Ensures consistent height for 2 lines of text
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
