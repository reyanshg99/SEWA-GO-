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
import { formatBookingStatus } from "../utils/display";

type Booking = {
  id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  status: string;
  estimated_amount: number | null;
  final_amount: number | null;
  serviceName: string;
};

const STATUS_STEPS = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "on_the_way", label: "On the way" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
];

const STATUS_ORDER: Record<string, number> = {
  pending: 0,
  accepted: 1,
  on_the_way: 2,
  arrived: 3,
  in_progress: 4,
  completed: 5,
};

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [loadError, setLoadError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, []),
  );

  const loadBookings = async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/customer-login");
        return;
      }

      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select(
          `
          id,
          service_id,
          scheduled_date,
          scheduled_start_time,
          scheduled_end_time,
          status,
          estimated_amount,
          final_amount
        `,
        )
        .eq("customer_id", user.id)
        .order("scheduled_date", {
          ascending: false,
        })
        .order("scheduled_start_time", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      if (!bookingData || bookingData.length === 0) {
        setBookings([]);
        return;
      }

      const serviceIds = [
        ...new Set(
          bookingData.map((booking) => booking.service_id).filter(Boolean),
        ),
      ];

      let services: {
        id: string;
        name: string;
      }[] = [];

      if (serviceIds.length > 0) {
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("id, name")
          .in("id", serviceIds);

        if (serviceError) {
          console.log("Service loading error:", serviceError);
        } else {
          services = serviceData || [];
        }
      }

      const formattedBookings: Booking[] = bookingData.map((booking) => {
        const service = services.find((item) => item.id === booking.service_id);

        return {
          ...booking,
          serviceName: service?.name || "Service",
        };
      });

      setBookings(formattedBookings);
    } catch (error) {
      console.log("My bookings loading error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (value: string) => {
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
  };

  const formatTime = (value: string) => {
    if (!value) {
      return "Time unavailable";
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
  };

  const getStatusText = (status: string) => {
    return formatBookingStatus(status);
  };

  const getFilteredBookings = () => {
    if (filter === "All") {
      return bookings;
    }

    if (filter === "Upcoming") {
      return bookings.filter((booking) =>
        [
          "pending",
          "accepted",
          "on_the_way",
          "arrived",
          "in_progress",
        ].includes(booking.status),
      );
    }

    if (filter === "Completed") {
      return bookings.filter((booking) => booking.status === "completed");
    }

    if (filter === "Cancelled") {
      return bookings.filter((booking) => booking.status === "cancelled");
    }

    return bookings;
  };

  const filteredBookings = getFilteredBookings();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading your bookings...</Text>
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
          <Pressable style={styles.backButton} onPress={() => router.replace("/customer-home")}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.title}>My bookings</Text>

            <Text style={styles.subtitle}>Manage your SewaGo bookings</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {["All", "Upcoming", "Completed", "Cancelled"].map((item) => (
            <Pressable
              key={item}
              style={[
                styles.filterButton,
                filter === item && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === item && styles.filterTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {filteredBookings.length}{" "}
            {filteredBookings.length === 1 ? "booking" : "bookings"}
          </Text>
        </View>

        {loadError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Bookings could not be loaded</Text>
            <Text style={styles.emptyText}>Check your connection and try again.</Text>
            <Pressable style={styles.bookButton} onPress={loadBookings}><Text style={styles.bookButtonText}>Retry</Text></Pressable>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>B</Text>
            </View>

            <Text style={styles.emptyTitle}>No bookings found</Text>

            <Text style={styles.emptyText}>
              {filter === "All"
                ? "Your bookings will appear here after you book a service."
                : `You don't have any ${filter.toLowerCase()} bookings.`}
            </Text>

            <Pressable
              style={styles.bookButton}
              onPress={() => router.push("/services")}
            >
              <Text style={styles.bookButtonText}>Book a service</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.bookingList}>
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                formatDate={formatDate}
                formatTime={formatTime}
                getStatusText={getStatusText}
              />
            ))}
          </View>
        )}

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/customer-home")}
        >
          <Text style={styles.dashboardButtonText}>Back to dashboard</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function BookingCard({
  booking,
  formatDate,
  formatTime,
  getStatusText,
}: {
  booking: Booking;
  formatDate: (value: string) => string;
  formatTime: (value: string) => string;
  getStatusText: (value: string) => string;
}) {
  const amount =
    booking.final_amount !== null && booking.final_amount !== undefined
      ? booking.final_amount
      : booking.estimated_amount || 0;

  const currentStep = STATUS_ORDER[booking.status] ?? 0;
  const isCancelled = ["cancelled", "disputed", "expired"].includes(booking.status);
  const isCompleted = booking.status === "completed";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bookingCard,
        pressed && styles.bookingCardPressed,
      ]}
      onPress={() =>
        router.push({
          pathname: "/booking-details",
          params: {
            id: booking.id,
          },
        })
      }
    >
      <View style={styles.bookingTop}>
        <View style={styles.serviceRow}>
          <View style={styles.serviceIcon}>
            <Text style={styles.serviceIconText}>
              {booking.serviceName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{booking.serviceName}</Text>

            <Text style={styles.bookingId}>
              #{booking.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            isCompleted && styles.statusBadgeCompleted,
            isCancelled && styles.statusBadgeCancelled,
          ]}
        >
          <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
        </View>
      </View>

      {!isCancelled ? (
        <View style={styles.progressContainer}>
          <Text style={styles.progressTitle}>Booking status</Text>

          <View style={styles.progressTrack}>
            {STATUS_STEPS.map((step, index) => {
              const active = index <= currentStep;

              return (
                <View key={step.key} style={styles.progressStep}>
                  <View
                    style={[
                      styles.progressDot,
                      active && styles.progressDotActive,
                    ]}
                  >
                    {active ? (
                      <Text style={styles.progressCheck}>✓</Text>
                    ) : null}
                  </View>

                  {index < STATUS_STEPS.length - 1 ? (
                    <View
                      style={[
                        styles.progressLine,
                        index < currentStep && styles.progressLineActive,
                      ]}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={styles.progressLabels}>
            {STATUS_STEPS.map((step, index) => (
              <Text
                key={step.key}
                style={[
                  styles.progressLabel,
                  index <= currentStep && styles.progressLabelActive,
                ]}
              >
                {step.label}
              </Text>
            ))}
          </View>

          <View style={styles.currentStatusCard}>
            <Text style={styles.currentStatusLabel}>CURRENT STATUS</Text>

            <Text style={styles.currentStatusText}>
              {getStatusText(booking.status)}
            </Text>

            <Text style={styles.currentStatusHint}>
              {isCompleted
                ? "Your service has been completed."
                : "Your booking status updates as the professional progresses."}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.cancelledCard}>
          <Text style={styles.cancelledTitle}>
              {booking.status === "disputed"
                ? "Booking disputed"
                : booking.status === "expired"
                  ? "Booking expired"
                  : "Booking cancelled"}
          </Text>

          <Text style={styles.cancelledText}>
            This booking is no longer active.
          </Text>
        </View>
      )}

      <View style={styles.separator} />

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Date</Text>

        <Text style={styles.detailValue}>
          {formatDate(booking.scheduled_date)}
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>Time</Text>

        <Text style={styles.detailValue}>
          {formatTime(booking.scheduled_start_time)}
        </Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>Amount</Text>

        <Text style={styles.price}>
          ₹{Number(amount).toLocaleString("en-IN")}
        </Text>
      </View>

      {isCompleted && (
        <Pressable
          style={styles.reviewButton}
          onPress={(event) => {
            event.stopPropagation();

            router.push({
              pathname: "/booking-review",
              params: {
                id: booking.id,
              },
            });
          }}
        >
          <Text style={styles.reviewButtonText}>Rate professional</Text>
        </Pressable>
      )}

      <View style={styles.viewRow}>
        <Text style={styles.viewText}>View booking details</Text>

        <Text style={styles.arrow}>›</Text>
      </View>
    </Pressable>
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  backIcon: {
    fontSize: 30,
    color: "#111111",
    marginTop: -3,
  },

  headerInfo: {
    flex: 1,
  },

  title: {
    fontSize: 27,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 14,
    color: "#777777",
    marginTop: 4,
  },

  filters: {
    gap: 9,
    paddingBottom: 5,
  },

  filterButton: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E1E1E1",
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666666",
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  countRow: {
    marginTop: 22,
    marginBottom: 12,
  },

  countText: {
    fontSize: 14,
    color: "#777777",
  },

  bookingList: {
    gap: 14,
  },

  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },

  bookingCardPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },

  bookingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  serviceRow: {
    flexDirection: "row",
    flex: 1,
    paddingRight: 10,
  },

  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  serviceIconText: {
    fontSize: 19,
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

  bookingId: {
    fontSize: 11,
    color: "#999999",
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusBadgeCompleted: {
    backgroundColor: "#E8E8E8",
  },

  statusBadgeCancelled: {
    backgroundColor: "#F1F1F1",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333333",
  },

  progressContainer: {
    marginTop: 20,
    padding: 16,
    borderRadius: 15,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  progressTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555555",
    marginBottom: 16,
  },

  progressTrack: {
    flexDirection: "row",
    alignItems: "center",
  },

  progressStep: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  progressDot: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#E4E4E4",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  progressDotActive: {
    backgroundColor: "#111111",
  },

  progressCheck: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E4E4E4",
  },

  progressLineActive: {
    backgroundColor: "#111111",
  },

  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 9,
  },

  progressLabel: {
    width: "16.66%",
    fontSize: 8,
    color: "#999999",
    textAlign: "center",
  },

  progressLabelActive: {
    color: "#111111",
    fontWeight: "700",
  },

  currentStatusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  currentStatusLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#999999",
    letterSpacing: 0.8,
  },

  currentStatusText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
    marginTop: 4,
  },

  currentStatusHint: {
    fontSize: 11,
    color: "#777777",
    marginTop: 4,
    lineHeight: 16,
  },

  cancelledCard: {
    marginTop: 18,
    padding: 14,
    borderRadius: 13,
    backgroundColor: "#F5F5F5",
  },

  cancelledTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333333",
  },

  cancelledText: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
  },

  separator: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 16,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  detailLabel: {
    fontSize: 13,
    color: "#888888",
  },

  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    textAlign: "right",
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  priceLabel: {
    fontSize: 13,
    color: "#777777",
  },

  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  reviewButton: {
    height: 48,
    borderRadius: 13,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },

  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  viewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  viewText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#777777",
  },

  arrow: {
    fontSize: 22,
    color: "#777777",
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    padding: 28,
    alignItems: "center",
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },

  emptyIconText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111111",
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
  },

  emptyText: {
    fontSize: 14,
    color: "#777777",
    lineHeight: 21,
    textAlign: "center",
    marginTop: 7,
  },

  bookButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#111111",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  dashboardButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },

  dashboardButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
