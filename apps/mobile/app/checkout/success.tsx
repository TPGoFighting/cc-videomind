import { Link } from "expo-router";
import { View } from "react-native";
import { Button, Card, MutedText, Screen, Title } from "@/components/ui";

export default function CheckoutSuccessScreen() {
  return (
    <Screen>
      <View style={{ padding: 20 }}>
        <Card>
          <Title>Subscription updated</Title>
          <MutedText>Stripe has received your checkout. The webhook will update your profile shortly.</MutedText>
          <Link href="/settings" asChild>
            <Button title="Back to settings" />
          </Link>
        </Card>
      </View>
    </Screen>
  );
}
