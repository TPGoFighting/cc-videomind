import { useState, useRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useFadeInUp, useScaleIn, useShake, staggerDelays } from "@/lib/animation";
import { Button, Card, Field, MutedText, Screen, StatusMessage, Title } from "@/components/ui";

export default function LoginScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { animatedStyle: shakeStyle, shake } = useShake();

  const delays = staggerDelays(3, 100);
  const titleStyle = useFadeInUp(delays[0]);
  const subtitleStyle = useFadeInUp(delays[1]);
  const cardStyle = useScaleIn(delays[2]);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    haptics.medium();
    try {
      await signIn(email.trim(), password);
      haptics.success();
      router.back();
    } catch (submitError) {
      haptics.error();
      setError(submitError instanceof Error ? submitError.message : "登录失败");
      shake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        {/* 统一风格自定义导航栏 */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
          <Pressable
            onPress={() => { haptics.light(); router.back(); }}
            style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceRaised }}
          >
            <ArrowLeft color={theme.colors.text} size={22} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>登录</Text>
          <View style={{ width: 38 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ padding: theme.spacing.page, gap: theme.spacing.gap }}
          >
          <Animated.View style={titleStyle}>
            <Title>欢迎回来</Title>
          </Animated.View>
          <Animated.View style={subtitleStyle}>
            <MutedText>登录以同步笔记、词库、收藏和 Pro 订阅状态。</MutedText>
          </Animated.View>

          {!configured ? <StatusMessage tone="danger">账户服务尚未准备好。</StatusMessage> : null}

          <Animated.View style={[cardStyle, shakeStyle]}>
            <Card>
              <Field
                label="邮箱"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="your@email.com"
              />
              <Field
                label="密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                placeholder="输入密码"
              />
              {error ? <StatusMessage tone="danger">{error}</StatusMessage> : null}
              <Button
                title={loading ? "登录中..." : "登录"}
                loading={loading}
                disabled={!configured || email.length === 0 || password.length === 0}
                onPress={handleSubmit}
              />
            </Card>
          </Animated.View>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
            <MutedText>还没有账号？</MutedText>
            <Animated.View>
              <Button
                title="创建账号"
                variant="secondary"
                onPress={() => {
                  haptics.light();
                  router.push("/register");
                }}
              />
            </Animated.View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Screen>
  );
}
