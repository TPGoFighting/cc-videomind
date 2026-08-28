import { Text, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/providers/theme-provider";
import { springBouncy } from "@/lib/animation";
import { useEffect, useRef } from "react";
import { Glyph } from "./art";

interface StreakBadgeProps {
  /** 连续天数 */
  days: number;
  /** 是否正在活跃（今天已学习） */
  active?: boolean;
  /** 尺寸 */
  size?: "sm" | "md" | "lg";
}

export function StreakBadge({ days, active = false, size = "md" }: StreakBadgeProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const flameRotation = useSharedValue(0);
  const prevDays = useRef(days);

  const sizeMap = {
    sm: { container: 48, flame: 20, text: 16, padding: 8 },
    md: { container: 64, flame: 28, text: 20, padding: 10 },
    lg: { container: 80, flame: 36, text: 24, padding: 12 },
  };
  const s = sizeMap[size];

  // 入场弹簧动画
  useEffect(() => {
    scale.value = withDelay(300, withSpring(1, springBouncy));
  }, []);

  // 数字变化时弹跳
  useEffect(() => {
    if (days !== prevDays.current && prevDays.current > 0) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 12, stiffness: 200 }),
        withSpring(1, springBouncy)
      );
    }
    prevDays.current = days;
  }, [days]);

  // 活跃时火焰轻微摆动
  useEffect(() => {
    if (active) {
      flameRotation.value = withSequence(
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-3, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
      );
    }
  }, [active]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flameRotation.value}deg` }],
  }));

  // 根据天数决定颜色
  const getColor = () => {
    if (days >= 30) return theme.colors.gold;
    if (days >= 7) return theme.colors.warm;
    return active ? theme.colors.accent : theme.colors.muted;
  };

  const badgeColor = getColor();

  return (
    <Animated.View style={[containerStyle, {
      width: s.container,
      height: s.container,
      borderRadius: s.container / 2,
      backgroundColor: `${badgeColor}15`,
      borderWidth: 2,
      borderColor: `${badgeColor}40`,
      alignItems: "center",
      justifyContent: "center",
    }]}>
      <Animated.View style={flameStyle}>
        <Glyph
          name={active || days > 0 ? "streak" : "sleep"}
          size={s.flame + 8}
          color={badgeColor}
        />
      </Animated.View>
      <Text style={{
        color: badgeColor,
        fontSize: s.text,
        fontWeight: "900",
        fontVariant: ["tabular-nums"],
        marginTop: -2,
      }}>
        {days}
      </Text>
    </Animated.View>
  );
}
