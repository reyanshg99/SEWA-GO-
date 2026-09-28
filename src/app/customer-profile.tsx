import { showAlert } from "../utils/alert";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { signOut } from "../services/auth.service";
import { errorMessage } from "../utils/display";

export default function CustomerProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/customer-login");
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, email, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data?.role === "worker") {
        router.replace("/worker-home");
        return;
      }

      if (data) {
        setName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? user.email ?? "");
      }
    } catch (error) {
      console.log("LOAD PROFILE ERROR:", error);

      showAlert(
        "Unable to load profile",
        errorMessage(error, "Something went wrong."),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      showAlert("Error", "Your account could not be identified.");
      return;
    }

    if (!name.trim()) {
      showAlert("Name required", "Please enter your full name.");
      return;
    }

    const cleanedPhone = phone.replace(/\D/g, "");

    // Phone is OPTIONAL for now.
    // If the user enters one, it must be 10 digits.
    if (cleanedPhone.length > 0 && cleanedPhone.length !== 10) {
      showAlert(
        "Invalid phone number",
        "Enter a valid 10-digit Nepal phone number or leave it empty.",
      );
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          phone: cleanedPhone.length > 0 ? cleanedPhone : null,
        })
        .eq("id", userId);

      if (error) {
        console.log("SAVE PROFILE ERROR:", error);
        throw error;
      }

      // Read the saved profile again.
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("full_name, phone, email")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? email);
      }

      showAlert("Profile updated", "Your changes have been saved.", [
        {
          text: "OK",
          onPress: () => router.replace("/customer-home"),
        },
      ]);
    } catch (error) {
      console.log("PROFILE UPDATE ERROR:", error);

      showAlert(
        "Update failed",
        errorMessage(error, "Unable to save your profile."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      showAlert("Logout failed", errorMessage(error, "Unable to log out."));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Pressable onPress={() => router.replace("/customer-home")} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>

          <Text style={styles.logo}>SewaGo</Text>

          <Text style={styles.title}>Your Profile</Text>

          <Text style={styles.subtitle}>Manage your personal information.</Text>

          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(name || "C").charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.label}>Full name</Text>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor="#999999"
            autoCapitalize="words"
            editable={!saving}
          />

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={email}
            editable={false}
          />

          <Text style={styles.emailNote}>Email cannot be changed here.</Text>

          <Text style={styles.label}>Phone number</Text>

          <View style={styles.phoneContainer}>
            <Text style={styles.countryCode}>+977</Text>

            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="98XXXXXXXX"
              placeholderTextColor="#999999"
              keyboardType="phone-pad"
              maxLength={10}
              editable={!saving}
            />
          </View>

          <Text style={styles.phoneNote}>
            Phone number is optional for now.
          </Text>

          <Pressable
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? "Saving..." : "Save changes"}
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#666666",
    fontSize: 15,
  },

  scrollContent: {
    width: "100%",
    maxWidth: 700,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 50,
  },

  content: {
    width: "100%",
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 30,
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
    color: "#666666",
    marginTop: 8,
    marginBottom: 28,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 26,
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
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
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111111",
  },

  disabledInput: {
    backgroundColor: "#EEEEEE",
    color: "#777777",
  },

  emailNote: {
    fontSize: 12,
    color: "#888888",
    marginTop: 6,
  },

  phoneContainer: {
    height: 56,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
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

  phoneNote: {
    fontSize: 12,
    color: "#888888",
    marginTop: 6,
  },

  saveButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 26,
  },

  disabledButton: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E2E2",
    marginVertical: 30,
  },

  logoutButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "600",
  },
});
