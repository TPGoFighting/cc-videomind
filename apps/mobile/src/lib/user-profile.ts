import type { ImageSourcePropType } from "react-native";

export const DEFAULT_USER_AVATAR: ImageSourcePropType = require("../../assets/tp-logo.png");

export function getDisplayNameFallback(email?: string | null) {
  return email?.split("@")[0] || "TP Learner";
}
