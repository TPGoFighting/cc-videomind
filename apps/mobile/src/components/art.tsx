import { View, type ViewStyle } from "react-native";
import Svg, { Circle, Line, Path, Rect, Polyline } from "react-native-svg";
import { useTheme } from "@/providers/theme-provider";

type GlyphName =
  | "chat"
  | "check"
  | "history"
  | "lock"
  | "moon"
  | "note"
  | "quote"
  | "sleep"
  | "spark"
  | "streak"
  | "subtitle"
  | "summary"
  | "sun"
  | "system"
  | "target"
  | "video"
  | "vocab";

export function Glyph({
  name,
  size = 28,
  color,
  muted = false,
  style,
}: {
  name: GlyphName;
  size?: number;
  color?: string;
  muted?: boolean;
  style?: ViewStyle;
}) {
  const { theme } = useTheme();
  const stroke = color ?? (muted ? theme.colors.muted : theme.colors.accent);
  const fill = `${stroke}18`;
  const warm = theme.colors.warm;
  const text = theme.colors.text;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        {name === "streak" ? (
          <>
            <Path d="M25 5c6 8-1 10 6 16 3-4 4-7 4-10 8 8 9 23-4 30-11 6-25-1-24-14 1-8 7-13 13-17-1 5 1 9 5 11 4-5-2-9 0-16Z" fill={warm} />
            <Path d="M24 25c3 4-1 6 3 9 2-2 2-4 2-6 4 5 3 11-2 14-5 3-12-1-12-7 0-4 3-7 7-10-1 3 0 5 2 7 2-3-1-5 0-7Z" fill="#FFF4B8" />
          </>
        ) : null}
        {name === "sleep" ? (
          <>
            <Circle cx="24" cy="24" r="18" fill={fill} stroke={stroke} strokeWidth="3" />
            <Path d="M15 18h10l-10 11h11" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M29 12h7l-7 8h8" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}
        {name === "vocab" || name === "subtitle" ? (
          <>
            <Rect x="10" y="8" width="28" height="32" rx="5" fill={fill} stroke={stroke} strokeWidth="3" />
            <Line x1="17" y1="19" x2="31" y2="19" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
            <Line x1="17" y1="27" x2="34" y2="27" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
            <Line x1="17" y1="35" x2="27" y2="35" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          </>
        ) : null}
        {name === "target" ? (
          <>
            <Circle cx="24" cy="24" r="17" fill={fill} stroke={stroke} strokeWidth="3" />
            <Circle cx="24" cy="24" r="9" stroke={stroke} strokeWidth="3" fill="none" />
            <Circle cx="24" cy="24" r="3" fill={stroke} />
            <Line x1="24" y1="4" x2="24" y2="12" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
            <Line x1="24" y1="36" x2="24" y2="44" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          </>
        ) : null}
        {name === "summary" ? (
          <>
            <Rect x="9" y="11" width="30" height="26" rx="5" fill={fill} stroke={stroke} strokeWidth="3" />
            <Rect x="15" y="25" width="4" height="7" rx="1" fill={warm} />
            <Rect x="23" y="18" width="4" height="14" rx="1" fill={stroke} />
            <Rect x="31" y="22" width="4" height="10" rx="1" fill={text} opacity="0.65" />
          </>
        ) : null}
        {name === "chat" ? (
          <Path d="M10 13c0-4 3-7 7-7h14c4 0 7 3 7 7v10c0 4-3 7-7 7h-9l-9 8v-9c-2-1-3-4-3-6V13Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        ) : null}
        {name === "quote" ? (
          <>
            <Path d="M13 16h10v10c0 6-4 10-10 11" fill={fill} stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M28 16h10v10c0 6-4 10-10 11" fill={fill} stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}
        {name === "note" ? (
          <>
            <Path d="M12 7h18l7 7v27H12V7Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
            <Path d="M30 7v9h7" stroke={stroke} strokeWidth="3" strokeLinejoin="round" fill="none" />
            <Line x1="18" y1="24" x2="31" y2="24" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
            <Line x1="18" y1="32" x2="28" y2="32" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          </>
        ) : null}
        {name === "history" ? (
          <>
            <Path d="M11 24a13 13 0 1 0 4-9" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
            <Path d="M10 11v9h9" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M24 17v9l7 4" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : null}
        {name === "video" ? (
          <>
            <Rect x="8" y="13" width="24" height="22" rx="5" fill={fill} stroke={stroke} strokeWidth="3" />
            <Path d="M32 21l8-5v16l-8-5" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
          </>
        ) : null}
        {name === "lock" ? (
          <>
            <Rect x="11" y="21" width="26" height="19" rx="5" fill={fill} stroke={stroke} strokeWidth="3" />
            <Path d="M16 21v-5a8 8 0 0 1 16 0v5" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          </>
        ) : null}
        {name === "spark" ? (
          <>
            <Path d="M24 5l4 13 13 6-13 5-4 14-5-14-12-5 12-6 5-13Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
            <Circle cx="37" cy="11" r="3" fill={warm} />
          </>
        ) : null}
        {name === "check" ? (
          <Path d="M10 25l9 9 19-21" fill="none" stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {name === "system" ? (
          <>
            <Rect x="12" y="8" width="24" height="30" rx="5" fill={fill} stroke={stroke} strokeWidth="3" />
            <Line x1="20" y1="14" x2="28" y2="14" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
            <Circle cx="24" cy="32" r="2" fill={stroke} />
          </>
        ) : null}
        {name === "sun" ? (
          <>
            <Circle cx="24" cy="24" r="8" fill={warm} />
            {[0, 45, 90, 135].map((rotation) => (
              <Line key={rotation} x1="24" y1="5" x2="24" y2="11" stroke={stroke} strokeWidth="3" strokeLinecap="round" transform={`rotate(${rotation} 24 24)`} />
            ))}
            {[180, 225, 270, 315].map((rotation) => (
              <Line key={rotation} x1="24" y1="5" x2="24" y2="11" stroke={stroke} strokeWidth="3" strokeLinecap="round" transform={`rotate(${rotation} 24 24)`} />
            ))}
          </>
        ) : null}
        {name === "moon" ? (
          <Path d="M33 36A16 16 0 0 1 20 8c-1 11 6 19 17 20a16 16 0 0 1-4 8Z" fill={warm} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
        ) : null}
      </Svg>
    </View>
  );
}
