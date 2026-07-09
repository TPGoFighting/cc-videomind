import { Image, Pressable, StyleSheet, Text, View, Dimensions } from "react-native";
import { router } from "expo-router";
import { Play, Book, Quote, Notebook } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useStorageState } from "@/hooks/use-storage-state";
import { ParsingStatusButton } from "@/components/parsing-status-button";
import { Screen } from "@/components/ui";
import { DEFAULT_USER_AVATAR } from "@/lib/user-profile";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 40 - 12) / 2;

export default function CorpusDashboardScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [avatarUri] = useStorageState<string | null>("user:avatar-uri", null);

  const handleCardPress = (target: string) => {
    haptics.selection();
    if (target === "media") {
      router.push("/media");
    } else if (target === "words") {
      router.push("/words");
    } else if (target === "sentences") {
      router.push("/sentences");
    } else if (target === "notes") {
      router.push("/notes");
    }
  };

  const gridItems = [
    { id: "media", title: "媒体", icon: Play, color: theme.colors.accent },
    { id: "words", title: "单词", icon: Book, color: theme.colors.blue },
    { id: "sentences", title: "句子", icon: Quote, color: theme.colors.success },
    { id: "notes", title: "笔记", icon: Notebook, color: theme.colors.gold },
  ];

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
            style={[styles.avatarButton, { backgroundColor: theme.colors.surfaceRaised, overflow: "hidden" }]}
          >
            <Image
              source={avatarUri ? { uri: avatarUri } : DEFAULT_USER_AVATAR}
              style={{ width: 38, height: 38, borderRadius: 19, resizeMode: "cover" }}
            />
          </Pressable>

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>语料</Text>

          <ParsingStatusButton />
        </View>

        {/* Grid List */}
        <View style={styles.gridContainer}>
          {gridItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <Pressable
                key={item.id}
                onPress={() => handleCardPress(item.id)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radius.lg,
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                  },
                ]}
              >
                {/* Icon Circle Container */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: `${item.color}15`,
                    },
                  ]}
                >
                  <IconComponent color={item.color} size={22} fill={item.id === "media" ? item.color : "none"} />
                </View>

                {/* Card Title */}
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  {item.title}
                </Text>
              </Pressable>
            );
          })}
        </View>
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
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "900",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    height: 126,
    padding: 18,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
  },
});
