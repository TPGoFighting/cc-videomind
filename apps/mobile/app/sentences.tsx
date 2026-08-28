import { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View, StyleSheet, TextInput, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Heart, SlidersHorizontal, Volume2, VolumeX, X, Video } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { useSpeech } from "@/hooks/use-speech";
import { EmptyState, Screen } from "@/components/ui";
import { type MockSentence } from "@/lib/mock-data";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { useQuery } from "@tanstack/react-query";
import { getQuotes } from "@/lib/api";

export default function SentencesScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { accessToken } = useAuth();
  const { speak, speaking, currentText } = useSpeech();
  const insets = useSafeAreaInsets();

  const [sentences, setSentences] = useStorageState<MockSentence[]>(
    "settings:my-sentences-list",
    []
  );
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch online quotes if logged in
  const { data: onlineQuotes, isLoading: isOnlineLoading } = useQuery({
    queryKey: ["user-quotes", accessToken],
    queryFn: () => getQuotes(accessToken),
    enabled: Boolean(accessToken),
  });

  const toggleFavorite = (id: string) => {
    haptics.selection();
    setSentences((current) => current.map((s) => (s.id === id ? { ...s, isFavorite: !s.isFavorite } : s)));
  };

  // Merge online and local quotes seamlessly
  const mergedSentences = useMemo(() => {
    const localList = sentences ?? [];
    if (!accessToken || !onlineQuotes) return localList;

    const mappedQuotes: MockSentence[] = onlineQuotes.map((q) => ({
      id: q.id,
      text: q.textEn,
      translation: q.textZh ?? "",
      sourceVideoTitle: q.videoTitle ?? "云端视频",
      sourceVideoId: q.videoId,
      collectedAt: q.createdAt.split("T")[0],
      isFavorite: true,
      tags: q.notes ? [q.notes] : ["云端同步"],
    }));

    const unique = [...localList];
    mappedQuotes.forEach((q) => {
      const exists = unique.some((u) => u.text.toLowerCase().trim() === q.text.toLowerCase().trim());
      if (!exists) {
        unique.unshift(q);
      }
    });

    return unique;
  }, [sentences, onlineQuotes, accessToken]);

  const filteredSentences = useMemo(() => {
    let result = [...mergedSentences];
    if (showOnlyFavorites) result = result.filter((s) => s.isFavorite);
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.text.toLowerCase().includes(q) ||
          s.translation.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [mergedSentences, showOnlyFavorites, searchQuery]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => { haptics.light(); router.back(); }}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="返回上一页"
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>句子本</Text>
          <Pressable
            onPress={() => {
              haptics.medium();
              setShowOnlyFavorites((current) => !current);
            }}
            style={styles.favBtn}
            accessibilityRole="button"
            accessibilityLabel={showOnlyFavorites ? "显示全部句子" : "只显示收藏句子"}
            accessibilityState={{ selected: showOnlyFavorites }}
          >
            <Heart
              color={showOnlyFavorites ? theme.colors.accent : theme.colors.text}
              size={22}
              fill={showOnlyFavorites ? theme.colors.accent : "none"}
            />
          </Pressable>
        </View>

        <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.page }]}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索句子或标签..."
              placeholderTextColor={theme.colors.subtle}
              returnKeyType="search"
              accessibilityLabel="搜索句子或标签"
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="清除句子搜索"
              >
                <X color={theme.colors.muted} size={18} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                haptics.light();
                setSearchQuery("");
                setShowOnlyFavorites(false);
              }}
              style={styles.filterBtn}
              accessibilityRole="button"
              accessibilityLabel="重置句子筛选"
            >
              <SlidersHorizontal color={theme.colors.muted} size={18} />
            </Pressable>
          </View>
        </View>

        {isOnlineLoading ? (
          <ActivityIndicator color={theme.colors.accent} size="small" style={{ marginVertical: 8 }} />
        ) : null}

        <FlatList
          data={filteredSentences}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.page, paddingBottom: insets.bottom + 40, gap: 16 }}
          ListEmptyComponent={
            <EmptyState
              title={showOnlyFavorites ? "暂无收藏的句子" : "句子本为空"}
              description="打开视频后，可以从字幕行收藏句子。"
              actionLabel="去视频列表"
              onAction={() => router.replace("/")}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                haptics.success();
                router.push(`/video/${item.sourceVideoId}`);
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  borderWidth: 1.5,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 2,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`打开来源视频：${item.sourceVideoTitle}`}
            >
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.enText, { color: theme.colors.accent, fontSize: 16, fontWeight: "700" }]}>{item.text}</Text>
                  <Text style={[styles.zhText, { color: theme.colors.muted, fontSize: 14, fontWeight: "600" }]}>{item.translation}</Text>
                </View>
                <View style={{ gap: 10, alignItems: "center" }}>
                  {/* 英文语音播放 */}
                  <Pressable
                    hitSlop={8}
                    style={styles.inlineAction}
                    accessibilityRole="button"
                    accessibilityLabel={`播放句子：${item.text}`}
                    onPress={(e) => {
                      e.stopPropagation();
                      haptics.light();
                      speak(item.text, "en-US");
                    }}
                  >
                    {speaking && currentText === item.text ? (
                      <VolumeX color={theme.colors.accent} size={18} />
                    ) : (
                      <Volume2 color={theme.colors.muted} size={18} />
                    )}
                  </Pressable>
                  {/* 收藏按鈕 */}
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                    hitSlop={8}
                    style={styles.inlineAction}
                    accessibilityRole="button"
                    accessibilityLabel={item.isFavorite ? "取消收藏句子" : "收藏句子"}
                  >
                    <Heart
                      color={item.isFavorite ? theme.colors.accent : theme.colors.subtle}
                      fill={item.isFavorite ? theme.colors.accent : "none"}
                      size={20}
                    />
                  </Pressable>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={{ flexDirection: "row", gap: 6, flex: 1, flexWrap: "wrap" }}>
                  {item.tags.map((tag) => (
                    <View key={tag} style={[styles.tag, { backgroundColor: `${theme.colors.accent}12` }]}>
                      <Text style={[styles.tagText, { color: theme.colors.accent, fontWeight: "800" }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Video color={theme.colors.subtle} size={13} />
                <Text style={[styles.source, { color: theme.colors.subtle, fontWeight: "700", flex: 1 }]} numberOfLines={1}>
                  {item.sourceVideoTitle}
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
  favBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
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
  clearBtn: {
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
  inlineAction: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  enText: {
    lineHeight: 24,
  },
  zhText: {
    lineHeight: 20,
  },
  cardFooter: {
    gap: 10,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 10,
  },
  source: {
    fontSize: 11,
    marginTop: 4,
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
