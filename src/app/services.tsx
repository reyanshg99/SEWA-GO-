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

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(false);

      const [
        { data: serviceData, error: serviceError },
        { data: categoryData, error: categoryError },
      ] = await Promise.all([
        supabase
          .from("services")
          .select(
            "id, name, description, starting_price, estimated_duration_minutes, category_id",
          )
          .eq("is_active", true)
          .order("name"),

        supabase
          .from("categories")
          .select("id, name")
          .eq("is_active", true)
          .order("sort_order"),
      ]);

      if (serviceError) {
        throw serviceError;
      }

      if (categoryError) {
        throw categoryError;
      }

      setServices(serviceData ?? []);
      setCategories(categoryData ?? []);
    } catch (error) {
      console.log("SERVICE LOAD ERROR:", error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) =>
    (selectedCategory === "all" || service.category_id === selectedCategory) &&
    `${service.name} ${service.description ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const getDuration = (minutes: number | null) => {
    if (!minutes) {
      return "Duration varies";
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);

    return category?.name ?? "Service";
  };

  const openService = (serviceId: string) => {
    router.push({
      pathname: "/service-details",
      params: {
        id: serviceId,
      },
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.replace("/customer-home")} style={styles.backButton}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Services</Text>

            <Text style={styles.subtitle}>Choose a service for your needs</Text>
          </View>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search services"
          placeholderTextColor="#888888"
          accessibilityLabel="Search services"
          style={styles.searchInput}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <Pressable
            style={[
              styles.categoryButton,
              selectedCategory === "all" && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory("all")}
          >
            <Text
              style={[
                styles.categoryText,
                selectedCategory === "all" && styles.categoryTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>

          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[
                styles.categoryButton,
                selectedCategory === category.id && styles.categoryButtonActive,
              ]}
              onPress={() => setSelectedCategory(category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id && styles.categoryTextActive,
                ]}
              >
                {category.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {error ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Services could not be loaded</Text>
            <Text style={styles.emptyText}>Check your connection and try again.</Text>
            <Pressable style={styles.retryButton} onPress={loadServices}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>{query.trim() ? "No matching services" : "No services available"}</Text>

            <Text style={styles.emptyText}>
              Services will appear here once they are added.
            </Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {filteredServices.map((service) => (
              <Pressable
                key={service.id}
                style={({ pressed }) => [
                  styles.serviceCard,
                  pressed && styles.servicePressed,
                ]}
                onPress={() => openService(service.id)}
              >
                <View style={styles.iconContainer}>
                  <Text style={styles.iconText}>
                    {service.name.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{service.name}</Text>

                  <Text style={styles.categoryName}>
                    {getCategoryName(service.category_id)}
                  </Text>

                  <Text style={styles.description}>
                    {service.description ||
                      "Professional service from trusted providers."}
                  </Text>

                  <View style={styles.detailsRow}>
                    <Text style={styles.duration}>
                      {getDuration(service.estimated_duration_minutes)}
                    </Text>

                    {service.starting_price !== null && (
                      <Text style={styles.price}>
                        From ₹
                        {Number(service.starting_price).toLocaleString("en-IN")}
                      </Text>
                    )}
                  </View>
                </View>

                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))}
          </View>
        )}
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginBottom: 18,
    color: "#111111",
  },
  retryButton: { marginTop: 16, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 11, borderRadius: 10, backgroundColor: "#111111" },
  retryText: { color: "#FFFFFF", fontWeight: "600" },

  loadingText: {
    marginTop: 12,
    color: "#666666",
    fontSize: 15,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: "#E2E2E2",
  },

  backText: {
    fontSize: 28,
    color: "#111111",
    lineHeight: 30,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 14,
    color: "#777777",
    marginTop: 4,
  },

  categoryScroll: {
    paddingBottom: 20,
    gap: 10,
  },

  categoryButton: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },

  categoryButtonActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#555555",
  },

  categoryTextActive: {
    color: "#FFFFFF",
  },

  servicesList: {
    gap: 12,
  },

  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6E6E6",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  servicePressed: {
    opacity: 0.7,
  },

  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },

  iconText: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111111",
  },

  serviceInfo: {
    flex: 1,
  },

  serviceName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  categoryName: {
    fontSize: 12,
    color: "#888888",
    marginTop: 3,
  },

  description: {
    fontSize: 13,
    color: "#666666",
    lineHeight: 18,
    marginTop: 7,
  },

  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },

  duration: {
    fontSize: 12,
    color: "#777777",
  },

  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111111",
  },

  arrow: {
    fontSize: 28,
    color: "#999999",
    marginLeft: 10,
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  emptyText: {
    fontSize: 14,
    color: "#777777",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 21,
  },
});
