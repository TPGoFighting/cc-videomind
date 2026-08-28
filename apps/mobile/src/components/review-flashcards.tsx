import { useState, useRef } from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut
} from "react-native-reanimated";
import { Bookmark, BookmarkCheck, RotateCw, Sparkles, Check, Flame } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";

export interface FlashcardData {
  id: string;
  word: string;
  definitionZh: string;
  phonetic?: string;
  partOfSpeech?: string;
  contextSentence: string; // 挖空原句，如 "This video has exceptionally [_____] animations."
  videoTimestamp: number;
}

export function ReviewFlashcards({
  cards,
  onReviewSubmit
}: {
  cards: FlashcardData[];
  onReviewSubmit: (cardId: string, easeRating: "easy" | "good" | "hard") => void;
}) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // 3D 旋转角度 Shared Value
  const rotateY = useSharedValue(0);

  // 选项按钮果冻按压缩放
  const easyScale = useSharedValue(1);
  const goodScale = useSharedValue(1);
  const hardScale = useSharedValue(1);

  const activeCard = cards[currentIndex];

  const handleFlip = () => {
    haptics.selection();
    setIsFlipped(!isFlipped);
    rotateY.value = withSpring(isFlipped ? 0 : 180, {
      damping: 14,
      stiffness: 120
    });
  };

  const handleRating = (rating: "easy" | "good" | "hard") => {
    if (!activeCard) return;

    haptics.success();
    onReviewSubmit(activeCard.id, rating);

    // 重置旋转状态，滑入下一张
    setIsFlipped(false);
    rotateY.value = 0;

    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      haptics.success();
      setCurrentIndex(-1); // 复习完毕
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3D Y-Axis 视角翻转动画 Style
  // ═══════════════════════════════════════════════════════════════════════════════
  const frontAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY.value}deg` }
      ],
      opacity: rotateY.value > 90 ? withTiming(0) : withTiming(1)
    };
  });

  const backAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateY: `${rotateY.value - 180}deg` }
      ],
      opacity: rotateY.value > 90 ? withTiming(1) : withTiming(0)
    };
  });

  if (!activeCard || currentIndex === -1) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}
      >
        <Flame color={theme.colors.accent} size={48} strokeWidth={2.5} />
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>
          全部复习完成！
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 13, textAlign: "center", lineHeight: 18 }}>
          您今天的生词本艾宾浩斯复习卡片已经刷完了。继续保持这股学习热度！
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 12, gap: 16, minHeight: 400 }}>
      {/* 顶部指示条 */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>
          艾宾浩斯卡片复习 ({currentIndex + 1}/{cards.length})
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Sparkles color={theme.colors.accent} size={14} />
          <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "900" }}>Active Recall</Text>
        </View>
      </View>

      {/* 3D 闪卡容器 */}
      <View style={{ flex: 1, position: "relative", minHeight: 280 }}>
        {/* === A. 闪卡正面 (视频切片与挖空原句) === */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: theme.radius.xl,
              borderWidth: 1.5,
              borderColor: `${theme.colors.border}`,
              backgroundColor: theme.colors.surfaceRaised,
              padding: 24,
              gap: 16,
              justifyContent: "center",
              backfaceVisibility: "hidden"
            },
            frontAnimatedStyle
          ]}
        >
          <View style={{ alignSelf: "flex-start", borderRadius: theme.radius.full, backgroundColor: `${theme.colors.accent}18`, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: theme.colors.accent, fontSize: 10, fontWeight: "900" }}>▶ 视频情境切片挖空</Text>
          </View>

          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700", lineHeight: 28, textAlign: "center" }}>
            {activeCard.contextSentence}
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="翻转复习卡片查看释义"
            onPress={handleFlip}
            style={({ pressed }) => ({
              flexDirection: "row",
              gap: 6,
              alignSelf: "center",
              minHeight: 48,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.surface,
              borderWidth: 1.5,
              borderColor: theme.colors.border,
              transform: [{ scale: pressed ? 0.95 : 1 }]
            })}
          >
            <RotateCw size={14} color={theme.colors.accent} />
            <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: "800" }}>点击翻转卡片</Text>
          </Pressable>
        </Animated.View>

        {/* === B. 闪卡背面 (单词释义与场景释出) === */}
        <Animated.View
          style={[
            {
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: theme.radius.xl,
              borderWidth: 1.5,
              borderColor: `${theme.colors.accent}40`,
              backgroundColor: `${theme.colors.surface}DD`,
              padding: 24,
              gap: 12,
              justifyContent: "center",
              backfaceVisibility: "hidden",
              shadowColor: theme.colors.accent,
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.12,
              shadowRadius: 20
            },
            backAnimatedStyle
          ]}
        >
          <View style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: "900", letterSpacing: 0.5 }}>
              {activeCard.word}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline" }}>
              {activeCard.phonetic ? (
                <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{activeCard.phonetic}</Text>
              ) : null}
              {activeCard.partOfSpeech ? (
                <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "800" }}>
                  {activeCard.partOfSpeech}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, alignItems: "center" }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800", textAlign: "center" }}>
              {activeCard.definitionZh}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="翻转复习卡片查看原句"
            onPress={handleFlip}
            style={({ pressed }) => ({
              flexDirection: "row",
              gap: 6,
              alignSelf: "center",
              minHeight: 48,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.surfaceRaised,
              borderWidth: 1,
              borderColor: theme.colors.border,
              transform: [{ scale: pressed ? 0.95 : 1 }]
            })}
          >
            <RotateCw size={14} color={theme.colors.muted} />
            <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>查看正面</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* === C. 底部艾宾浩斯评级果冻按钮组 === */}
      {isFlipped ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={{ flexDirection: "row", gap: 8 }}
        >
          {/* 困难按钮 */}
          <Animated.View style={{ flex: 1, transform: [{ scale: hardScale }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="标记为困难并继续"
              onPressIn={() => { haptics.light(); hardScale.value = withSpring(0.86, { damping: 10, stiffness: 220 }); }}
              onPressOut={() => { hardScale.value = withSpring(1.0, { damping: 8, stiffness: 180 }); }}
              onPress={() => handleRating("hard")}
              style={{
                height: 48,
                borderRadius: theme.radius.md,
                backgroundColor: "#FF3B3018",
                borderWidth: 1.5,
                borderColor: "#FF3B3066",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: "#FF3B30", fontWeight: "900", fontSize: 14 }}>困难 (SM-2)</Text>
            </Pressable>
          </Animated.View>

          {/* 一般按钮 */}
          <Animated.View style={{ flex: 1, transform: [{ scale: goodScale }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="标记为一般并继续"
              onPressIn={() => { haptics.light(); goodScale.value = withSpring(0.86, { damping: 10, stiffness: 220 }); }}
              onPressOut={() => { goodScale.value = withSpring(1.0, { damping: 8, stiffness: 180 }); }}
              onPress={() => handleRating("good")}
              style={{
                height: 48,
                borderRadius: theme.radius.md,
                backgroundColor: `${theme.colors.warm}18`,
                borderWidth: 1.5,
                borderColor: `${theme.colors.warm}66`,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: theme.colors.warm, fontWeight: "900", fontSize: 14 }}>一般 (SM-2)</Text>
            </Pressable>
          </Animated.View>

          {/* 简单按钮 */}
          <Animated.View style={{ flex: 1, transform: [{ scale: easyScale }] }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="标记为简单并继续"
              onPressIn={() => { haptics.light(); easyScale.value = withSpring(0.86, { damping: 10, stiffness: 220 }); }}
              onPressOut={() => { easyScale.value = withSpring(1.0, { damping: 8, stiffness: 180 }); }}
              onPress={() => handleRating("easy")}
              style={{
                height: 48,
                borderRadius: theme.radius.md,
                backgroundColor: `${theme.colors.accent}18`,
                borderWidth: 1.5,
                borderColor: `${theme.colors.accent}66`,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: theme.colors.accent, fontWeight: "900", fontSize: 14 }}>简单 (SM-2)</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      ) : (
        <View style={{ height: 48, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: theme.colors.muted, fontSize: 12, fontStyle: "italic" }}>
            先回忆被挖空的单词，翻转后即可进行评估评分
          </Text>
        </View>
      )}
    </View>
  );
}
