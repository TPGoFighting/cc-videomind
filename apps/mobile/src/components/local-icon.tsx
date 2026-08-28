import * as Lucide from "lucide-react-native";
import { type ViewStyle } from "react-native";
import { useTheme } from "@/providers/theme-provider";

const iconMap = {
  book: Lucide.BookOpen,
  chat: Lucide.MessageCircle,
  document: Lucide.FileText,
  fire: Lucide.Flame,
  lock: Lucide.Lock,
  moments: Lucide.Compass,
  notes: Lucide.PenTool,
  panelChat: Lucide.MessageSquare,
  play: Lucide.Play,
  settings: Lucide.Settings,
  summary: Lucide.Sparkles,
  transcript: Lucide.AlignLeft,
  trophy: Lucide.Trophy,
} as const;

export type LocalIconName = keyof typeof iconMap;

export function LocalIcon({
  name,
  size = 28,
  color,
  style,
}: {
  name: LocalIconName;
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();

  const IconComponent = iconMap[name];
  if (!IconComponent) return null;

  return (
    <IconComponent
      size={size}
      color={color ?? theme.colors.accent}
      style={style}
    />
  );
}
