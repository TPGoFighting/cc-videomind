import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/providers/auth-provider";
import { useTheme } from "@/providers/theme-provider";
import { planConfigs, planDescriptions, planLabels } from "@/lib/plans";
import { Button, Card, MutedText, Screen } from "@/components/ui";
import { LocalIcon } from "@/components/local-icon";
import { SafeAreaView } from "react-native-safe-area-context";
import { PageHeader } from "@/components/page-header";

export default function PlanSettingsScreen() {
  const { theme } = useTheme();
  const { subscriptionTier } = useAuth();

  return (
    <Screen>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <PageHeader title="当前套餐" onBack={() => router.back()} />
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{
            padding: theme.spacing.page,
            gap: 14,
            paddingBottom: 40,
          }}
        >
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <LocalIcon name="trophy" size={32} color={theme.colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>当前套餐</Text>
                <MutedText>{planDescriptions[subscriptionTier]}</MutedText>
              </View>
            </View>
            <View
              style={{
                borderRadius: theme.radius.md,
                backgroundColor: `${theme.colors.accent}18`,
                padding: 14,
                borderWidth: 1,
                borderColor: `${theme.colors.accent}55`,
              }}
            >
              <Text style={{ color: theme.colors.accent, fontSize: 26, fontWeight: "900" }}>
                {planLabels[subscriptionTier]}
              </Text>
            </View>
          </Card>

          {planConfigs.map((plan) => (
            <Card key={plan.tier}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>{plan.title}</Text>
                <Text style={{ color: theme.colors.accent, fontSize: 16, fontWeight: "900" }}>{plan.priceLabel}</Text>
              </View>
              <MutedText>{plan.description}</MutedText>
            </Card>
          ))}

          <Button title="查看 Pro 订阅" onPress={() => router.push("/settings/subscription")} />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  );
}
