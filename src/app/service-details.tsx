import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Service = {
  id: string;
  name: string;
  description: string | null;
  starting_price: number | null;
  estimated_duration_minutes: number | null;
  category_id: string;
};

type Category = {
  id: string;
  name: string;
};

export default function ServiceDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [service, setService] = useState<Service | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (id) {
      loadService();
    } else { setLoading(false); setLoadError(true); }
  }, [id]);

  const loadService = async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const { data, error } = await supabase
        .from("services")
        .select(
          "id, name, description, starting_price, estimated_duration_minutes, category_id",
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setService(null);
        return;
      }

      setService(data);

      const { data: categoryData } = await supabase
        .from("categories")
        .select("id, name")
        .eq("id", data.category_id)
        .maybeSingle();

      setCategory(categoryData);
    } catch (error) {
      console.log("Service details error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const getDuration = (minutes: number | null) => {
    if (!minutes) {
      return "Duration varies";
    }

    if (minutes < 60) {
      return `${minutes} minutes`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? "s" : ""}`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading service...</Text>
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{loadError ? "Service could not be loaded" : "Service not found"}</Text>

        <Text style={styles.errorText}>
          This service may no longer be available.
        </Text>

        {loadError ? <Pressable style={styles.backButtonLarge} onPress={loadService}><Text style={styles.backButtonText}>Retry</Text></Pressable> : null}
        <Pressable style={styles.backButtonLarge} onPress={() => router.replace("/services")}><Text style={styles.backButtonText}>Back to services</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable style={styles.backButton} onPress={() => router.replace("/services")}>
          <Text style={styles.backIcon}>‹</Text>

          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Text style={styles.iconText}>
              {service.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <Text style={styles.category}>{category?.name ?? "Service"}</Text>

          <Text style={styles.title}>{service.name}</Text>

          <Text style={styles.description}>
            {service.description ||
              "Professional service from a trusted SewaGo service provider."}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Starting price</Text>

            <Text style={styles.infoValue}>
              {service.starting_price !== null
                ? `₹${Number(service.starting_price).toLocaleString("en-IN")}`
                : "Price varies"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Estimated duration</Text>

            <Text style={styles.infoValue}>
              {getDuration(service.estimated_duration_minutes)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this service</Text>

          <Text style={styles.sectionText}>
            Book a trusted professional through SewaGo. You can choose a
            convenient date and time, provide your location and review the
            booking before confirming.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How it works</Text>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Choose a time</Text>

              <Text style={styles.stepText}>
                Select a date and time that works for you.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Get matched</Text>

              <Text style={styles.stepText}>
                A suitable service professional can handle your request.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>

            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Get the job done</Text>

              <Text style={styles.stepText}>
                Your professional completes the requested service.
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.bookButton,
            pressed && styles.bookButtonPressed,
          ]}
          onPress={() =>
            router.push({
              pathname: "/booking",
              params: {
                id: service.id,
                name: service.name,
                price: String(service.starting_price ?? 0),
              },
            })
          }
        >
          <Text style={styles.bookButtonText}>Book this service</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  scrollContent: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
    padding: 24,
    paddingBottom: 50,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666666",
  },

  errorContainer: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
  },

  errorText: {
    fontSize: 14,
    color: "#777777",
    marginTop: 8,
    textAlign: "center",
  },

  backButtonLarge: {
    marginTop: 25,
    backgroundColor: "#111111",
    paddingHorizontal: 25,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  backIcon: {
    fontSize: 32,
    color: "#111111",
    marginRight: 5,
  },

  backText: {
    fontSize: 15,
    color: "#555555",
    fontWeight: "600",
  },

  hero: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },

  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  iconText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
  },

  category: {
    fontSize: 13,
    fontWeight: "600",
    color: "#777777",
    marginBottom: 6,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
  },

  description: {
    fontSize: 15,
    color: "#666666",
    lineHeight: 23,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 650,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    marginTop: 16,
    padding: 20,
    flexDirection: "row",
  },

  infoItem: {
    flex: 1,
    alignItems: "center",
  },

  infoLabel: {
    fontSize: 12,
    color: "#888888",
    marginBottom: 7,
  },

  infoValue: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  divider: {
    width: 1,
    backgroundColor: "#E5E5E5",
  },

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    padding: 22,
    marginTop: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 10,
  },

  sectionText: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 22,
  },

  step: {
    flexDirection: "row",
    marginTop: 18,
  },

  stepNumber: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  stepContent: {
    flex: 1,
  },

  stepTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
  },

  stepText: {
    fontSize: 13,
    color: "#777777",
    lineHeight: 19,
    marginTop: 3,
  },

  bookButton: {
    height: 56,
    backgroundColor: "#111111",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  bookButtonPressed: {
    opacity: 0.7,
  },

  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
