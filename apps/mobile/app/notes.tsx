import { useState, useMemo } from "react";
import { FlatList, Pressable, Text, View, StyleSheet, TextInput, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Trash2, Search, Clock, StickyNote } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Screen } from "@/components/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotes, deleteNote } from "@/lib/api";
import { formatTime } from "@teach-player/shared";

export default function NotesScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all user notes
  const { data: notes, isLoading } = useQuery({
    queryKey: ["user-notes", accessToken],
    queryFn: () => getNotes(accessToken),
    enabled: Boolean(accessToken),
  });

  // Delete note mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId, accessToken),
    onSuccess: () => {
      haptics.success();
      queryClient.invalidateQueries({ queryKey: ["user-notes", accessToken] });
    },
    onError: (error) => {
      haptics.error();
      Alert.alert("删除失败", error instanceof Error ? error.message : "无法删除笔记");
    },
  });

  const handleDeletePress = (noteId: string) => {
    haptics.medium();
    Alert.alert(
      "删除笔记",
      "您确定要删除这条学习笔记吗？此操作不可撤销。",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确认删除",
          style: "destructive",
          onPress: () => deleteMutation.mutate(noteId),
        },
      ]
    );
  };

  // Filter notes by search query
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (searchQuery.trim() === "") return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (note) =>
        note.body.toLowerCase().includes(q) ||
        note.videoTitle?.toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => { haptics.light(); router.back(); }}
            style={styles.backButton}
          >
            <ArrowLeft color={theme.colors.text} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>笔记本</Text>
          <View style={{ width: 40 }} /> {/* balance back button */}
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { paddingHorizontal: theme.spacing.page }]}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.colors.surfaceRaised, borderRadius: theme.radius.md }]}>
            <Search color={theme.colors.subtle} size={18} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="搜索笔记内容或视频标题..."
              placeholderTextColor={theme.colors.subtle}
              style={[styles.searchInput, { color: theme.colors.text }]}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => { haptics.light(); setSearchQuery(""); }}
                hitSlop={8}
                style={{ padding: 4 }}
              >
                <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "600" }}>清除</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Loading Indicator or List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={theme.colors.accent} size="small" />
            <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 8 }}>正在获取笔记...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotes}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.page, paddingBottom: 40, gap: 14 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <StickyNote color={theme.colors.subtle} size={48} strokeWidth={1.5} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyText, { color: theme.colors.muted }]}>
                  {searchQuery ? "未找到匹配的笔记" : "您的笔记本还是空的\n在观看视频时记录您的第一条笔记吧！"}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  haptics.success();
                  router.push({ pathname: `/video/${item.videoId}` });
                }}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.lg,
                    borderWidth: 1.5,
                    opacity: pressed ? 0.92 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text selectable style={[styles.noteBody, { color: theme.colors.text }]}>
                      {item.body}
                    </Text>
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleDeletePress(item.id);
                    }}
                    hitSlop={12}
                    style={styles.deleteBtn}
                  >
                    <Trash2 color={theme.colors.subtle} size={16} />
                  </Pressable>
                </View>

                <View style={[styles.cardFooter, { borderTopColor: theme.colors.border }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                    <Text style={[styles.videoTitleText, { color: theme.colors.warm }]} numberOfLines={1}>
                      🎥 {item.videoTitle || "未命名视频"}
                    </Text>
                  </View>
                  
                  {typeof item.timestampSeconds === "number" && (
                    <View style={[styles.timestampBadge, { backgroundColor: `${theme.colors.blue}12` }]}>
                      <Clock color={theme.colors.blue} size={12} style={{ marginRight: 4 }} />
                      <Text style={[styles.timestampText, { color: theme.colors.blue }]}>
                        {formatTime(item.timestampSeconds)}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            )}
          />
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
    letterSpacing: 0.5,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  card: {
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  noteBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 12,
  },
  videoTitleText: {
    fontSize: 12,
    fontWeight: "800",
  },
  timestampBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timestampText: {
    fontSize: 11,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "600",
  },
});
