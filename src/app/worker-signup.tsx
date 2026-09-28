import { showAlert } from "../utils/alert";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { signUpWorker } from "../services/auth.service";

export default function WorkerSignupScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || password.length < 8) {
      showAlert("Check your details", "Enter your name, a valid email, and a password with at least 8 characters.");
      return;
    }
    try {
      setLoading(true);
      const result = await signUpWorker({ name: name.trim(), email: email.trim().toLowerCase(), password });
      if (result.session) router.replace("/worker-home");
      else showAlert("Verify your email", "Your professional account was created. Verify your email, then sign in.", [{ text: "Go to login", onPress: () => router.replace("/worker-login") }]);
    } catch (error) {
      showAlert("Signup failed", error instanceof Error ? error.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  }

  return <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.replace("/worker-login")}><Text style={styles.back}>‹ Back to login</Text></Pressable>
      <Text style={styles.logo}>SewaGo</Text>
      <Text style={styles.title}>Become a SewaGo professional</Text>
      <Text style={styles.subtitle}>Create an account to manage service requests and bookings.</Text>
      <TextInput style={styles.input} placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" editable={!loading} />
      <TextInput style={styles.input} placeholder="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!loading} />
      <TextInput style={styles.input} placeholder="Password (at least 8 characters)" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!loading} />
      <Pressable style={[styles.button, loading && styles.disabled]} onPress={handleSignup} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create professional account</Text>}
      </Pressable>
      <Pressable style={styles.login} onPress={() => router.replace("/worker-login")}><Text style={styles.loginText}>Already registered? Sign in</Text></Pressable>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, justifyContent: "center", width: "100%", maxWidth: 520, alignSelf: "center", padding: 24 },
  back: { color: "#666", fontSize: 15, marginBottom: 26 },
  logo: { fontSize: 25, fontWeight: "800", color: "#111", marginBottom: 20 },
  title: { fontSize: 27, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 15, lineHeight: 22, color: "#666", marginTop: 9, marginBottom: 24 },
  input: { height: 52, borderWidth: 1, borderColor: "#ddd", borderRadius: 12, paddingHorizontal: 15, fontSize: 16, marginBottom: 13, backgroundColor: "#fafafa" },
  button: { minHeight: 52, borderRadius: 12, backgroundColor: "#111", alignItems: "center", justifyContent: "center", paddingHorizontal: 14, marginTop: 5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.55 },
  login: { alignItems: "center", padding: 20 },
  loginText: { color: "#555", fontSize: 14 },
});
