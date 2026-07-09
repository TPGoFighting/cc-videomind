import { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Heart, Search } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { Screen } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";

interface Phrase {
  id: string;
  phrase: string;
  translation: string;
  sourceVideoTitle: string;
  sourceVideoId: string;
  collectedAt: string;
  isFavorite: boolean;
}

const INITIAL_PHRASES: Phrase[] = [
  {
    id: "p1",
    phrase: "break the ice",
    translation: "打破沉默；破冰",
    sourceVideoTitle: "How to Build Self-Discipline",
    sourceVideoId: "mwOB_pVNI1c",
    collectedAt: "2026-05-22",
    isFavorite: false,
  },
  {
    id: "p2",
    phrase: "hit the ground running",
    translation: "迅速开展工作；快马加鞭地开始",
    sourceVideoTitle: "The Ultimate Guide to Active Recall",
    sourceVideoId: "LOn-mmezykQ",
    collectedAt: "2026-05-19",
    isFavorite: true,
  },
  {
    id: "p3",
    phrase: "think outside the box",
    translation: "跳出思维定式；创造性思考",
    sourceVideoTitle: "Elon Musk: The Future of Humanity",
    sourceVideoId: "Rni7Fz7208c",
    collectedAt: "2026-05-20",
    isFavorite: false,
  },
  {
    id: "p4",
    phrase: "a blessing in disguise",
    translation: "因祸得福",
    sourceVideoTitle: "The Daily Stoic",
    sourceVideoId: "oX7OduG1YmI",
    collectedAt: "2026-05-11",
    isFavorite: false,
  },
  {
    id: "p5",
    phrase: "go the extra mile",
    translation: "加倍努力；付出额外的努力",
    sourceVideoTitle: "How to Read 100 Books a Year",
    sourceVideoId: "R2meHtrO1n8",
    collectedAt: "2026-05-01",
    isFavorite: true,
  },
];

export default function PhrasesScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [phrases, setPhrases] = useStorageState<Phrase[]>("settings:my-phrases-list", INITIAL_PHRASES);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFavorite = (id: string) => {
    haptics.selection();
    setPhrases(phrases.map((p) => (p.id === id ? { ...p, isFavorite: !p.isFavorite } : p)));
  };

  const filtered = useMemo(() => {
    let result = [...phrases];
    if (showOnlyFavorites) result = result.filter((p) => p.isFavorite);
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) => p.phrase.toLowerCase().includes(q) || p.translation.toLowerCase().includes(q)
      );
    }
    return result;
  }, [phrases, showOnlyFavorites, searchQuery]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={() => { haptics.light(); router.back(); }} style={styles.backBtn}>
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.text }]}>短语本</Text>
          <Pressable
            onPress={() => { haptics.medium(); setShowOnlyFavorites(!showOnlyFavorites); }}
            style={styles.backBtn}
          >
            <Heart
              color={showOnlyFavorites ? theme.colors.accent : theme.colors.text}
              size={22}
              fill={showOnlyFavorites ? theme.colors.accent : "none"}
            />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <View style={[styles.searchBox, { backgroundColor: theme.colors.surfaceRaised }]}>
            <Search color={theme.colors.muted} size={16} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索短语..."
              placeholderTextColor={theme.colors.subtle}
              style={[styles.input, { color: theme.colors.text }]}
            />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 12 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>暂无短语</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { haptics.success(); router.push(`/video/${item.sourceVideoId}`); }}
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
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 2,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.phraseText, { color: theme.colors.text }]}>{item.phrase}</Text>
                  <Text style={[styles.transText, { color: theme.colors.muted }]}>{item.translation}</Text>
                </View>
                <Pressable onPress={() => toggleFavorite(item.id)} hitSlop={8} style={{ padding: 4 }}>
                  <Heart
                    color={item.isFavorite ? theme.colors.accent : theme.colors.subtle}
                    fill={item.isFavorite ? theme.colors.accent : "none"}
                    size={20}
                  />
                </Pressable>
              </View>
              <Text style={{ color: theme.colors.subtle, fontSize: 11, marginTop: 8, fontWeight: "700" }} numberOfLines={1}>
                🎥 {item.sourceVideoTitle}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  backBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "900" },
  searchBox: { flexDirection: "row", alignItems: "center", height: 48, paddingHorizontal: 14, borderRadius: 12 },
  input: { flex: 1, height: "100%", fontSize: 14 },
  card: { padding: 16, gap: 12 },
  phraseText: { fontSize: 16, fontWeight: "800" },
  transText: { fontSize: 14, marginTop: 2, lineHeight: 20, fontWeight: "600" },
  empty: { paddingVertical: 60, alignItems: "center" },
});
