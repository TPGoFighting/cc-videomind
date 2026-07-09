import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  /** 右侧自定义内容（可选） */
  right?: ReactNode;
  /** 副标题（可选） */
  subtitle?: string;
}

/**
 * 统一页面标题栏组件
 * 包含：左侧返回按钮、居中标题 + 可选副标题、右侧自定义内容
 */
export function PageHeader({ title, onBack, right, subtitle }: PageHeaderProps) {
  const { theme } = useTheme();
  const haptics = useHaptics();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        minHeight: 56,
        gap: 12,
      }}
    >
      {/* 返回按钮 */}
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          onPress={() => {
            haptics.light();
            onBack();
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.surfaceRaised,
            opacity: pressed ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          })}
        >
          <ArrowLeft color={theme.colors.text} size={22} strokeWidth={2.5} />
        </Pressable>
      ) : (
        // 占位，保持 title 居中
        <View style={{ width: 40 }} />
      )}

      {/* 标题区 */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Text
          numberOfLines={1}
          style={{
            color: theme.colors.text,
            fontSize: 17,
            fontWeight: "900",
            letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.muted,
              fontSize: 12,
              fontWeight: "600",
              marginTop: 1,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* 右侧区域 */}
      <View style={{ width: 40, alignItems: "flex-end" }}>
        {right ?? null}
      </View>
    </View>
  );
}
