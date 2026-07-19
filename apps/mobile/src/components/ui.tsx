import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { springBouncy, timingQuick, useSpringPress } from "@/lib/animation";

// ============ Screen ============
export function Screen({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>{children}</View>
  );
}

// ============ Card ============
/** 静态卡片 — 克制的表面层级 */
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.card + 2,
          gap: theme.spacing.gap,
          shadowColor: theme.colors.text,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ============ AnimatedCard ============
/** 柔滑入场 + 微抬升的内容卡片 */
export function AnimatedCard({
  children,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
}) {
  const { theme } = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();

  const entranceScale = useSharedValue(0.92);
  const entranceOpacity = useSharedValue(0);

  useEffect(() => {
    entranceScale.value = withDelay(delay, withSpring(1, springBouncy));
    entranceOpacity.value = withDelay(delay, withTiming(1, timingQuick));
  }, []);

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value }],
  }));

  return (
    <Animated.View style={[entranceStyle, animatedStyle]}>
      <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
        <View
          style={[
            {
              borderRadius: theme.radius.lg,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              padding: theme.spacing.card + 2,
              gap: theme.spacing.gap,
              shadowColor: theme.colors.text,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.03,
              shadowRadius: 8,
              elevation: 1,
            },
            style,
          ]}
        >
          {children}
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============ Title ============
export function Title({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text
      selectable
      style={{
        color: theme.colors.text,
        fontSize: 30,
        fontWeight: "700",
        lineHeight: 34,
        letterSpacing: -0.6,
      }}
    >
      {children}
    </Text>
  );
}

// ============ SectionTitle ============
export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text
      selectable
      style={{ color: theme.colors.text, fontSize: 17, fontWeight: "700", letterSpacing: -0.2 }}
    >
      {children}
    </Text>
  );
}

// ============ MutedText ============
export function MutedText({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <Text
      selectable
      style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 20 }}
    >
      {children}
    </Text>
  );
}

// ============ Button（动画版）============
type ButtonProps = PressableProps & {
  title: string;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
};

/** 苹果风柔顺缩放 + 触觉反馈按钮 */
export function Button({
  title,
  variant = "primary",
  loading,
  disabled,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { animatedStyle, onPressIn, onPressOut } = useSpringPress();

  const bgMap = {
    primary: theme.colors.accent,
    secondary: theme.colors.glassRaised,
    danger: theme.colors.danger,
  };
  const textColorMap = {
    primary: "#FFFFFF",
    secondary: theme.colors.text,
    danger: "#FFFFFF",
  };

  const backgroundColor = bgMap[variant];
  const textColor = textColorMap[variant];

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={(e) => {
          onPressIn();
          haptics.light();
        }}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          {
            minHeight: 50,
            borderRadius: theme.radius.md,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor,
            opacity: disabled ? 0.45 : 1,
            paddingHorizontal: 20,
            borderWidth: variant === "primary" ? 0 : 1,
            borderColor: theme.colors.border,
            ...(variant === "primary"
              ? {
                  shadowColor: theme.colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.16,
                  shadowRadius: 8,
                  elevation: 2,
                }
              : {}),
          },
          typeof style === "function" ? style({ pressed }) : style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text
            style={{
              color: textColor,
              fontSize: 16,
              fontWeight: "700",
              letterSpacing: 0.1,
            }}
          >
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ============ Field（带聚焦动画）============
export function Field(props: TextInputProps & { label: string }) {
  const { theme } = useTheme();
  const { label, style, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);
  const borderColor = useSharedValue(theme.colors.glassBorder);

  useEffect(() => {
    borderColor.value = withTiming(
      focused ? theme.colors.accent : theme.colors.glassBorder,
      { duration: 200, easing: Easing.out(Easing.cubic) },
    );
  }, [focused, theme.colors.accent, theme.colors.glassBorder]);

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
    shadowOpacity: withTiming(focused ? 0.15 : 0.02, { duration: 200 }),
    shadowColor: focused ? theme.colors.accent : theme.colors.text,
  }));

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{ color: theme.colors.muted, fontSize: 13, fontWeight: "700" }}
      >
        {label}
      </Text>
      <Animated.View
        style={[
          animatedBorderStyle,
          {
            borderRadius: theme.radius.md,
            borderWidth: 1,
            backgroundColor: theme.colors.surface,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 4,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={theme.colors.subtle}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            {
              minHeight: 52,
              borderRadius: theme.radius.md,
              color: theme.colors.text,
              paddingHorizontal: 14,
              fontSize: 15,
            },
            style,
          ]}
          {...rest}
        />
      </Animated.View>
    </View>
  );
}

// ============ StatusMessage ============
export function StatusMessage({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger" | "success";
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const colorMap = {
    neutral: theme.colors.muted,
    danger: theme.colors.danger,
    success: theme.colors.success,
  };
  const color = colorMap[tone];
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: `${color}66`,
        backgroundColor: `${color}18`,
        padding: 12,
      }}
    >
      <Text selectable style={{ color, lineHeight: 20 }}>
        {children}
      </Text>
    </View>
  );
}

// ============ ProgressBar（带动画填充）============
/** 带动画填充的进度条 — progress 取值范围 0~1 */
export function ProgressBar({
  progress,
  height = 6,
}: {
  progress: number;
  height?: number;
}) {
  const { theme } = useTheme();
  const animatedWidth = useSharedValue(0);

  useEffect(() => {
    animatedWidth.value = withTiming(
      Math.min(Math.max(progress, 0), 1),
      { duration: 600, easing: Easing.inOut(Easing.cubic) },
    );
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%` as any,
  }));

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: theme.colors.glassRaised,
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        overflow: "hidden",
      }}
    >
      <Animated.View
        style={[
          barStyle,
          {
            height: "100%",
            borderRadius: height / 2,
            backgroundColor: theme.colors.accent,
          },
        ]}
      />
    </View>
  );
}
