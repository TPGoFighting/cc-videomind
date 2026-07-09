import { Stack } from "expo-router";
import { useTheme } from "@/providers/theme-provider";

export default function SettingsStackLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.colors.background },
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: "设置" }} />
      <Stack.Screen name="account" options={{ headerShown: false }} />
      <Stack.Screen name="plan" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ headerShown: false }} />
      <Stack.Screen name="admin-ai" options={{ headerShown: false }} />
      <Stack.Screen name="admin-videos" options={{ headerShown: false }} />
      <Stack.Screen name="admin-payments" options={{ headerShown: false }} />
      <Stack.Screen name="manage-channels" options={{ headerShown: false }} />
      <Stack.Screen name="language" options={{ headerShown: false }} />
    </Stack>
  );
}
