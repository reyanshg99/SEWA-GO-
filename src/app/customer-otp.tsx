import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function CustomerOtpScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>SewaGo</Text>
        <Text style={styles.title}>Phone verification unavailable</Text>
        <Text style={styles.subtitle}>
          Customer accounts are currently verified through email. Sign in after confirming the link sent to your email address.
        </Text>
        <Pressable style={styles.button} onPress={() => router.replace("/customer-login")}>
          <Text style={styles.buttonText}>Go to customer login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  content: { width: "100%", maxWidth: 500, alignSelf: "center" },
  logo: { fontSize: 25, fontWeight: "800", color: "#111", marginBottom: 24 },
  title: { fontSize: 27, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 15, lineHeight: 22, color: "#666", marginTop: 10, marginBottom: 24 },
  button: { minHeight: 52, borderRadius: 12, backgroundColor: "#111", justifyContent: "center", alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
