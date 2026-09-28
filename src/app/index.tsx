import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>SewaGo</Text>

        <Text style={styles.title}>Services made simple.</Text>

        <Text style={styles.subtitle}>
          Find trusted professionals for your everyday needs.
        </Text>

        <View style={styles.buttons}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => router.push("/customer-login")}
          >
            <Text style={styles.primaryText}>I'm a Customer</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.push("/worker-login")}
          >
            <Text style={styles.secondaryText}>I'm a Service Professional</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  content: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },

  logo: {
    fontSize: 36,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 28,
  },

  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111111",
    lineHeight: 40,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666666",
    marginTop: 12,
    maxWidth: 360,
  },

  buttons: {
    marginTop: 40,
    gap: 14,
  },

  primaryButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  primaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  secondaryButton: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "600",
  },
});
