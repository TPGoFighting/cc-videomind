import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminPayments,
  reviewAdminPayment,
  type PaymentSubmission,
  type PaymentSubmissionStatus,
} from "@/lib/api";
import { planLabels } from "@/lib/plans";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { useHaptics } from "@/hooks/use-haptics";
import { Button, Card, MutedText, Screen, StatusMessage } from "@/components/ui";
import { LocalIcon } from "@/components/local-icon";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

const filters: { key: PaymentSubmissionStatus; label: string }[] = [
  { key: "pending", label: "待审核" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
  { key: "all", label: "全部" },
];

export default function AdminPaymentsScreen() {
  const { theme } = useTheme();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const { accessToken, isAdmin, refreshProfile } = useAuth();
  const [filter, setFilter] = useState<PaymentSubmissionStatus>("pending");

  const query = useQuery({
    queryKey: ["admin-payments", filter, accessToken],
    queryFn: () => getAdminPayments(filter, accessToken),
    enabled: Boolean(isAdmin && accessToken),
  });

  const mutation = useMutation({
    mutationFn: ({ submissionId, action }: { submissionId: string; action: "approve" | "reject" }) =>
      reviewAdminPayment(submissionId, action, accessToken),
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      await refreshProfile();
    },
    onError: () => haptics.error(),
  });

  const confirmReview = (submission: PaymentSubmission, action: "approve" | "reject") => {
    const actionLabel = action === "approve" ? "通过" : "拒绝";
    Alert.alert(`${actionLabel}付款申请`, `确定${actionLabel} ${submission.userEmail ?? "该用户"} 的 ${planLabels[submission.tier]} 申请吗？`, [
      { text: "取消", style: "cancel" },
      {
        text: actionLabel,
        style: action === "approve" ? "default" : "destructive",
        onPress: () => mutation.mutate({ submissionId: submission.id, action }),
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <Screen>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <PageHeader title="付款审核" onBack={() => router.back()} />
          <View style={{ padding: theme.spacing.page }}>
            <StatusMessage tone="danger">仅管理员可以审核付款申请。</StatusMessage>
          </View>
        </SafeAreaView>
      </Screen>
    );
  }

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="付款审核" onBack={() => router.back()} />
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
              <LocalIcon name="chat" size={32} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>付款审核</Text>
                <MutedText>通过申请后会自动更新用户套餐。</MutedText>
              </View>
            </View>
          </Card>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {filters.map((item) => {
              const active = filter === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="radio"
                  accessibilityLabel={`付款筛选：${item.label}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setFilter(item.key)}
                  style={{
                    borderRadius: 999,
                    paddingHorizontal: 14,
                    paddingVertical: 9,
                    backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.accent : theme.colors.border,
                  }}
                >
                  <Text style={{ color: active ? "#0A1A00" : theme.colors.text, fontSize: 13, fontWeight: "900" }}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {query.isPending ? <StatusMessage tone="neutral">正在加载付款申请...</StatusMessage> : null}
          {query.error instanceof Error ? <StatusMessage tone="danger">{query.error.message}</StatusMessage> : null}
          {mutation.isSuccess ? <StatusMessage tone="success">审核状态已更新。</StatusMessage> : null}
          {mutation.error instanceof Error ? <StatusMessage tone="danger">{mutation.error.message}</StatusMessage> : null}
          {query.data?.length === 0 ? <StatusMessage tone="neutral">暂无{filter === "pending" ? "待审核" : ""}付款记录。</StatusMessage> : null}

          <View style={{ gap: 10 }}>
            {query.data?.map((submission) => (
              <PaymentCard
                key={submission.id}
                submission={submission}
                processing={mutation.isPending && mutation.variables?.submissionId === submission.id}
                onApprove={() => confirmReview(submission, "approve")}
                onReject={() => confirmReview(submission, "reject")}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}

function PaymentCard({
  submission,
  processing,
  onApprove,
  onReject,
}: {
  submission: PaymentSubmission;
  processing: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { theme } = useTheme();
  const statusMeta = getStatusMeta(submission.status);

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text numberOfLines={1} style={{ color: theme.colors.text, fontSize: 16, fontWeight: "900" }}>
            {submission.userEmail ?? "未知用户"}
          </Text>
          <MutedText>{planLabels[submission.tier]} · 交易单号：{submission.transaction_id}</MutedText>
          <Text style={{ color: theme.colors.subtle, fontSize: 12 }}>
            提交时间：{new Date(submission.created_at).toLocaleString()}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            backgroundColor: `${statusMeta.color}18`,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text style={{ color: statusMeta.color, fontSize: 12, fontWeight: "900" }}>{statusMeta.label}</Text>
        </View>
      </View>

      {submission.status === "pending" ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button title="通过" loading={processing} onPress={onApprove} />
          <Button title="拒绝" variant="danger" disabled={processing} onPress={onReject} />
        </View>
      ) : null}
    </Card>
  );
}

function getStatusMeta(status: PaymentSubmission["status"]) {
  switch (status) {
    case "approved":
      return { label: "已通过", color: "#22C55E" };
    case "rejected":
      return { label: "已拒绝", color: "#FF6B6B" };
    default:
      return { label: "待审核", color: "#FF9F1C" };
  }
}
