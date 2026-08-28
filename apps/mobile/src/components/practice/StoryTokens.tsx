import { Text, View } from "react-native";
import { useTheme } from "@/providers/theme-provider";

interface StoryTokensProps {
  tokens: string[];
  blankIndex: number;
  correctAnswer: string;
  isSubmitted: boolean;
  isCorrect: boolean | null;
  translationZh?: string;
  accent: string;
}

/**
 * 故事填空句子 Token 渲染组件
 * 将句子拆成单词气泡，空格位高亮显示
 */
export function StoryTokens({
  tokens,
  blankIndex,
  correctAnswer,
  isSubmitted,
  isCorrect,
  translationZh,
  accent,
}: StoryTokensProps) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderBottomColor: theme.colors.surfaceRaised,
        borderBottomWidth: 5,
        backgroundColor: theme.colors.surface,
        padding: 20,
        gap: 12,
      }}
    >
      {/* Token 流式排列 */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {tokens.map((token, i) => {
          const isBlank = i === blankIndex;
          let wordText = token;
          if (isBlank && isSubmitted) {
            wordText = correctAnswer;
          }

          let tokenBg = "transparent";
          let tokenBorder = "transparent";
          let tokenShadow = "transparent";
          let borderBottomWidth = 0;
          let textColor = theme.colors.text;

          if (isBlank) {
            borderBottomWidth = 3;
            if (isSubmitted) {
              tokenBg = isCorrect ? `${theme.colors.success}15` : `${theme.colors.danger}15`;
              tokenBorder = isCorrect ? theme.colors.success : theme.colors.danger;
              tokenShadow = isCorrect ? theme.colors.success : theme.colors.danger;
              textColor = isCorrect ? theme.colors.success : theme.colors.danger;
            } else {
              tokenBg = `${accent}12`;
              tokenBorder = accent;
              tokenShadow = accent;
              textColor = accent;
            }
          }

          return (
            <View
              key={i}
              style={{
                paddingHorizontal: isBlank ? 10 : 4,
                paddingVertical: isBlank ? 4 : 2,
                borderRadius: isBlank ? theme.radius.sm : 0,
                backgroundColor: tokenBg,
                borderWidth: isBlank ? 1.5 : 0,
                borderColor: tokenBorder,
                borderBottomColor: tokenShadow,
                borderBottomWidth: borderBottomWidth,
              }}
            >
              <Text
                style={{
                  color: textColor,
                  fontSize: 16,
                  fontWeight: isBlank ? "900" : "600",
                  lineHeight: 24,
                }}
              >
                {wordText}
              </Text>
            </View>
          );
        })}
      </View>

      {translationZh ? (
        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: "600" }}>
          译: {translationZh}
        </Text>
      ) : null}
    </View>
  );
}
