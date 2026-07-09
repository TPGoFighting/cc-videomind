import { Pressable, Text, View } from "react-native";
import { Check, X } from "lucide-react-native";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";

export interface ChoiceOption {
  text: string;
}

interface ChoiceOptionsProps {
  choices: string[];
  correctAnswer: string;
  selectedIdx: number | null;
  isSubmitted: boolean;
  /** 当前练习模块的强调色 */
  accent: string;
  onChoicePress: (index: number) => void;
}

/**
 * 3D Duolingo 风格选项卡片组件
 * 被 words / listening / mistakes / stories 四种练习复用，消除重复代码
 */
export function ChoiceOptions({
  choices,
  correctAnswer,
  selectedIdx,
  isSubmitted,
  accent,
  onChoicePress,
}: ChoiceOptionsProps) {
  const { theme, isDark } = useTheme();
  const haptics = useHaptics();

  return (
    <View style={{ gap: 10 }}>
      {choices.map((option, index) => {
        const isSelected = selectedIdx === index;
        const isCorrectOption = option.toLowerCase() === correctAnswer.toLowerCase();

        let cellBg = theme.colors.surface;
        let cellBorder = theme.colors.border;
        let cellShadow = theme.colors.surfaceRaised;
        let borderBottomWidth = 5;
        let translateY = 0;

        if (isSelected) {
          cellBg = isDark ? "#0D2030" : "#EBF7FF";
          cellBorder = accent;
          cellShadow = accent;
          borderBottomWidth = 2;
          translateY = 3;
        }

        if (isSubmitted) {
          if (isCorrectOption) {
            cellBg = isDark ? "#0D2A1C" : "#EEFBF0";
            cellBorder = theme.colors.success;
            cellShadow = isSelected ? theme.colors.success : (isDark ? "#06150E" : "#CBEFD2");
            borderBottomWidth = isSelected ? 2 : 5;
            translateY = isSelected ? 3 : 0;
          } else if (isSelected) {
            cellBg = isDark ? "#2D1212" : "#FFF0F0";
            cellBorder = theme.colors.danger;
            cellShadow = theme.colors.danger;
            borderBottomWidth = 2;
            translateY = 3;
          }
        }

        return (
          <Pressable
            key={`${option}-${index}`}
            onPress={() => {
              if (!isSubmitted) {
                haptics.light();
                onChoicePress(index);
              }
            }}
            disabled={isSubmitted}
            style={[
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                padding: 16,
                borderRadius: theme.radius.md,
                borderWidth: 2,
                borderColor: cellBorder,
                backgroundColor: cellBg,
                borderBottomColor: cellShadow,
                borderBottomWidth: borderBottomWidth,
                transform: [{ translateY: translateY }],
              }
            ]}
          >
            {/* 字母徽章 */}
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSelected
                  ? accent
                  : isSubmitted && isCorrectOption
                    ? theme.colors.success
                    : theme.colors.surfaceRaised,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "900",
                  color: isSelected || (isSubmitted && isCorrectOption) ? "#FFFFFF" : theme.colors.text,
                }}
              >
                {String.fromCharCode(65 + index)}
              </Text>
            </View>

            {/* 选项文字 */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700", lineHeight: 22 }}>
                {option}
              </Text>
            </View>

            {/* 结果图标 */}
            {isSubmitted && isCorrectOption ? (
              <Check color={theme.colors.success} size={20} strokeWidth={3} />
            ) : null}
            {isSubmitted && isSelected && !isCorrectOption ? (
              <X color={theme.colors.danger} size={20} strokeWidth={3} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
