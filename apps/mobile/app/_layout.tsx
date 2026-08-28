import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/app-providers";
import { useTheme } from "@/providers/theme-provider";

export default function RootLayout() {
  return (
    <AppProviders>
      <RootStack />
    </AppProviders>
  );
}

function RootStack() {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="media" options={{ title: "我的语料", headerShown: false }} />
        <Stack.Screen name="tp-practice/[kind]" options={{ title: "TP 练习", headerShown: false }} />
        <Stack.Screen name="words" options={{ title: "单词", headerShown: false }} />
        <Stack.Screen name="words/[word]" options={{ title: "单词详情", headerShown: false }} />
        <Stack.Screen name="sentences" options={{ title: "句子本", headerShown: false }} />
        <Stack.Screen name="paragraphs" options={{ title: "段落本", headerShown: false }} />
        <Stack.Screen name="notes" options={{ title: "笔记本", headerShown: false }} />
        <Stack.Screen name="verify-youtube" options={{ headerShown: false, presentation: "modal", gestureEnabled: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="video/[videoId]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout/success" options={{ title: "Checkout complete" }} />
        <Stack.Screen name="checkout/cancelled" options={{ title: "Checkout cancelled" }} />
      </Stack>
    </>
  );
}
