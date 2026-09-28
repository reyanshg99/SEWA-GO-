import { showAlert } from "../utils/alert";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "../lib/supabase";
import { signOut } from "../services/auth.service";

export default function WorkerProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("Professional");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(false);

  async function loadProfile() {
    try {
      setLoading(true);
      setError(false);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) { router.replace("/worker-login"); return; }
      setEmail(user.email ?? "");
      const { data, error: profileError } = await supabase.from("profiles").select("full_name, phone, role").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      if (data?.role !== "worker") { await signOut(); router.replace("/worker-login"); return; }
      setName(data.full_name || "Professional");
      setPhone(data.phone || "");
    } catch (cause) {
      console.log("Worker profile loading error:", cause);
      setError(true);
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadProfile(); }, []);

  async function logout() {
    try { await signOut(); router.replace("/"); }
    catch (cause) { showAlert("Logout failed", cause instanceof Error ? cause.message : "Please try again."); }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator /><Text style={styles.muted}>Loading profile…</Text></View>;
  if (error) return <View style={styles.center}><Text style={styles.title}>Profile unavailable</Text><Text style={styles.muted}>Check your connection and try again.</Text><Pressable style={styles.button} onPress={loadProfile}><Text style={styles.buttonText}>Retry</Text></Pressable></View>;

  return <ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.replace("/worker-home")}><Text style={styles.back}>‹ Back to dashboard</Text></Pressable>
    <Text style={styles.logo}>SewaGo</Text>
    <View style={styles.card}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.muted}>Service professional</Text>
      <View style={styles.divider} />
      <Text style={styles.label}>Email</Text><Text style={styles.value}>{email || "Not provided"}</Text>
      <Text style={styles.label}>Phone</Text><Text style={styles.value}>{phone ? `+977 ${phone}` : "Not provided"}</Text>
    </View>
    <Pressable style={styles.button} onPress={logout}><Text style={styles.buttonText}>Log out</Text></Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, width: "100%", maxWidth: 700, alignSelf: "center", padding: 24, backgroundColor: "#F7F7F7" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#fff", gap: 12 },
  back: { color: "#666", fontSize: 15, marginBottom: 22 },
  logo: { fontSize: 25, fontWeight: "800", color: "#111", marginBottom: 20 },
  card: { padding: 24, borderRadius: 18, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5e5", alignItems: "flex-start" },
  avatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#eee", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  avatarText: { fontSize: 23, fontWeight: "700", color: "#111" },
  title: { fontSize: 24, fontWeight: "700", color: "#111" },
  muted: { color: "#666", fontSize: 15, marginTop: 5 },
  divider: { height: 1, width: "100%", backgroundColor: "#eee", marginVertical: 20 },
  label: { color: "#888", fontSize: 12, textTransform: "uppercase", marginTop: 12 },
  value: { color: "#111", fontSize: 16, marginTop: 4 },
  button: { marginTop: 20, minHeight: 52, borderRadius: 12, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
