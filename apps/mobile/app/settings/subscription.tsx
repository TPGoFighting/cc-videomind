import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPaymentStatus, submitPayment, type SubscriptionTier } from "@/lib/api";
import { getPlanConfig, planConfigs, planLabels } from "@/lib/plans";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Button, Card, Field, MutedText, Screen, StatusMessage } from "@/components/ui";
import { LocalIcon } from "@/components/local-icon";
import { PaymentQrModal, paymentMeta, type PaymentMethod } from "@/components/payment-qr-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

type PendingPayment = {
  tier: "pro" | "max";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export default function SubscriptionSettingsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const { user, accessToken, subscriptionTier, refreshProfile } = useAuth();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>("pro");
  const [transactionId, setTransactionId] = useState("");
  const [paymentPreview, setPaymentPreview] = useState<PaymentMethod | null>(null);
  const [submittedPending, setSubmittedPending] = useState<PendingPayment | null>(null);

  const paymentQuery = useQuery({
    queryKey: ["payment-status", user?.id, accessToken],
    queryFn: () => getPaymentStatus(accessToken),
    enabled: Boolean(user && accessToken),
    retry: false,
  });

  const selectedPlan = getPlanConfig(selectedTier);
  const pending = paymentQuery.data?.pending ?? submittedPending;
  const selectedPaidTier = selectedTier === "free" ? null : selectedTier;

  const paymentMutation = useMutation({
    mutationFn: () => {
      if (!selectedPaidTier) {
        throw new Error("免费版无需提交审核。");
      }
      return submitPayment(selectedPaidTier, transactionId.trim(), accessToken);
    },
    onSuccess: async () => {
      haptics.success();
      setSubmittedPending({
        tier: selectedPaidTier ?? "pro",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      setTransactionId("");
      await queryClient.invalidateQueries({ queryKey: ["payment-status", user?.id, accessToken] });
      await refreshProfile();
    },
    onError: () => haptics.error(),
  });

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="Pro 订阅" onBack={() => router.back()} />
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            padding: theme.spacing.page,
            gap: 14,
            paddingBottom: 40,
          }}
        >
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LocalIcon name="fire" size={32} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>Pro 订阅</Text>
                <MutedText>选择学习方案，扫码付款后填写交易单号并提交审核。</MutedText>
              </View>
            </View>
            <MutedText>当前套餐：{planLabels[subscriptionTier]}</MutedText>
          </Card>

          {paymentQuery.error instanceof Error ? (
            <View style={{ gap: 10 }}>
              <StatusMessage tone="danger">订阅状态暂时无法读取：{paymentQuery.error.message}</StatusMessage>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="重试读取订阅状态"
                onPress={() => paymentQuery.refetch()}
                style={{ minHeight: 48, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceRaised, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={{ color: theme.colors.accent, fontWeight: "900" }}>重试</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={{ gap: 12 }}>
            {planConfigs.map((plan) => {
              const active = selectedTier === plan.tier;
              const current = subscriptionTier === plan.tier;
              return (
                <Pressable
                  key={plan.tier}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    haptics.selection();
                    setSelectedTier(plan.tier);
                  }}
                  style={({ pressed }) => ({
                    borderRadius: theme.radius.lg,
                    borderWidth: 1.5,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    padding: 16,
                    gap: 12,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 14,
                        backgroundColor: active ? `${theme.colors.accent}22` : theme.colors.surfaceRaised,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <LocalIcon
                        name={plan.tier === "free" ? "document" : plan.tier === "pro" ? "trophy" : "fire"}
                        size={24}
                        color={active ? theme.colors.accent : theme.colors.muted}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
                          {plan.title}
                        </Text>
                        {plan.highlighted ? (
                          <Text style={{ color: theme.colors.accent, fontSize: 12, fontWeight: "900" }}>推荐</Text>
                        ) : null}
                        {current ? (
                          <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>当前</Text>
                        ) : null}
                      </View>
                      <MutedText>{plan.description}</MutedText>
                    </View>
                    <Text style={{ color: theme.colors.accent, fontSize: 20, fontWeight: "900" }}>
                      {plan.priceLabel}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <PlanChip label={plan.tier === "free" ? `总计 ${plan.dailyLimit} 次` : `每日 ${plan.dailyLimit} 次`} />
                    <PlanChip label={plan.tier === "free" ? `总计 ${plan.weeklyLimit} 次` : `每周 ${plan.weeklyLimit} 次`} />
                  </View>

                  <View style={{ gap: 7 }}>
                    {plan.features.map((feature) => (
                      <View key={feature} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ color: theme.colors.accent, fontSize: 14, fontWeight: "900" }}>✓</Text>
                        <Text style={{ color: theme.colors.muted, fontSize: 13, flex: 1 }}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {!user ? (
            <Card>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>登录后提交审核</Text>
              <MutedText>登录后即可提交付款凭证，管理员审核通过后会自动更新套餐。</MutedText>
              <View style={{ gap: 10 }}>
                <Link href="/login" asChild>
                  <Button title="登录" />
                </Link>
                <Link href="/register" asChild>
                  <Button title="创建账号" variant="secondary" />
                </Link>
              </View>
            </Card>
          ) : selectedTier === "free" ? (
            <Card>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>免费版无需付款</Text>
              <MutedText>注册后即可使用免费版，总计 3 次视频分析，适合先体验学习流程。</MutedText>
            </Card>
          ) : pending ? (
            <Card>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>审核中</Text>
              <StatusMessage tone="neutral">
                你已提交 {planLabels[pending.tier]} 申请，提交时间：{new Date(pending.createdAt).toLocaleString()}
              </StatusMessage>
              <MutedText>管理员审核通过后，你的套餐会自动更新。</MutedText>
            </Card>
          ) : (
            <>
              <Card>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>扫码付款</Text>
                <MutedText>当前选择：{planLabels[selectedTier]} · {selectedPlan.priceLabel}</MutedText>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["alipay", "wechat"] as const).map((method) => (
                    <Pressable
                      key={method}
                      accessibilityRole="button"
                      accessibilityLabel={`打开${paymentMeta[method].title}收款码`}
                      onPress={() => {
                        haptics.medium();
                        setPaymentPreview(method);
                      }}
                      style={({ pressed }) => ({
                        flex: 1,
                        minHeight: 54,
                        borderRadius: theme.radius.md,
                        borderWidth: 1,
                        borderColor: `${paymentMeta[method].color}66`,
                        backgroundColor: `${paymentMeta[method].color}12`,
                        alignItems: "center",
                        justifyContent: "center",
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                      })}
                    >
                      <Text style={{ color: paymentMeta[method].color, fontSize: 15, fontWeight: "900" }}>
                        {paymentMeta[method].title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Card>

              <Card>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>提交审核</Text>
                <Field
                  label="交易单号"
                  value={transactionId}
                  onChangeText={setTransactionId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="粘贴微信或支付宝交易单号"
                />
                <Button
                  title="提交审核"
                  loading={paymentMutation.isPending}
                  disabled={transactionId.trim().length === 0}
                  onPress={() => paymentMutation.mutate()}
                />
                {paymentMutation.isSuccess ? <StatusMessage tone="success">已提交，等待管理员审核。</StatusMessage> : null}
                {paymentMutation.error instanceof Error ? (
                  <StatusMessage tone="danger">{paymentMutation.error.message}</StatusMessage>
                ) : null}
              </Card>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <PaymentQrModal method={paymentPreview} onClose={() => setPaymentPreview(null)} />
    </Screen>
  );
}

function PlanChip({ label }: { label: string }) {
  const { theme } = useTheme();

  return (
    <View
      style={{
        borderRadius: 999,
        backgroundColor: theme.colors.surfaceRaised,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: "800" }}>{label}</Text>
    </View>
  );
}
