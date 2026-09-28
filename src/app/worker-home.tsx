import { showAlert } from "../utils/alert";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { formatBookingStatus } from "../utils/display";
import { errorMessage } from "../utils/display";

type Booking = {
  id: string;
  customer_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  status: string;
  estimated_amount: number | null;
  final_amount: number | null;
};

type Service = {
  id: string;
  name: string;
};

const ACTIVE_STATUSES = ["accepted", "on_the_way", "arrived", "in_progress"];

export default function WorkerHomeScreen() {
  const [name, setName] = useState("Professional");
  const [newRequests, setNewRequests] = useState<Booking[]>([]);
  const [activeJobs, setActiveJobs] = useState<Booking[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [services, setServices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, []),
  );

  async function loadDashboard() {
    try {
      setLoadError(false);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/worker-login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "worker") {
        router.replace("/customer-home");
        return;
      }

      if (profile?.full_name) {
        setName(profile.full_name);
      }

      const { data: pendingData, error: pendingError } = await supabase
        .from("bookings")
        .select(
          `
            id,
            customer_id,
            service_id,
            scheduled_date,
            scheduled_start_time,
            status,
            estimated_amount,
            final_amount
          `,
        )
        .eq("status", "pending")
        .is("worker_id", null)
        .order("scheduled_date", { ascending: true });

      if (pendingError) throw pendingError;

      const { data: activeData, error: activeError } = await supabase
        .from("bookings")
        .select(
          `
            id,
            customer_id,
            service_id,
            scheduled_date,
            scheduled_start_time,
            status,
            estimated_amount,
            final_amount
          `,
        )
        .eq("worker_id", user.id)
        .in("status", ACTIVE_STATUSES)
        .order("scheduled_date", { ascending: true });

      if (activeError) throw activeError;

      const { data: completedData, error: completedError } = await supabase
        .from("bookings")
        .select("estimated_amount, final_amount")
        .eq("worker_id", user.id)
        .eq("status", "completed");

      if (completedError) throw completedError;

      const serviceIds = [
        ...new Set(
          [...(pendingData || []), ...(activeData || [])]
            .map((booking) => booking.service_id)
            .filter(Boolean),
        ),
      ];

      let serviceMap: Record<string, string> = {};

      if (serviceIds.length > 0) {
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("id, name")
          .in("id", serviceIds);
        if (serviceError) throw serviceError;

        for (const service of serviceData || []) {
          serviceMap[service.id] = service.name;
        }
      }

      const totalEarnings = (completedData || []).reduce((total, booking) => {
        const amount =
          booking.final_amount !== null
            ? Number(booking.final_amount)
            : Number(booking.estimated_amount || 0);

        return total + amount;
      }, 0);

      setNewRequests(pendingData || []);
      setActiveJobs(activeData || []);
      setEarnings(totalEarnings);
      setServices(serviceMap);
    } catch (error) {
      console.log("Worker dashboard error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.replace("/");
    } catch (error) {
      console.log("Worker logout error:", error);

      showAlert(
        "Logout failed",
        errorMessage(error, "Unable to log out. Please try again."),
      );
    }
  }

  function refreshDashboard() {
    setRefreshing(true);
    loadDashboard();
  }

  function formatDate(value: string) {
    if (!value) return "Date unavailable";

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
    if (!value) return "";

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

  function statusLabel(status: string) {
    return formatBookingStatus(status);
  }

  function openBooking(id: string) {
    router.push({
      pathname: "/booking-details",
      params: { id },
    });
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (loadError) {
    return <View style={styles.loadingContainer}>
      <Text style={styles.errorTitle}>Dashboard could not be loaded</Text>
      <Text style={styles.loadingText}>Check your connection and try again.</Text>
      <Pressable style={styles.refreshButton} onPress={refreshDashboard}><Text style={styles.refreshText}>Retry</Text></Pressable>
      <Pressable style={styles.logoutButton} onPress={handleLogout}><Text style={styles.logoutText}>Log out</Text></Pressable>
    </View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshDashboard}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>SewaGo</Text>

            <Text style={styles.greeting}>Hello, {name}</Text>

            <Text style={styles.subtitle}>Manage your service requests</Text>
          </View>

          <View style={styles.headerActions}>
            <Text style={styles.onlineText}>WORKER DASHBOARD</Text>

            <Pressable
              style={styles.logoutButton}
              onPress={() =>
                showAlert("Logout", "Are you sure you want to log out?", [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Logout",
                    style: "destructive",
                    onPress: handleLogout,
                  },
                ])
              }
            >
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{newRequests.length}</Text>

            <Text style={styles.statLabel}>New requests</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeJobs.length}</Text>

            <Text style={styles.statLabel}>Active jobs</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ₹{earnings.toLocaleString("en-IN")}
            </Text>

            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>New service requests</Text>

            <Text style={styles.sectionSubtitle}>Available jobs near you</Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={refreshDashboard}
            disabled={refreshing}
          >
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>

        {newRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>✓</Text>
            </View>

            <Text style={styles.emptyTitle}>No new requests</Text>

            <Text style={styles.emptyText}>
              New customer bookings will appear here when they are available.
            </Text>

            <Text style={styles.emptyHint}>
              Pull down to refresh for new requests.
            </Text>
          </View>
        ) : (
          <View>
            {newRequests.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                serviceName={services[booking.service_id] || "Service"}
                onPress={() => openBooking(booking.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeaderActive}>
          <View>
            <Text style={styles.sectionTitle}>Active jobs</Text>

            <Text style={styles.sectionSubtitle}>
              Your accepted and ongoing jobs
            </Text>
          </View>
        </View>

        {activeJobs.length === 0 ? (
          <View style={styles.smallEmptyCard}>
            <Text style={styles.smallEmptyTitle}>No active jobs</Text>

            <Text style={styles.smallEmptyText}>
              Accepted jobs will appear here.
            </Text>
          </View>
        ) : (
          <View>
            {activeJobs.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                serviceName={services[booking.service_id] || "Service"}
                onPress={() => openBooking(booking.id)}
              />
            ))}
          </View>
        )}

        <Pressable
          style={styles.earningsCard}
          onPress={() => router.push("/worker-earnings")}
        >
          <View style={styles.earningsHeader}>
            <View>
              <Text style={styles.earningsLabel}>TOTAL EARNINGS</Text>

              <Text style={styles.earningsValue}>
                ₹{earnings.toLocaleString("en-IN")}
              </Text>
            </View>

            <Text style={styles.earningsCheck}>₹</Text>
          </View>

          <Text style={styles.earningsText}>
            Based on your completed service bookings.
          </Text>

          <Text style={styles.earningsLink}>View earnings history →</Text>
        </Pressable>

        <Pressable style={styles.profileLink} onPress={() => router.push("/worker-profile")}>
          <Text style={styles.profileLinkText}>Worker profile</Text>
          <Text style={styles.profileLinkArrow}>›</Text>
        </Pressable>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

function BookingCard({
  booking,
  serviceName,
  onPress,
}: {
  booking: Booking;
  serviceName: string;
  onPress: () => void;
}) {
  const amount =
    booking.final_amount !== null
      ? booking.final_amount
      : booking.estimated_amount || 0;

  return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingTop}>
        <View style={styles.bookingIcon}>
          <Text style={styles.bookingIconText}>
            {serviceName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.bookingInfo}>
          <Text style={styles.bookingService}>{serviceName}</Text>

          <Text style={styles.bookingDate}>
            {formatCardDate(booking.scheduled_date)} ·{" "}
            {formatCardTime(booking.scheduled_start_time)}
          </Text>
        </View>

        <View style={styles.bookingStatus}>
          <Text style={styles.bookingStatusText}>
            {formatBookingStatus(booking.status)}
          </Text>
        </View>
      </View>

      <View style={styles.bookingBottom}>
        <Text style={styles.amountText}>
          ₹{Number(amount).toLocaleString("en-IN")}
        </Text>

        <Pressable style={styles.viewButton} onPress={onPress}>
          <Text style={styles.viewButtonText}>View request</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatCardDate(value: string) {
  if (!value) return "Date unavailable";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatCardTime(value: string) {
  if (!value) return "";

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },

  scrollContent: {
    width: "100%",
    maxWidth: 1000,
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
  errorTitle: { fontSize: 20, fontWeight: "700", color: "#111111" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 26,
  },

  logo: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111111",
    marginBottom: 12,
  },

  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 14,
    color: "#777777",
    marginTop: 6,
  },

  headerActions: {
    alignItems: "flex-end",
    gap: 9,
  },

  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#111111",
    marginRight: 7,
  },

  onlineText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333333",
  },

  logoutButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#333333",
  },

  statsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 32,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 16,
    padding: 17,
  },

  statValue: {
    fontSize: 21,
    fontWeight: "700",
    color: "#111111",
  },

  statLabel: {
    fontSize: 12,
    color: "#777777",
    marginTop: 7,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sectionHeaderActive: {
    marginTop: 30,
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
  },

  sectionSubtitle: {
    fontSize: 13,
    color: "#888888",
    marginTop: 4,
  },

  refreshButton: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  refreshText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333333",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 30,
    alignItems: "center",
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyIconText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  emptyText: {
    fontSize: 13,
    color: "#777777",
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 440,
  },

  emptyHint: {
    fontSize: 12,
    color: "#999999",
    textAlign: "center",
    marginTop: 10,
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

  bookingIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  bookingIconText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
  },

  bookingInfo: {
    flex: 1,
  },

  bookingService: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  bookingDate: {
    fontSize: 12,
    color: "#777777",
    marginTop: 5,
  },

  bookingStatus: {
    backgroundColor: "#F2F2F2",
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginLeft: 8,
  },

  bookingStatusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#444444",
  },

  bookingBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  amountText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  viewButton: {
    backgroundColor: "#111111",
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  viewButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  smallEmptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 22,
  },

  smallEmptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  smallEmptyText: {
    fontSize: 13,
    color: "#777777",
    marginTop: 5,
  },

  earningsCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: 18,
    padding: 20,
    marginTop: 30,
  },

  earningsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  earningsLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 1,
  },

  earningsValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111111",
    marginTop: 7,
  },

  earningsCheck: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F0F0",
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    paddingTop: 11,
  },

  earningsText: {
    fontSize: 12,
    color: "#888888",
    marginTop: 10,
  },

  earningsLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111111",
    marginTop: 12,
  },

  profileLink: {
    marginTop: 14,
    paddingHorizontal: 18,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  profileLinkText: { fontSize: 15, fontWeight: "600", color: "#111111" },
  profileLinkArrow: { fontSize: 24, color: "#666666" },

  bottomSpace: {
    height: 20,
  },
});
