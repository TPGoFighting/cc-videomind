# YouTube 登录验证 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 强制用户在 App 内 WebView 完成 YouTube 登录，使 WebView Cookie 共享给播放器，避免机器人验证拦截。

**Architecture:** 新增全屏模态页 `/verify-youtube`，内嵌 `react-native-webview` 加载 `youtube.com`，用户登录后点击确认按钮，标记 `youtube_verified` 到 `expo-sqlite` localStorage。`(tabs)/_layout.tsx` 启动时检查标记，未验证则跳转。验证页不可通过手势返回或标题栏退出。

**Tech Stack:** react-native-webview (已有), expo-sqlite localStorage (已有), expo-router

---

### 文件结构

| 文件 | 职责 |
|------|------|
| `app/verify-youtube.tsx` | 新建 — 验证页：WebView + 引导 UI + 完成按钮 |
| `app/_layout.tsx` | 修改 — 注册 verify-youtube 路由为无返回的模态 |
| `app/(tabs)/_layout.tsx` | 修改 — 挂载时检查验证状态，未验证跳转 |

---

### Task 1: 创建 YouTube 验证页面

**Files:**
- Create: `apps/mobile/app/verify-youtube.tsx`

- [ ] **Step 1: 写入验证页面组件**

```tsx
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { Button, MutedText, Screen, StatusMessage } from "@/components/ui";
import { useStorageState } from "@/hooks/use-storage-state";
import { colors, radius, spacing } from "@/theme";

export default function VerifyYouTubeScreen() {
  const [, setVerified] = useStorageState("youtube_verified", false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  function handleDone() {
    setVerified(true);
    router.replace("/");
  }

  function handleLoadEnd() {
    setLoading(false);
  }

  function handleError() {
    setLoading(false);
    setError(true);
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, paddingTop: 60, paddingHorizontal: spacing.page }}>
        <Text style={{ color: colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" }}>
          YouTube 账号验证
        </Text>
        <MutedText>
          为了正常使用视频分析功能，请先登录你的 YouTube 账号。
        </MutedText>
        {error && (
          <StatusMessage tone="danger">
            网络连接失败，请检查网络后重试。
          </StatusMessage>
        )}
      </View>

      <View style={{ flex: 1, marginHorizontal: spacing.page, borderRadius: radius.lg, overflow: "hidden" }}>
        {loading && (
          <ActivityIndicator
            color={colors.accent}
            size="large"
            style={{ position: "absolute", top: "50%", left: "50%", zIndex: 1 }}
          />
        )}
        <WebView
          ref={webViewRef}
          source={{ uri: "https://www.youtube.com" }}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          domStorageEnabled
          thirdPartyCookiesEnabled
          sharedCookiesEnabled
          javaScriptEnabled
          style={{ flex: 1, backgroundColor: colors.background }}
        />
      </View>

      <View style={{ padding: spacing.page, paddingBottom: 40, gap: spacing.gap }}>
        <MutedText>
          请在上方完成 Google 登录，登录成功后点击下方按钮。
        </MutedText>
        {error && (
          <Button
            title="重试"
            variant="secondary"
            onPress={() => {
              setError(false);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          />
        )}
        <Button
          title={loading ? "页面加载中..." : "我已完成登录"}
          disabled={loading}
          onPress={handleDone}
        />
      </View>
    </Screen>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd "D:/Work/Teach Player" && npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | tail -5
```

Expected: No errors related to `verify-youtube.tsx`.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/verify-youtube.tsx
git commit -m "feat: add YouTube login verification screen
- Full-screen WebView loading youtube.com
- Loading indicator while page loads
- Network error state with retry button
- 'I'm done' button persists verified flag via storage"
```

---

### Task 2: 注册 verify-youtube 路由

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`

- [ ] **Step 1: 在 root Stack 中注册 verify-youtube 路由**

将以下 Screen 添加到 `<Stack>` 组件中（加在 `(tabs)` 和 `login` 之间）：

```tsx
<Stack.Screen
  name="verify-youtube"
  options={{
    headerShown: false,
    presentation: "modal",
    gestureEnabled: false
  }}
/>
```

完整修改后的文件：

```tsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/app-providers";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="verify-youtube"
          options={{
            headerShown: false,
            presentation: "modal",
            gestureEnabled: false
          }}
        />
        <Stack.Screen name="login" options={{ title: "Sign in", presentation: "modal" }} />
        <Stack.Screen name="register" options={{ title: "Create account", presentation: "modal" }} />
        <Stack.Screen name="video/[videoId]" options={{ title: "Learning workspace" }} />
        <Stack.Screen name="checkout/success" options={{ title: "Checkout complete" }} />
        <Stack.Screen name="checkout/cancelled" options={{ title: "Checkout cancelled" }} />
      </Stack>
    </AppProviders>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/_layout.tsx
git commit -m "feat: register verify-youtube as non-dismissible modal route"
```

---

### Task 3: 添加验证守卫 — tabs 挂载时检查

**Files:**
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`

- [ ] **Step 1: 在 TabLayout 中添加验证检查逻辑**

```tsx
import { useEffect } from "react";
import { Tabs, router } from "expo-router";
import { BookOpen, Home, Settings } from "lucide-react-native";
import { colors } from "@/theme";
import { useStorageState } from "@/hooks/use-storage-state";

export default function TabLayout() {
  const [verified, , clearVerified] = useStorageState("youtube_verified", false);

  useEffect(() => {
    if (!verified) {
      router.replace("/verify-youtube");
    }
  }, [verified]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Learn",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译通过**

```bash
cd "D:/Work/Teach Player" && npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | tail -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/_layout.tsx
git commit -m "feat: add YouTube verification guard on tabs mount — redirect unverified users"
```

---

### Task 4: Settings 页增加重新验证入口

**Files:**
- Modify: `apps/mobile/app/(tabs)/settings.tsx`

先读取当前 settings.tsx，然后添加一个清除验证状态的按钮。

- [ ] **Step 1: 修改 settings.tsx — 添加 imports 和重新验证按钮**

```tsx
import * as WebBrowser from "expo-web-browser";
import { Link, router } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { createCheckoutSession } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";
import { colors } from "@/theme";
import { Button, Card, MutedText, Screen, StatusMessage } from "@/components/ui";
import { useStorageState } from "@/hooks/use-storage-state";

export default function SettingsScreen() {
  const { user, accessToken, configured, signOut } = useAuth();
  const [, , clearVerified] = useStorageState("youtube_verified", false);
  const checkout = useMutation({
    mutationFn: () => createCheckoutSession(accessToken),
    onSuccess: (url) => WebBrowser.openBrowserAsync(url)
  });

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 14 }}>
        {!configured ? <StatusMessage tone="danger">Supabase env vars are missing. Copy .env.example to .env.</StatusMessage> : null}
        <Card>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            Account
          </Text>
          {user ? <MutedText>{user.email ?? user.id}</MutedText> : <MutedText>You are browsing without a signed-in account.</MutedText>}
          {user ? (
            <Button title="Sign out" variant="secondary" onPress={signOut} />
          ) : (
            <View style={{ gap: 10 }}>
              <Link href="/login" asChild>
                <Button title="Sign in" />
              </Link>
              <Link href="/register" asChild>
                <Button title="Create account" variant="secondary" />
              </Link>
            </View>
          )}
        </Card>

        <Card>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            Pro subscription
          </Text>
          <MutedText>Stripe Checkout opens in the system browser. The server webhook keeps subscription state authoritative.</MutedText>
          <Button title="Upgrade with Stripe" loading={checkout.isPending} disabled={!user} onPress={() => checkout.mutate()} />
          {!user ? <MutedText>Sign in before starting checkout.</MutedText> : null}
          {checkout.error instanceof Error ? <StatusMessage tone="danger">{checkout.error.message}</StatusMessage> : null}
        </Card>

        <Card>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            YouTube 验证
          </Text>
          <MutedText>
            如遇到"请登录以确认你不是机器人"的提示，可以重新验证 YouTube 账号。
          </MutedText>
          <Button
            title="重新验证 YouTube 账号"
            variant="secondary"
            onPress={() => {
              clearVerified();
              router.replace("/verify-youtube");
            }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd "D:/Work/Teach Player" && npx tsc --noEmit --project apps/mobile/tsconfig.json 2>&1 | tail -5
```

Expected: No errors.

- [ ] **Step 3: 验证功能 — 构建 Release APK**

```bash
cd "D:/Work/Teach Player/apps/mobile/android" && ./gradlew assembleRelease 2>&1 | tail -10
```

Expected: `BUILD SUCCESSFUL`

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/app/\(tabs\)/settings.tsx
git commit -m "feat: add re-verify YouTube button in settings"
```
