import { Pressable, Text, View, StyleSheet } from "react-native";
import { Check, X } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";

interface FeedbackBarProps {
  isCorrect: boolean;
  correctAnswer: string;
  reward: string;
  /** 错题提示（例句等） */
  tipEn?: string;
  tipZh?: string;
  accent: string;
  accentDark: string;
  onContinue: () => void;
}

/**
 * 底部答题反馈栏：正确/错误结果 + 继续按钮
 */
export function FeedbackBar({
  isCorrect,
  correctAnswer,
  reward,
  tipEn,
  tipZh,
  accent,
  accentDark,
  onContinue,
}: FeedbackBarProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: isCorrect ? theme.colors.success : theme.colors.danger,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
        {/* 状态图标 */}
        <View style={[styles.iconBg, { backgroundColor: isCorrect ? `${theme.colors.success}18` : `${theme.colors.danger}18` }]}>
          {isCorrect ? (
            <Check color={theme.colors.success} size={24} strokeWidth={3.5} />
          ) : (
            <X color={theme.colors.danger} size={24} strokeWidth={3.5} />
          )}
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.title, { color: isCorrect ? theme.colors.success : theme.colors.danger }]}>
            {isCorrect ? "回答正确！极佳！" : "解析错误，继续加油"}
          </Text>
          <Text style={[styles.sub, { color: theme.colors.text }]}>
            {isCorrect ? `获得 ${reward} 经验值与双倍金币！` : `正确答案: ${correctAnswer}`}
          </Text>

          {/* 错题提示 */}
          {!isCorrect && (
            <View style={[styles.citation, { backgroundColor: theme.colors.surfaceRaised }]}>
              <Text style={[styles.citationTitle, { color: theme.colors.text }]}>💡 语料库小贴士</Text>
              <Text style={[styles.citationDesc, { color: theme.colors.muted }]}>
                {tipEn ? `例句: "${tipEn}"` : "本句出自您的专属收藏库。建议多回顾该句所在的视频大课巩固记忆。"}
              </Text>
              {tipZh ? (
                <Text style={[styles.citationZh, { color: theme.colors.subtle }]}>译: {tipZh}</Text>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="继续下一道练习"
        onPress={onContinue}
        style={({ pressed }) => [
          styles.continueBtn,
          {
            backgroundColor: isCorrect ? theme.colors.success : theme.colors.danger,
            borderBottomColor: isCorrect ? accentDark : "rgba(0,0,0,0.2)",
            transform: [{ translateY: pressed ? 3 : 0 }],
            borderBottomWidth: pressed ? 2 : 5,
          }
        ]}
      >
        <Text style={styles.continueBtnText}>继续练习</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 28, paddingTop: 20,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 4,
    shadowColor: "#000000", shadowOpacity: 0.15, shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 }, elevation: 10, gap: 18,
  },
  iconBg: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { fontSize: 14, fontWeight: "800" },
  citation: { marginTop: 10, padding: 12, borderRadius: 14, gap: 6 },
  citationTitle: { fontSize: 12, fontWeight: "900" },
  citationDesc: { fontSize: 12, fontWeight: "700", lineHeight: 16 },
  citationZh: { fontSize: 11, fontWeight: "600" },
  continueBtn: { minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", width: "100%" },
  continueBtnText: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
});
