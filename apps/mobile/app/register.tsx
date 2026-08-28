import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { useFadeInUp, useScaleIn, useShake, staggerDelays } from "@/lib/animation";
import { Button, Card, Field, MutedText, Screen, StatusMessage, Title } from "@/components/ui";

export default function RegisterScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const { signUp, configured } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { animatedStyle: shakeStyle, shake } = useShake();

  const delays = staggerDelays(3, 100);

  async function handleSubmit() {
    setError(null);
    setMessage(null);
    setLoading(true);
    haptics.medium();
    try {
      await signUp(email.trim(), password);
      haptics.success();
      setMessage("账号创建成功！现在可以开始同步学习数据。");
      setTimeout(() => router.back(), 1200);
    } catch (submitError) {
      haptics.error();
      setError(submitError instanceof Error ? submitError.message : "注册失败");
      shake();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12 }}>
          <Pressable
            onPress={() => { haptics.light(); router.back(); }}
            style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.surfaceRaised }}
            accessibilityRole="button"
            accessibilityLabel="返回上一页"
          >
            <ArrowLeft color={theme.colors.text} size={22} />
          </Pressable>
          <Text style={{ flex: 1, textAlign: "center", color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>创建账号</Text>
          <View style={{ width: 48 }} />
        </View>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentInsetAdjustmentBehavior="never"
            contentContainerStyle={{ padding: theme.spacing.page, paddingBottom: insets.bottom + 32, gap: theme.spacing.gap }}
          >
          <Animated.View style={useFadeInUp(delays[0])}>
            <Title>创建你的学习空间</Title>
          </Animated.View>
          <Animated.View style={useFadeInUp(delays[1])}>
            <MutedText>使用与网页版相同的 Teach Player 账号。</MutedText>
          </Animated.View>

          {!configured ? <StatusMessage tone="danger">账户服务尚未准备好。</StatusMessage> : null}

          <Animated.View style={[useScaleIn(delays[2]), shakeStyle]}>
            <Card>
              <Field
                label="邮箱"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                placeholder="your@email.com"
              />
              <Field
                label="密码"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                placeholder="至少 8 位密码"
              />
              {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}
              {error ? <StatusMessage tone="danger">{error}</StatusMessage> : null}
              <Button
                title={loading ? "创建中..." : "创建账号"}
                loading={loading}
                disabled={!configured || email.trim().length === 0 || password.length < 8}
                onPress={handleSubmit}
              />
            </Card>
          </Animated.View>

          <View style={{ flexDirection: "row", justifyContent: "center", gap: 4 }}>
            <MutedText>已有账号？</MutedText>
            <Animated.View>
              <Button
                title="去登录"
                variant="secondary"
                onPress={() => {
                  haptics.light();
                  router.back();
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
