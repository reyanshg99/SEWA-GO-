import * as Router from "expo-router";
import { Text, View } from "react-native";

export default function RootLayout() {
  const SlotComponent = Router.Slot;

  if (!SlotComponent) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Expo Router Slot is undefined</Text>
      </View>
    );
  }

  return <SlotComponent />;
}
