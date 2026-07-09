import { Image, Modal, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useTheme } from "@/providers/theme-provider";

const paymentSources = {
  alipay: require("../../assets/payments/alipay.jpg"),
  wechat: require("../../assets/payments/wechat-pay.jpg"),
} as const;

export const paymentMeta = {
  alipay: { title: "支付宝支付", hint: "打开支付宝扫一扫完成付款", color: "#1677FF" },
  wechat: { title: "微信支付", hint: "打开微信扫一扫完成付款", color: "#08C060" },
} as const;

export type PaymentMethod = keyof typeof paymentSources;

export function PaymentQrModal({
  method,
  onClose,
}: {
  method: PaymentMethod | null;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const { width, height } = useWindowDimensions();
  const meta = method ? paymentMeta[method] : null;

  return (
    <Modal visible={Boolean(method)} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.82)",
          justifyContent: "center",
          padding: 18,
        }}
      >
        <View
          style={{
            borderRadius: theme.radius.lg,
            backgroundColor: theme.colors.surface,
            padding: 16,
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: "900" }}>{meta?.title}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 4 }}>{meta?.hint}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="关闭收款码"
              onPress={onClose}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.colors.surfaceRaised,
              }}
            >
              <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: "700" }}>×</Text>
            </Pressable>
          </View>

          {method ? (
            <Image
              source={paymentSources[method]}
              resizeMode="contain"
              style={{
                width: "100%",
                height: Math.min(height * 0.7, width * 1.35),
                borderRadius: theme.radius.md,
                backgroundColor: "#FFFFFF",
              }}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
