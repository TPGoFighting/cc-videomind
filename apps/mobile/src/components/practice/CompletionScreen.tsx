import { Image, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { Award, Trophy, Zap } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Screen } from "@/components/ui";

interface CompletionScreenProps {
  correctCount: number;
  totalQuestions: number;
  coins: number;
  streak: number;
  accent: string;
  onBack: () => void;
}

/**
 * 通关成就页
 */
export function CompletionScreen({ correctCount, totalQuestions, coins, streak, accent, onBack }: CompletionScreenProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.trophyOrb, { backgroundColor: `${theme.colors.gold}12` }]}>
              <Image
                source={require("../../../assets/mascot-complete.png")}
                accessibilityLabel="完成复习的小助手"
                style={styles.completionMascot}
              />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>通关挑战成功！</Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              恭喜你完成了这组专属的个性化语料练习！
            </Text>
          </View>

          {/* 3-column stats */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Award color={theme.colors.accent} size={24} strokeWidth={2.5} />
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>正确率</Text>
              <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                {Math.round((correctCount / totalQuestions) * 100)}%
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Zap color={theme.colors.blue} size={24} strokeWidth={2.5} />
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>经验获得</Text>
              <Text style={[styles.statValue, { color: theme.colors.blue }]}>+{correctCount * 10} XP</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Trophy color={theme.colors.gold} size={24} strokeWidth={2.5} />
              <Text style={[styles.statLabel, { color: theme.colors.muted }]}>金币奖励</Text>
              <Text style={[styles.statValue, { color: theme.colors.gold }]}>+{coins}</Text>
            </View>
          </View>

          {/* Streak Widget */}
          <View style={[styles.streakWidget, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.streakAvatar}>
              <Text style={{ fontSize: 28 }}>🔥</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.streakTitle, { color: theme.colors.text }]}>持续自律 review 打卡！</Text>
              <Text style={[styles.streakSub, { color: theme.colors.muted }]}>
                你已经连续坚持打卡 {streak} 天，科学的脑神经突触需要每日激活，继续保持！
              </Text>
            </View>
          </View>

          {/* Back button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回学习路径"
            onPress={() => { haptics.medium(); onBack(); }}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: accent,
                borderBottomColor: "rgba(0,0,0,0.2)",
                width: "100%",
                transform: [{ translateY: pressed ? 3 : 0 }],
                borderBottomWidth: pressed ? 2 : 5,
                marginTop: 20,
              }
            ]}
          >
            <Text style={styles.primaryBtnText}>返回学习路径</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, alignItems: "center", justifyContent: "center", gap: 24, paddingBottom: 40 },
  header: { alignItems: "center", gap: 14, marginTop: 10 },
  trophyOrb: {
    width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center",
    shadowColor: "#FFC800", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  completionMascot: {
    width: 132,
    height: 132,
    resizeMode: "contain",
  },
  title: { fontSize: 28, fontWeight: "900", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontWeight: "700", textAlign: "center", lineHeight: 22 },
  statsGrid: { flexDirection: "row", width: "100%", justifyContent: "space-between", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 18, borderWidth: 1.5, paddingVertical: 16, paddingHorizontal: 8,
    alignItems: "center", gap: 6,
  },
  statLabel: { fontSize: 12, fontWeight: "900" },
  statValue: { fontSize: 16, fontWeight: "900" },
  streakWidget: {
    flexDirection: "row", alignItems: "center", width: "100%", borderRadius: 20,
    borderWidth: 1.5, padding: 16, gap: 14,
  },
  streakAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,159,28,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  streakTitle: { fontSize: 15, fontWeight: "900" },
  streakSub: { fontSize: 12, fontWeight: "700", lineHeight: 18 },
  primaryBtn: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  primaryBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
});
