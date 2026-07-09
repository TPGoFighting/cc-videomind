import Svg, { Rect, Circle, Path, Defs, LinearGradient, Stop } from "react-native-svg";

export function CoachRobotIcon({
  color = "#58CC02", // Primary brand color / accent color
  size = 36,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Defs>
        {/* Gradients */}
        <LinearGradient id="headGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#BFC4D5" />
          <Stop offset="100%" stopColor="#8A8F9F" />
        </LinearGradient>
        <LinearGradient id="faceGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#2E3244" />
          <Stop offset="100%" stopColor="#171A24" />
        </LinearGradient>
        <LinearGradient id="accentGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} />
          <Stop offset="100%" stopColor={color + "DD"} />
        </LinearGradient>
      </Defs>

      {/* Ears / Side Bolts */}
      <Rect x="3" y="25" width="5" height="14" rx="2.5" fill="url(#accentGrad)" />
      <Rect x="56" y="25" width="5" height="14" rx="2.5" fill="url(#accentGrad)" />

      {/* Antenna base */}
      <Rect x="29.5" y="9" width="5" height="9" fill="url(#headGrad)" />
      {/* Antenna light bulb */}
      <Circle cx="32" cy="6" r="4.5" fill="url(#accentGrad)" />

      {/* Robot Outer Head */}
      <Rect x="7" y="16" width="50" height="42" rx="13" fill="url(#headGrad)" stroke="#6C7282" strokeWidth="2.5" />

      {/* Robot Screen Face */}
      <Rect x="13" y="21" width="38" height="31" rx="8" fill="url(#faceGrad)" />

      {/* Glowing Screen Eyes */}
      <Circle cx="23" cy="32" r="5" fill={color} />
      <Circle cx="41" cy="32" r="5" fill={color} />
      {/* Glossy highlight inside eyes */}
      <Circle cx="21.5" cy="30.5" r="1.5" fill="#FFFFFF" opacity="0.9" />
      <Circle cx="39.5" cy="30.5" r="1.5" fill="#FFFFFF" opacity="0.9" />

      {/* Segmented Friendly Robotic Smile */}
      <Path d="M 22 42 Q 32 47 42 42" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" />
      
      {/* Tiny metallic blush cheeks */}
      <Circle cx="17" cy="39" r="1" fill="url(#accentGrad)" opacity="0.8" />
      <Circle cx="47" cy="39" r="1" fill="url(#accentGrad)" opacity="0.8" />
    </Svg>
  );
}
