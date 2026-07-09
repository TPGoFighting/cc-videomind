import { Pressable, Text, View, StyleSheet } from "react-native";
import { Sparkles } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Screen } from "@/components/ui";

interface GameOverScreenProps {
  accent: string;
  onRetry: () => void;
}

/**
 * 生命值耗尽结束页
 */
export function GameOverScreen({ accent, onRetry }: GameOverScreenProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 24 }}>
          {/* Broken heart orb */}
          <View style={[styles.gameOverOrb, { backgroundColor: `${theme.colors.danger}15` }]}>
            <Text style={{ fontSize: 72 }}>💔</Text>
          </View>

          <View style={{ alignItems: "center", gap: 8 }}>
            <Text style={[styles.title, { color: theme.colors.text }]}>生命值耗尽</Text>
            <Text style={[styles.subtitle, { color: theme.colors.muted }]}>
              别气馁！科学记忆包含错题回练。每一次失败都是一次大脑突触连接的加深。
            </Text>
          </View>

          {/* Tips Widget */}
          <View style={[styles.tipsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Sparkles color={theme.colors.gold} size={22} strokeWidth={2.5} />
            <Text style={[styles.tipText, { color: theme.colors.text }]}>
              系统已自动将本次错题收集进入生词库，下次复习时将针对性重试。
            </Text>
          </View>

          <Pressable
            onPress={() => {
              haptics.medium();
              onRetry();
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              {
                backgroundColor: accent,
                borderBottomColor: "rgba(0,0,0,0.2)",
                width: "100%",
                transform: [{ translateY: pressed ? 3 : 0 }],
                borderBottomWidth: pressed ? 2 : 5,
                marginTop: 12,
              }
            ]}
          >
            <Text style={styles.primaryButtonText}>重新挑战</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gameOverOrb: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000000", shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  title: {
    fontSize: 28, fontWeight: "900", letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15, fontWeight: "700", textAlign: "center",
    maxWidth: 290, lineHeight: 22,
  },
  tipsCard: {
    flexDirection: "row", alignItems: "center", padding: 16,
    borderRadius: 18, borderWidth: 1.5, gap: 12, marginVertical: 10,
  },
  tipText: {
    fontSize: 13, fontWeight: "700", lineHeight: 18, flex: 1,
  },
  primaryButton: {
    minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF", fontSize: 17, fontWeight: "900",
  },
});
