import { useState, useMemo } from "react";
import { FlatList, Pressable, ScrollView, Text, View, StyleSheet, TextInput, Modal, Alert } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Heart, SlidersHorizontal, BarChart2, Check, Volume2, VolumeX } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { useSpeech } from "@/hooks/use-speech";
import { Screen } from "@/components/ui";
import { INITIAL_WORDS, type MockWord } from "@/lib/mock-data";
import { SafeAreaView } from "react-native-safe-area-context";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/providers/auth-provider";
import { getVocabulary, deleteVocabulary } from "@/lib/api";

export default function WordsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { accessToken } = useAuth();
  const { speak, speaking, currentText } = useSpeech();

  // Words state persisted
  const [words, setWords] = useStorageState<MockWord[]>("settings:my-words-list", INITIAL_WORDS);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter settings
  const [langFilter, setLangFilter] = useStorageState<"all" | "en100">("words:filter-lang", "all");
  const [sortMethod, setSortMethod] = useStorageState<"newest" | "oldest" | "az" | "za" | "high" | "low">(
    "words:filter-sort",
    "newest"
  );

  const vocabQuery = useQuery({
    queryKey: ["user-vocabulary"],
    queryFn: () => getVocabulary(accessToken),
    enabled: Boolean(accessToken),
  });

  const apiWords = useMemo(() => {
    return (vocabQuery.data ?? []).map((item) => ({
      id: item.id,
      lemma: item.lemma,
      phonetic: item.phonetic ?? "",
      phoneticUk: item.phonetic ?? "",
      phoneticUs: item.phonetic ?? "",
      partOfSpeech: item.partOfSpeech ?? "",
      definitionZh: item.definitionZh,
      definitionZhFull: item.definitionZh,
      exampleEn: item.exampleEn ?? undefined,
      exampleZh: item.exampleZh ?? undefined,
      occurrences: 1,
      date: item.createdAt.split("T")[0],
      isFavorite: false,
    }));
  }, [vocabQuery.data]);

  const combinedWords = useMemo(() => {
    const mergedMap = new Map<string, MockWord>();
    
    // Local words first
    words.forEach((w) => mergedMap.set(w.lemma.toLowerCase(), w));
    
    // API words overwrite or add
    apiWords.forEach((aw) => {
      const key = aw.lemma.toLowerCase();
      const existing = mergedMap.get(key);
      if (existing) {
        mergedMap.set(key, {
          ...existing,
          id: aw.id, // Use server ID for deletion
          definitionZh: aw.definitionZh,
        });
      } else {
        mergedMap.set(key, aw);
      }
    });

    return Array.from(mergedMap.values());
  }, [words, apiWords]);

  const toggleFavoriteWord = (wordId: string) => {
    haptics.selection();
    setWords(
      words.map((w) => (w.id === wordId ? { ...w, isFavorite: !w.isFavorite } : w))
    );
  };

  const handleDeleteWord = (item: MockWord) => {
    haptics.medium();
    Alert.alert("删除单词", `确定要从生词本中删除 "${item.lemma}" 吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          try {
            // Remove locally
            setWords(words.filter((w) => w.lemma.toLowerCase() !== item.lemma.toLowerCase()));
            
            // Remove from server if token present
            if (accessToken) {
              await deleteVocabulary(item.id, accessToken);
              vocabQuery.refetch();
            }
            haptics.success();
          } catch (e: any) {
            Alert.alert("错误", e?.message || "删除失败");
          }
        },
      },
    ]);
  };

  const handleResetFilters = () => {
    haptics.medium();
    setLangFilter("all");
    setSortMethod("newest");
  };

  // Filter & Sort Logic
  const filteredWords = useMemo(() => {
    let result = [...combinedWords];

    // Filter by favorites toggle in header
    if (showOnlyFavorites) {
      result = result.filter((w) => w.isFavorite);
    }

    // Filter by search query
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter((w) => w.lemma.toLowerCase().includes(q) || w.definitionZh.toLowerCase().includes(q));
    }

    // Filter by language filter (simulation)
    if (langFilter === "en100") {
      result = result.filter((w) => w.lemma.length <= 5); // Mock heuristic for English 100
    }

    // Sorting
    result.sort((a, b) => {
      if (sortMethod === "newest") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortMethod === "oldest") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortMethod === "az") {
        return a.lemma.localeCompare(b.lemma);
      }
      if (sortMethod === "za") {
        return b.lemma.localeCompare(a.lemma);
      }
      if (sortMethod === "high") {
        return b.occurrences - a.occurrences;
      }
      if (sortMethod === "low") {
        return a.occurrences - b.occurrences;
      }
      return 0;
    });

    return result;
  }, [combinedWords, showOnlyFavorites, searchQuery, langFilter, sortMethod]);

  const handleWordRowPress = (lemma: string) => {
    haptics.success();
    // Navigate to word detail page
    router.push(`/words/${lemma}`);
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
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>单词</Text>
          <Pressable
            onPress={() => {
              haptics.medium();
              setShowOnlyFavorites(!showOnlyFavorites);
            }}
            style={styles.favoritesToggleBtn}
          >
            <Heart
              color={showOnlyFavorites ? theme.colors.accent : theme.colors.text}
              size={22}
              fill={showOnlyFavorites ? theme.colors.accent : "none"}
            />
          </Pressable>
        </View>

        {/* Search Bar + Filter */}
        <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.page }]}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索单词或翻译..."
              placeholderTextColor={theme.colors.subtle}
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
            <Pressable
              onPress={() => {
                haptics.light();
                setIsFilterOpen(true);
              }}
              style={styles.filterBtn}
            >
              <SlidersHorizontal color={theme.colors.muted} size={18} />
            </Pressable>
          </View>
        </View>

        {/* Word Rows List */}
        <FlatList
          data={filteredWords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.page,
            paddingBottom: 40,
            gap: 16,
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                {showOnlyFavorites ? "暂无收藏的单词" : "单词本为空"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleWordRowPress(item.lemma)}
              onLongPress={() => handleDeleteWord(item)}
              style={({ pressed }) => [
                styles.wordRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.lg,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  borderWidth: 1.5,
                  padding: 16,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.06,
                  shadowRadius: 10,
                  elevation: 2,
                },
              ]}
            >
              {/* Row Upper Info */}
              <View style={styles.wordHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
                  <Text style={[styles.wordText, { color: theme.colors.accent }]}>{item.lemma}</Text>
                  {/* 语音播放按鈕 */}
                  <Pressable
                    hitSlop={8}
                    onPress={(e) => {
                      e.stopPropagation();
                      haptics.light();
                      speak(item.lemma, "en-US");
                    }}
                    style={{ padding: 4 }}
                  >
                    {speaking && currentText === item.lemma ? (
                      <VolumeX color={theme.colors.accent} size={16} />
                    ) : (
                      <Volume2 color={theme.colors.muted} size={16} />
                    )}
                  </Pressable>
                  {item.phonetic ? (
                    <Text style={[styles.phoneticText, { color: theme.colors.subtle }]}>
                      {item.phonetic}
                    </Text>
                  ) : null}
                  {item.partOfSpeech ? (
                    <View style={[styles.posBadge, { backgroundColor: `${theme.colors.accent}12` }]}>
                      <Text style={[styles.posBadgeText, { color: theme.colors.accent }]}>{item.partOfSpeech}</Text>
                    </View>
                  ) : null}
                </View>
                
                {/* Favorites Heart */}
                <Pressable
                  onPress={() => toggleFavoriteWord(item.id)}
                  hitSlop={8}
                  style={styles.heartBtn}
                >
                  <Heart
                    color={item.isFavorite ? theme.colors.accent : theme.colors.subtle}
                    fill={item.isFavorite ? theme.colors.accent : "none"}
                    size={20}
                  />
                </Pressable>
              </View>

              {/* Definition */}
              <Text numberOfLines={2} style={[styles.defText, { color: theme.colors.text, marginTop: 4, fontSize: 14, fontWeight: "700" }]}>
                {item.definitionZh}
              </Text>

              {/* Row Lower Stats */}
              <View style={[styles.wordFooter, { marginTop: 6 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <BarChart2 color={theme.colors.accent} size={14} />
                    <Text style={[styles.statsText, { color: theme.colors.muted, fontWeight: "700" }]}>
                      出现 {item.occurrences} 次
                    </Text>
                  </View>
                  <Text style={[styles.statsText, { color: theme.colors.subtle }]}>
                    ·  收集于 {item.date}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        />

        {/* Filter Dialog Overlay Bottom Sheet */}
        {isFilterOpen && (
          <Modal
            visible={isFilterOpen}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setIsFilterOpen(false)}
          >
            <Pressable
              style={styles.overlay}
              onPress={() => {
                haptics.light();
                setIsFilterOpen(false);
              }}
            >
              <View style={[styles.sheetContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                {/* Sheet Header */}
                <View style={styles.sheetHeader}>
                  <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>搜索过滤</Text>
                  <Pressable
                    onPress={() => {
                      haptics.success();
                      setIsFilterOpen(false);
                    }}
                  >
                    <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: "900" }}>完成</Text>
                  </Pressable>
                </View>

                {/* Filters Content */}
                <ScrollView contentContainerStyle={{ paddingHorizontal: 24, gap: 20 }}>
                  
                  {/* Language Section */}
                  <View style={{ gap: 8 }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.muted }]}>语言过滤</Text>
                    
                    <Pressable
                      onPress={() => {
                        haptics.selection();
                        setLangFilter("all");
                      }}
                      style={[styles.filterOption, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}
                    >
                      <Text style={[styles.optionText, { color: theme.colors.text }]}>全部语言</Text>
                      {langFilter === "all" && <Check color={theme.colors.accent} size={18} />}
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        haptics.selection();
                        setLangFilter("en100");
                      }}
                      style={[styles.filterOption, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}
                    >
                      <Text style={[styles.optionText, { color: theme.colors.text }]}>English 100</Text>
                      {langFilter === "en100" && <Check color={theme.colors.accent} size={18} />}
                    </Pressable>
                  </View>

                  {/* Sort Section */}
                  <View style={{ gap: 8, paddingBottom: 24 }}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.muted }]}>排序方式</Text>
                    {[
                      { key: "newest", label: "最新优先" },
                      { key: "oldest", label: "最旧优先" },
                      { key: "az", label: "A-Z" },
                      { key: "za", label: "Z-A" },
                      { key: "high", label: "频率最高" },
                      { key: "low", label: "频率最低" },
                    ].map((opt) => (
                      <Pressable
                        key={opt.key}
                        onPress={() => {
                          haptics.selection();
                          setSortMethod(opt.key as any);
                        }}
                        style={[styles.filterOption, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}
                      >
                        <Text style={[styles.optionText, { color: theme.colors.text }]}>{opt.label}</Text>
                        {sortMethod === opt.key && <Check color={theme.colors.accent} size={18} />}
                      </Pressable>
                    ))}
                  </View>

                  {/* Reset Button */}
                  <Pressable
                    onPress={handleResetFilters}
                    style={{
                      alignItems: "center",
                      paddingVertical: 12,
                      marginTop: 10,
                    }}
                  >
                    <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: "900" }}>
                      重置过滤器
                    </Text>
                  </Pressable>

                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        )}
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
  favoritesToggleBtn: {
    width: 40,
    height: 40,
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
  filterBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  wordRow: {
    paddingVertical: 14,
    gap: 6,
  },
  wordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wordText: {
    fontSize: 18,
    fontWeight: "900",
  },
  phoneticText: {
    fontSize: 14,
    fontWeight: "500",
  },
  heartBtn: {
    padding: 4,
  },
  defText: {
    fontSize: 14,
    lineHeight: 20,
  },
  wordFooter: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: {
    fontSize: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingBottom: 48,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 4,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "700",
  },
  posBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "center",
  },
  posBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
