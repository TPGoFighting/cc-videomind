import { Link } from "expo-router";
import { View } from "react-native";
import { Button, Card, MutedText, Screen, Title } from "@/components/ui";

export default function CheckoutCancelledScreen() {
  return (
    <Screen>
      <View style={{ padding: 20 }}>
        <Card>
          <Title>Checkout cancelled</Title>
          <MutedText>No payment was completed. You can restart checkout whenever you are ready.</MutedText>
          <Link href="/settings" asChild>
            <Button title="Back to settings" variant="secondary" />
          </Link>
        </Card>
      </View>
    </Screen>
  );
}
