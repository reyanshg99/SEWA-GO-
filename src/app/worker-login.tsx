import { showAlert } from "../utils/alert";
import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { signInWorker } from "../services/auth.service";
import { errorMessage } from "../utils/display";

export default function WorkerLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      showAlert(
        "Missing information",
        "Please enter your email and password.",
      );
      return;
    }

    try {
      setLoading(true);

      await signInWorker(email.trim(), password);

      router.replace("/worker-home");
    } catch (error) {
      showAlert(
        "Login failed",
        errorMessage(error, "Unable to sign in. Please check your details."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>SewaGo</Text>

        <Text style={styles.title}>Service Professional Login</Text>

        <Text style={styles.subtitle}>
          Sign in to manage your services and bookings.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor="#888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Sign In"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.signupButton}
          onPress={() => router.push("/worker-signup")}
        >
          <Text style={styles.signupText}>
            Don't have a professional account?{" "}
            <Text style={styles.signupBold}>Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },

  logo: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111",
    textAlign: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 27,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 28,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111",
    marginBottom: 14,
    backgroundColor: "#fafafa",
  },

  button: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  signupButton: {
    marginTop: 20,
    alignItems: "center",
  },

  signupText: {
    color: "#777",
    fontSize: 14,
    textAlign: "center",
  },

  signupBold: {
    color: "#111",
    fontWeight: "700",
  },
});
