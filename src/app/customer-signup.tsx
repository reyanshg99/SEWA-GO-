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
import { signUpCustomer } from "../services/auth.service";
import { errorMessage } from "../utils/display";

export default function CustomerSignupScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name.trim()) {
      showAlert("Name required", "Please enter your full name.");
      return;
    }

    const cleanedPhone = phone.replace(/\D/g, "");

    if (cleanedPhone.length !== 10) {
      showAlert(
        "Invalid phone number",
        "Please enter a valid 10-digit Nepal phone number.",
      );
      return;
    }

    if (!email.trim()) {
      showAlert("Email required", "Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showAlert("Invalid email", "Please enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      showAlert(
        "Password too short",
        "Your password must contain at least 8 characters.",
      );
      return;
    }

    if (password !== confirmPassword) {
      showAlert(
        "Passwords do not match",
        "Please make sure both passwords are the same.",
      );
      return;
    }

    try {
      setLoading(true);

      const data = await signUpCustomer({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: cleanedPhone,
      });

      if (data.session) {
        router.replace("/customer-home");
        return;
      }

      showAlert(
        "Check your email",
        "Your account was created. Please verify your email before logging in.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/customer-login"),
          },
        ],
      );
    } catch (error) {
      showAlert(
        "Signup failed",
        errorMessage(error, "Unable to create your account."),
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
          <Pressable onPress={() => router.replace("/customer-login")} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <Text style={styles.logo}>SewaGo</Text>

          <Text style={styles.title}>Create your account</Text>

          <Text style={styles.subtitle}>
            Join SewaGo and find trusted professionals for your everyday needs.
          </Text>

          {/* NAME */}

          <Text style={styles.label}>Full name</Text>

          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#999999"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            editable={!loading}
          />

          {/* PHONE */}

          <Text style={styles.label}>Phone number</Text>

          <View style={styles.phoneContainer}>
            <Text style={styles.countryCode}>+977</Text>

            <TextInput
              style={styles.phoneInput}
              placeholder="98XXXXXXXX"
              placeholderTextColor="#999999"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={10}
              editable={!loading}
            />
          </View>

          {/* EMAIL */}

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#999999"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          {/* PASSWORD */}

          <Text style={styles.label}>Password</Text>

          <TextInput
            style={styles.input}
            placeholder="At least 8 characters"
            placeholderTextColor="#999999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            editable={!loading}
          />

          {/* CONFIRM PASSWORD */}

          <Text style={styles.label}>Confirm password</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your password again"
            placeholderTextColor="#999999"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            autoCapitalize="none"
            editable={!loading}
          />

          {/* SIGNUP BUTTON */}

          <Pressable
            style={({ pressed }) => [
              styles.button,
              loading && styles.buttonDisabled,
              pressed && !loading && styles.buttonPressed,
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating account..." : "Create account"}
            </Text>
          </Pressable>

          {/* LOGIN */}

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>

            <Pressable
              onPress={() => router.replace("/customer-login")}
              disabled={loading}
            >
              <Text style={styles.loginLink}> Log in</Text>
            </Pressable>
          </View>

          <Text style={styles.terms}>
            By creating an account, you agree to SewaGo's Terms of Service and
            Privacy Policy.
          </Text>
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
    marginBottom: 32,
  },

  backText: {
    fontSize: 16,
    color: "#666666",
  },

  logo: {
    fontSize: 25,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 28,
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
    marginBottom: 26,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 8,
    marginTop: 16,
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

  phoneContainer: {
    height: 56,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  countryCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222222",
    marginRight: 12,
  },

  phoneInput: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#111111",
  },

  button: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
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

  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },

  loginText: {
    color: "#666666",
    fontSize: 14,
  },

  loginLink: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "700",
  },

  terms: {
    textAlign: "center",
    color: "#888888",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 20,
    marginBottom: 10,
  },
});
