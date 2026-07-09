import { Pressable, Text, View } from "react-native";
import { Volume2 } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import type { MockWord } from "@/lib/mock-data";

interface WordsCardProps {
  word: string;
  phonetic?: string;
  accent: string;
  onPronounce?: () => void;
}

/**
 * 词汇练习闪卡：显示单词 + 音标 + 朗读按钮
 */
export function WordsCard({ word, phonetic, accent, onPronounce }: WordsCardProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  return (
    <View
      style={{
        borderRadius: theme.radius.lg,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderBottomColor: theme.colors.surfaceRaised,
        borderBottomWidth: 5,
        backgroundColor: theme.colors.surface,
        padding: 28,
        alignItems: "center",
        gap: 14,
      }}
    >
      <Text
        style={{
          color: theme.colors.text,
          fontSize: 34,
          fontWeight: "900",
          letterSpacing: -0.5,
          textAlign: "center",
        }}
      >
        {word}
      </Text>

      <Pressable
        onPress={() => {
          haptics.light();
          onPronounce?.();
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: theme.radius.full,
          backgroundColor: pressed ? `${accent}25` : `${accent}12`,
          borderWidth: 1,
          borderColor: `${accent}30`,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        })}
      >
        <Volume2 color={accent} size={15} strokeWidth={2.5} />
        <Text style={{ color: accent, fontSize: 15, fontWeight: "700" }}>
          {phonetic ? `/${phonetic}/` : "发音"}
        </Text>
      </Pressable>
    </View>
  );
}
