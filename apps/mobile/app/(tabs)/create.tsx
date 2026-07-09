import { View } from "react-native";

// This screen is never actually navigated to because the tab press is intercepted
// by a listener in TabLayout to show a modal instead.
// However, Expo Router requires the file to exist to render the tab button.
export default function CreateTabPlaceholder() {
  return <View />;
}
