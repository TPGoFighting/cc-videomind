import { Pressable, Text, View, type ViewStyle } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { LocalIcon, type LocalIconName } from "@/components/local-icon";
import { useTheme } from "@/providers/theme-provider";

export function SettingsEntry({
  icon,
  title,
  description,
  onPress,
  disabled,
  danger,
  style,
}: {
  icon: LocalIconName;
  title: string;
  description: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const color = danger ? theme.colors.danger : theme.colors.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 76,
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: disabled ? 0.55 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          backgroundColor: `${color}18`,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LocalIcon name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={{ color: danger ? theme.colors.danger : theme.colors.text, fontSize: 16, fontWeight: "900" }}>
          {title}
        </Text>
        <Text numberOfLines={2} style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 18 }}>
          {description}
        </Text>
      </View>
      <ChevronRight color={theme.colors.subtle} size={20} />
    </Pressable>
  );
}
