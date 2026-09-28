import { showAlert } from "../utils/alert";
import { router } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { signInCustomer } from "../services/auth.service";
import { errorMessage } from "../utils/display";

export default function CustomerLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) {
      showAlert("Email required", "Please enter your email.");
      return;
    }

    if (!password) {
      showAlert("Password required", "Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const data = await signInCustomer(email.trim().toLowerCase(), password);

      if (!data.session) {
        showAlert(
          "Login incomplete",
          "Please verify your email before logging in.",
        );
        return;
      }

      router.replace("/customer-home");
    } catch (error) {
      showAlert(
        "Login failed",
        errorMessage(error, "Invalid email or password."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Pressable
            onPress={() => router.replace("/")}
            style={styles.backButton}
            disabled={loading}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <Text style={styles.logo}>SewaGo</Text>

          <Text style={styles.title}>Welcome back</Text>

          <Text style={styles.subtitle}>
            Log in to book trusted local services.
          </Text>

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Your password"
            placeholderTextColor="#999999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            editable={!loading}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              loading && styles.buttonDisabled,
              pressed && !loading && styles.buttonPressed,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Logging in..." : "Log in"}
            </Text>
          </Pressable>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account?</Text>

            <Pressable
              onPress={() => router.push("/customer-signup")}
              disabled={loading}
            >
              <Text style={styles.signupLink}> Sign up</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },

  content: {
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 35,
  },

  backText: {
    fontSize: 16,
    color: "#666666",
  },

  logo: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 32,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#666666",
    marginTop: 10,
    marginBottom: 28,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222222",
    marginTop: 16,
    marginBottom: 8,
  },

  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111111",
    backgroundColor: "#FFFFFF",
  },

  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonPressed: {
    opacity: 0.75,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 26,
  },

  signupText: {
    color: "#666666",
    fontSize: 14,
  },

  signupLink: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "700",
  },
});
