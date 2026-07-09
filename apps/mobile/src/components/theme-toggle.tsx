import { Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Glyph } from "./art";

export function ThemeToggle() {
  const { mode, setMode, isDark } = useTheme();
  const haptics = useHaptics();
  const rotation = useSharedValue(isDark ? 0 : 180);
  const scale = useSharedValue(1);

  const toggle = () => {
    haptics.light();

    // 弹簧缩放
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    });

    // 旋转动画
    rotation.value = withSpring(isDark ? 180 : 0, { damping: 15, stiffness: 400 });

    // 循环切换: system → light → dark → system
    if (mode === "system") {
      setMode("light");
    } else if (mode === "light") {
      setMode("dark");
    } else {
      setMode("system");
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const icon = mode === "dark" ? "moon" : mode === "light" ? "sun" : "system";

  return (
    <Animated.View style={containerStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Theme: ${mode}. Tap to change.`}
        onPress={toggle}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View style={iconStyle}>
          <Glyph name={icon} size={30} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
