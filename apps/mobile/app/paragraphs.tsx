import { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View, StyleSheet, TextInput } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, SlidersHorizontal, X, Video } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useStorageState } from "@/hooks/use-storage-state";
import { useHaptics } from "@/hooks/use-haptics";
import { EmptyState, Screen } from "@/components/ui";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

interface Paragraph {
  id: string;
  text: string;
  translation: string;
  sourceVideoTitle: string;
  sourceVideoId: string;
  collectedAt: string;
}

const INITIAL_PARAGRAPHS: Paragraph[] = [
  {
    id: "pg1",
    text: "Regular meditation doesn't just make you feel calmer in the moment. It actually changes the structure of your brain. Studies show that after just eight weeks of daily practice, the amygdala — the brain's fear center — actually shrinks, while the prefrontal cortex, responsible for decision-making and focus, grows thicker.",
    translation: "定期冥想不仅能让你在当下感到更平静，它实际上会改变你的大脑结构。研究表明，经过仅八周的每日练习，大脑的恐惧中枢杏仁核会缩小，而负责决策和专注的前额皮质则会变得更厚。",
    sourceVideoTitle: "10% Happier with Dan Harris",
    sourceVideoId: "vif8NQcjVf0",
    collectedAt: "2026-05-12",
  },
  {
    id: "pg2",
    text: "The difference between successful people and really successful people is that really successful people say no to almost everything. Focus is about saying no. It's not about saying yes to the one thing — it's about saying no to the thousand other things that are good ideas.",
    translation: "成功人士和真正成功人士的区别在于，真正成功的人对几乎所有事情说「不」。专注就是关于说「不」。不是说对一件事说「是」，而是对一千个其他好主意说「不」。",
    sourceVideoTitle: "Elon Musk: The Future of Humanity",
    sourceVideoId: "Rni7Fz7208c",
    collectedAt: "2026-05-20",
  },
];

export default function ParagraphsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const insets = useSafeAreaInsets();
  const [paragraphs] = useStorageState<Paragraph[]>("settings:my-paragraphs-list", []);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    if (searchQuery.trim() === "") return paragraphs;
    const q = searchQuery.toLowerCase();
    return paragraphs.filter(
      (p) => p.text.toLowerCase().includes(q) || p.translation.toLowerCase().includes(q)
    );
  }, [paragraphs, searchQuery]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => { haptics.light(); router.back(); }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="返回上一页"
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.text }]}>段落本</Text>
          <View style={{ width: 48 }} />
        </View>

        <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.page }]}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索段落..."
              placeholderTextColor={theme.colors.subtle}
              returnKeyType="search"
              accessibilityLabel="搜索段落"
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="清除段落搜索"
              >
                <X color={theme.colors.muted} size={18} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => {
                haptics.light();
                setSearchQuery("");
              }}
              style={styles.filterBtn}
              accessibilityRole="button"
              accessibilityLabel="重置段落筛选"
            >
              <SlidersHorizontal color={theme.colors.muted} size={18} />
            </Pressable>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.page, paddingBottom: insets.bottom + 40, gap: 16 }}
          ListEmptyComponent={
            <EmptyState
              title="暂无段落"
              description="从视频字幕中收集内容后，会显示在这里。"
              actionLabel="去视频列表"
              onAction={() => router.replace("/")}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { haptics.success(); router.push(`/video/${item.sourceVideoId}`); }}
              accessibilityRole="button"
              accessibilityLabel={`打开来源视频：${item.sourceVideoTitle}`}
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
            >
              <Text style={[styles.enText, { color: theme.colors.accent, fontSize: 15, fontWeight: "700" }]}>{item.text}</Text>
              <Text style={[styles.zhText, { color: theme.colors.muted, fontSize: 13, fontWeight: "600" }]}>{item.translation}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                <Video color={theme.colors.subtle} size={13} />
                <Text style={{ color: theme.colors.subtle, fontSize: 11, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                  {item.sourceVideoTitle} · {item.collectedAt}
                </Text>
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
  backBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
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
  card: {
    padding: 16,
    gap: 10,
  },
  enText: {
    lineHeight: 24,
  },
  zhText: {
    lineHeight: 22,
  },
  empty: {
    paddingVertical: 60,
    alignItems: "center",
  },
});
