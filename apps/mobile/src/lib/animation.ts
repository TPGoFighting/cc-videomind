import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  Easing,
  type WithSpringConfig,
  type WithTimingConfig,
} from "react-native-reanimated";
import { useEffect } from "react";

// ============ 弹簧动画预设 ============

/** 按钮按压/释放弹簧 (Apple-style fast snap, zero bounce) */
export const springButton: WithSpringConfig = {
  damping: 24,
  stiffness: 220,
  mass: 0.9,
};

/** 卡片入场 (Liquid glass smooth drift, previously bouncy) */
export const springBouncy: WithSpringConfig = {
  damping: 22,
  stiffness: 150,
  mass: 1,
};

/** 轻弹 (Elegant slow liquid drift) */
export const springGentle: WithSpringConfig = {
  damping: 28,
  stiffness: 120,
  mass: 1.1,
};

/** 收起/关闭 (Crisp fluid snap) */
export const springSnappy: WithSpringConfig = {
  damping: 25,
  stiffness: 300,
  mass: 0.7,
};

// ============ 时间曲线预设 ============

export const timingEaseOut: WithTimingConfig = {
  duration: 250,
  easing: Easing.out(Easing.cubic),
};

export const timingEaseInOut: WithTimingConfig = {
  duration: 300,
  easing: Easing.inOut(Easing.cubic),
};

export const timingQuick: WithTimingConfig = {
  duration: 150,
  easing: Easing.out(Easing.cubic),
};

// ============ 入场动画变体 ============

/** 淡入 + 上滑入场 */
export function useFadeInUp(delay: number = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, timingEaseOut));
    translateY.value = withDelay(delay, withSpring(0, springGentle));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return animatedStyle;
}

/** 缩放弹出入场 */
export function useScaleIn(delay: number = 0) {
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(delay, withSpring(1, springBouncy));
    opacity.value = withDelay(delay, withTiming(1, timingQuick));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/** 弹簧按钮缩放（用于 Pressable） */
export function useSpringPress() {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    scale.value = withSpring(0.95, springSnappy);
  };

  const onPressOut = () => {
    scale.value = withSpring(1, springButton);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}

/** 错误抖动 */
export function useShake() {
  const translateX = useSharedValue(0);

  const shake = () => {
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { animatedStyle, shake };
}

/** 脉冲（重复缩放，用于注意力吸引） */
export function usePulse(active: boolean = true) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1, springSnappy);
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return animatedStyle;
}

/** 进度条动画（0→1 填充） */
export function useAnimatedProgress(to: number, duration: number = 500) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(to, { duration, easing: Easing.inOut(Easing.cubic) });
  }, [to, duration]);

  return progress;
}

/** 交错入场（返回 delay 值数组，配合 useFadeInUp 使用） */
export function staggerDelays(count: number, baseDelay: number = 50): number[] {
  return Array.from({ length: count }, (_, i) => i * baseDelay);
}
