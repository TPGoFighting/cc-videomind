import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useTheme } from "@/providers/theme-provider";

// 单个骨架块
function SkeletonBlock({
  width,
  height,
  borderRadius = 8,
}: {
  width: number | string;
  height: number;
  borderRadius?: number;
}) {
  const { theme } = useTheme();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.surfaceRaised,
        },
        animatedStyle,
      ]}
    />
  );
}

// 视频卡片骨架
function VideoCardSkeleton() {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {/* 缩略图 */}
      <SkeletonBlock width="100%" height={200} borderRadius={theme.radius.lg} />
      {/* 标题 */}
      <SkeletonBlock width="80%" height={20} borderRadius={6} />
      {/* 副标题 */}
      <SkeletonBlock width="50%" height={14} borderRadius={6} />
    </View>
  );
}

// 行骨架
function RowSkeleton() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 }}>
      {/* 圆形头像 */}
      <SkeletonBlock width={48} height={48} borderRadius={24} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBlock width="60%" height={16} borderRadius={6} />
        <SkeletonBlock width="40%" height={12} borderRadius={6} />
      </View>
    </View>
  );
}

// 文本块骨架
function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  const widths = ["100%", "92%", "78%", "85%", "60%"];
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonBlock
          key={i}
          width={widths[i % widths.length]}
          height={14}
          borderRadius={6}
        />
      ))}
    </View>
  );
}

export const SkeletonLoader = {
  Block: SkeletonBlock,
  VideoCard: VideoCardSkeleton,
  Row: RowSkeleton,
  TextBlock: TextBlockSkeleton,
};
