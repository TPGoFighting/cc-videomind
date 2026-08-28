import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { router, Stack } from "expo-router";
import { WebView, type WebViewNavigation } from "react-native-webview";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useFadeInUp, useScaleIn, staggerDelays } from "@/lib/animation";
import { Button, MutedText, Screen, StatusMessage } from "@/components/ui";
import { useStorageState } from "@/hooks/use-storage-state";

export default function VerifyYouTubeScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const [, setVerified] = useStorageState("youtube_verified", false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const delays = staggerDelays(4, 100);

  // 所有动画 hook 必须在组件顶层调用
  const fade0 = useFadeInUp(delays[0]);
  const fade1a = useFadeInUp(delays[1]);
  const fade1b = useFadeInUp(delays[1]);
  const scaleError = useScaleIn(0);
  const scale2 = useScaleIn(delays[2]);
  const fade3 = useFadeInUp(delays[3]);

  function handleDone() {
    haptics.success();
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

      {/* ---- 顶部引导文字 ---- */}
      <View style={{ paddingTop: 60, paddingHorizontal: theme.spacing.page, gap: theme.spacing.gap }}>
        <Animated.View style={fade0}>
          <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "800", textAlign: "center" }}>
            YouTube 账号验证
          </Text>
        </Animated.View>

        <Animated.View style={fade1a}>
          <MutedText>
            为了正常使用视频分析功能，请先登录你的 YouTube 账号。
          </MutedText>
        </Animated.View>

        {/* ---- 步骤指示器 ---- */}
        <Animated.View style={[fade1b, {
          flexDirection: "row", justifyContent: "center", gap: 24, paddingTop: 8
        }]}>
          {[
            { step: 1, label: "打开 YouTube", done: !loading && !error },
            { step: 2, label: "登录账号", done: !loading && !error },
            { step: 3, label: "确认完成", done: false },
          ].map((s, i) => (
            <View key={s.step} style={{ alignItems: "center", gap: 6 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: s.done ? theme.colors.accent : theme.colors.surfaceRaised,
                borderWidth: 2, borderColor: s.done ? theme.colors.accent : theme.colors.border,
                alignItems: "center", justifyContent: "center",
              }}>
                {s.done ? (
                  <Text style={{ color: "#0A1A00", fontWeight: "900" }}>✓</Text>
                ) : (
                  <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: "800" }}>{s.step}</Text>
                )}
              </View>
              <Text style={{ color: s.done ? theme.colors.accent : theme.colors.muted, fontSize: 11, fontWeight: "700" }}>
                {s.label}
              </Text>
            </View>
          ))}
        </Animated.View>

        {error && (
          <Animated.View style={scaleError}>
            <StatusMessage tone="danger">
              网络连接失败，请检查网络后重试。
            </StatusMessage>
          </Animated.View>
        )}
      </View>

      {/* ---- WebView 区域 ---- */}
      <Animated.View style={[scale2, {
        flex: 1,
        marginHorizontal: theme.spacing.page,
        marginTop: theme.spacing.gap,
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: theme.colors.border,
      }]}>
        {loading && (
          <ActivityIndicator
            color={theme.colors.accent}
            size="large"
            style={{ position: "absolute", top: "50%", left: "50%", zIndex: 1, marginLeft: -18, marginTop: -18 }}
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
          style={{ flex: 1, backgroundColor: theme.colors.background }}
        />
      </Animated.View>

      {/* ---- 底部操作栏 ---- */}
      <Animated.View style={[fade3, {
        padding: theme.spacing.page,
        paddingBottom: 40,
        gap: theme.spacing.gap,
      }]}>
        <MutedText>
          {loading ? "YouTube 页面加载中..." : "请在上方完成 Google 登录，登录成功后点击下方按钮。"}
        </MutedText>
        {error && (
          <Button
            title="重试"
            variant="secondary"
            onPress={() => {
              haptics.medium();
              setError(false);
              setLoading(true);
              webViewRef.current?.reload();
            }}
          />
        )}
        <Button
          title={loading ? "页面加载中..." : "我已完成登录 ✓"}
          disabled={loading}
          onPress={handleDone}
        />
      </Animated.View>
    </Screen>
  );
}
