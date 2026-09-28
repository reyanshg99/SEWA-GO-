import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

type CompletedBooking = {
  id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  estimated_amount: number | null;
  final_amount: number | null;
};

type Service = {
  id: string;
  name: string;
};

export default function WorkerEarningsScreen() {
  const [bookings, setBookings] = useState<CompletedBooking[]>([]);
  const [services, setServices] = useState<Record<string, string>>({});
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEarnings();
    }, []),
  );

  async function loadEarnings() {
    try {
      setLoading(true);
      setLoadError(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/worker-login");
        return;
      }

      const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== "worker") { router.replace("/customer-home"); return; }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          service_id,
          scheduled_date,
          scheduled_start_time,
          estimated_amount,
          final_amount
        `,
        )
        .eq("worker_id", user.id)
        .eq("status", "completed")
        .order("scheduled_date", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const completedBookings = data || [];

      const serviceIds = [
        ...new Set(
          completedBookings
            .map((booking) => booking.service_id)
            .filter(Boolean),
        ),
      ];

      const serviceMap: Record<string, string> = {};

      if (serviceIds.length > 0) {
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("id, name")
          .in("id", serviceIds);

        if (serviceError) {
          console.log("Service loading error:", serviceError);
        }

        for (const service of serviceData || []) {
          serviceMap[service.id] = service.name;
        }
      }

      const total = completedBookings.reduce((sum, booking) => {
        const amount =
          booking.final_amount !== null
            ? Number(booking.final_amount)
            : Number(booking.estimated_amount || 0);

        return sum + amount;
      }, 0);

      setBookings(completedBookings);
      setServices(serviceMap);
      setTotalEarnings(total);
    } catch (error) {
      console.log("Worker earnings error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(value: string) {
    if (!value) {
      return "Date unavailable";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatTime(value: string) {
    if (!value) {
      return "";
    }

    const parts = value.split(":");

    if (parts.length < 2) {
      return value;
    }

    let hour = Number(parts[0]);
    const minute = parts[1];
    const period = hour >= 12 ? "PM" : "AM";

    if (hour === 0) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
    }

    return `${hour}:${minute} ${period}`;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading earnings...</Text>
      </View>
    );
  }

  if (loadError) {
    return <View style={styles.loadingContainer}>
      <Text style={styles.title}>Earnings could not be loaded</Text>
      <Text style={styles.loadingText}>Check your connection and try again.</Text>
      <Pressable style={styles.backButton} onPress={loadEarnings}><Text style={styles.backIcon}>Retry</Text></Pressable>
      <Pressable style={styles.dashboardButton} onPress={() => router.replace("/worker-home")}><Text style={styles.dashboardButtonText}>Back to dashboard</Text></Pressable>
    </View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/worker-home")}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>Earnings</Text>

            <Text style={styles.subtitle}>Your completed service earnings</Text>
          </View>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL EARNINGS</Text>

          <Text style={styles.totalAmount}>
            ₹{totalEarnings.toLocaleString("en-IN")}
          </Text>

          <Text style={styles.totalSubtext}>
            From {bookings.length} completed{" "}
            {bookings.length === 1 ? "job" : "jobs"}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Earnings history</Text>

          <Text style={styles.jobCount}>{bookings.length}</Text>
        </View>

        {bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No completed jobs yet</Text>

            <Text style={styles.emptyText}>
              Your earnings history will appear here after you complete service
              bookings.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const amount =
              booking.final_amount !== null
                ? Number(booking.final_amount)
                : Number(booking.estimated_amount || 0);

            return (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View style={styles.serviceIcon}>
                    <Text style={styles.serviceIconText}>
                      {(services[booking.service_id] || "S")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.bookingInfo}>
                    <Text style={styles.serviceName}>
                      {services[booking.service_id] || "Service"}
                    </Text>

                    <Text style={styles.dateText}>
                      {formatDate(booking.scheduled_date)}
                    </Text>

                    <Text style={styles.timeText}>
                      {formatTime(booking.scheduled_start_time)}
                    </Text>
                  </View>

                  <View style={styles.amountContainer}>
                    <Text style={styles.amount}>
                      ₹{amount.toLocaleString("en-IN")}
                    </Text>

                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/worker-home")}
        >
          <Text style={styles.dashboardButtonText}>Back to dashboard</Text>
        </Pressable>

        <View style={styles.bottomSpace} />
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
    paddingBottom: 60,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666666",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  backIcon: {
    fontSize: 30,
    color: "#111111",
    marginTop: -3,
  },

  title: {
    fontSize: 27,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 13,
    color: "#777777",
    marginTop: 4,
  },

  totalCard: {
    backgroundColor: "#111111",
    borderRadius: 20,
    padding: 25,
    marginBottom: 30,
  },

  totalLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#AAAAAA",
    letterSpacing: 1,
  },

  totalAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 8,
  },

  totalSubtext: {
    fontSize: 13,
    color: "#BBBBBB",
    marginTop: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
  },

  jobCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 12,
    fontWeight: "700",
    color: "#333333",
    paddingTop: 6,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 28,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  emptyText: {
    fontSize: 13,
    color: "#777777",
    lineHeight: 20,
    textAlign: "center",
    marginTop: 7,
  },

  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },

  bookingTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  serviceIconText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
  },

  bookingInfo: {
    flex: 1,
  },

  serviceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  dateText: {
    fontSize: 12,
    color: "#777777",
    marginTop: 5,
  },

  timeText: {
    fontSize: 12,
    color: "#999999",
    marginTop: 2,
  },

  amountContainer: {
    alignItems: "flex-end",
    marginLeft: 10,
  },

  amount: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  completedText: {
    fontSize: 10,
    color: "#777777",
    marginTop: 5,
  },

  dashboardButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  dashboardButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  bottomSpace: {
    height: 20,
  },
});
