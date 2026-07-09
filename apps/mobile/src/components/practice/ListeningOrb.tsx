import { Pressable, Text, View } from "react-native";
import { Volume2 } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";

interface ListeningOrbProps {
  accent: string;
  isPlaying: boolean;
  onPlay: () => void;
}

/**
 * 听力练习音频播放球
 * 包含脉冲环动画和点击播放功能
 */
export function ListeningOrb({ accent, isPlaying, onPlay }: ListeningOrbProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  return (
    <View
      style={{
        alignItems: "center",
        gap: 16,
        paddingVertical: 24,
        borderRadius: theme.radius.lg,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderBottomColor: theme.colors.surfaceRaised,
        borderBottomWidth: 5,
        backgroundColor: theme.colors.surface,
      }}
    >
      <View style={{ alignItems: "center", justifyContent: "center", width: 120, height: 120 }}>
        {/* 外圈脉冲环 */}
        <View
          style={{
            position: "absolute",
            width: 110,
            height: 110,
            borderRadius: 55,
            borderWidth: 2,
            borderColor: `${accent}15`,
          }}
        />
        {/* 内圈脉冲环 */}
        <View
          style={{
            position: "absolute",
            width: 90,
            height: 90,
            borderRadius: 45,
            borderWidth: 2,
            borderColor: `${accent}25`,
          }}
        />

        {/* 播放球 */}
        <Pressable
          onPress={() => {
            haptics.medium();
            onPlay();
          }}
          style={({ pressed }) => ({
            width: 72,
            height: 72,
            borderRadius: 36,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isPlaying ? "#EF4444" : accent,
            transform: [{ scale: pressed || isPlaying ? 0.94 : 1 }],
            shadowColor: accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 12,
            elevation: 8,
          })}
        >
          <Volume2 color="#FFFFFF" size={32} strokeWidth={2.5} />
        </Pressable>
      </View>

      <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: "600" }}>
        点击上面的声波播放原音音频
      </Text>
    </View>
  );
}
