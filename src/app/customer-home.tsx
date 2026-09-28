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
import { signOut } from "../services/auth.service";
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
  address_id: string;
  serviceName: string;
  address: string;
};

export default function CustomerHomeScreen() {
  const [name, setName] = useState("Customer");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadBookings();
    }, []),
  );

  // ============================================================
  // LOAD PROFILE
  // ============================================================

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/customer-login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.role === "worker") {
        router.replace("/worker-home");
        return;
      }

      if (!error && data?.full_name) {
        setName(data.full_name);
      }
    } catch (error) {
      console.log("Profile loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD BOOKINGS
  // ============================================================

  const loadBookings = async () => {
    try {
      setBookingsLoading(true);
      setBookingsError(false);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(
          `
          id,
          service_id,
          address_id,
          scheduled_date,
          scheduled_start_time,
          scheduled_end_time,
          status,
          estimated_amount,
          final_amount
        `,
        )
        .eq("customer_id", user.id)
        .order("scheduled_date", { ascending: true });

      if (bookingError) {
        console.log("Bookings loading error:", bookingError);
        setBookingsError(true);
        return;
      }

      if (!bookingData || bookingData.length === 0) {
        setBookings([]);
        return;
      }

      // ========================================================
      // GET SERVICE NAMES
      // ========================================================

      const serviceIds = [
        ...new Set(
          bookingData.map((booking) => booking.service_id).filter(Boolean),
        ),
      ];

      let services: { id: string; name: string }[] = [];

      if (serviceIds.length > 0) {
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("id, name")
          .in("id", serviceIds);

        if (serviceError) {
          console.log("Services loading error:", serviceError);
        } else {
          services = serviceData || [];
        }
      }

      // ========================================================
      // GET ADDRESSES
      // ========================================================

      const addressIds = [
        ...new Set(
          bookingData.map((booking) => booking.address_id).filter(Boolean),
        ),
      ];

      let addresses: { id: string; address_line: string; city: string | null }[] = [];

      if (addressIds.length > 0) {
        const { data: addressData, error: addressError } = await supabase
          .from("addresses")
          .select("id, address_line, city")
          .in("id", addressIds);

        if (addressError) {
          console.log("Addresses loading error:", addressError);
        } else {
          addresses = addressData || [];
        }
      }

      // ========================================================
      // COMBINE BOOKING DATA
      // ========================================================

      const formattedBookings: Booking[] = bookingData.map((booking) => {
        const service = services.find((item) => item.id === booking.service_id);

        const address = addresses.find(
          (item) => item.id === booking.address_id,
        );

        return {
          ...booking,
          serviceName: service?.name || "Service",
          address: address?.address_line
            ? `${address.address_line}${
                address.city ? `, ${address.city}` : ""
              }`
            : "Address not available",
        };
      });

      setBookings(formattedBookings);
    } catch (error) {
      console.log("Booking loading error:", error);
      setBookingsError(true);
    } finally {
      setBookingsLoading(false);
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      console.log("Logout error:", error);
    }
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "Date not available";
    }

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ============================================================
  // FORMAT TIME
  // ============================================================

  const formatTime = (timeString: string) => {
    if (!timeString) {
      return "Time not available";
    }

    const parts = timeString.split(":");

    if (parts.length < 2) {
      return timeString;
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

  // ============================================================
  // STATUS
  // ============================================================

  const getStatusText = (status: string) => {
    if (!status) {
      return "Pending";
    }

    return formatBookingStatus(status);
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading SewaGo...</Text>
      </View>
    );
  }

  // ============================================================
  // DASHBOARD
  // ============================================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.greeting}>Hello, {name}</Text>

            <Text style={styles.headerSubtitle}>
              What service do you need today?
            </Text>
          </View>

          <Pressable
            style={styles.profileButton}
            onPress={() => router.push("/customer-profile")}
          >
            <Text style={styles.profileButtonText}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        </View>

        {/* SEARCH */}

        <Pressable
          style={styles.searchBox}
          onPress={() => router.push("/services")}
        >
          <Text style={styles.searchIcon}>⌕</Text>

          <Text style={styles.searchText}>Search for a service</Text>
        </Pressable>

        {/* POPULAR SERVICES */}

        <Text style={styles.sectionTitle}>Popular services</Text>

        <View style={styles.servicesGrid}>
          <ServiceCard
            title="Cleaning"
            description="Home & office cleaning"
            icon="C"
            onPress={() => router.push("/services")}
          />

          <ServiceCard
            title="Plumbing"
            description="Repairs & installation"
            icon="P"
            onPress={() => router.push("/services")}
          />

          <ServiceCard
            title="Electrical"
            description="Electrical services"
            icon="E"
            onPress={() => router.push("/services")}
          />

          <ServiceCard
            title="Beauty"
            description="Beauty at home"
            icon="B"
            onPress={() => router.push("/services")}
          />

          <ServiceCard
            title="Appliance"
            description="Repair & maintenance"
            icon="A"
            onPress={() => router.push("/services")}
          />

          <ServiceCard
            title="More"
            description="View all services"
            icon="+"
            onPress={() => router.push("/services")}
          />
        </View>

        {/* BOOKINGS */}

        <View style={styles.bookingHeader}>
          <Text style={styles.sectionTitle}>Your bookings</Text>

          {bookings.length > 0 && (
            <Text style={styles.bookingCount}>
              {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
            </Text>
          )}
        </View>

        {bookingsLoading ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator />

            <Text style={styles.loadingBookingsText}>
              Loading your bookings...
            </Text>
          </View>
        ) : bookingsError ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Bookings could not be loaded</Text>
            <Text style={styles.emptyText}>Check your connection and try again.</Text>
            <Pressable style={styles.bookButton} onPress={loadBookings}><Text style={styles.bookButtonText}>Retry</Text></Pressable>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No bookings yet</Text>

            <Text style={styles.emptyText}>
              Book a service and your upcoming bookings will appear here.
            </Text>

            <Pressable
              style={styles.bookButton}
              onPress={() => router.push("/services")}
            >
              <Text style={styles.bookButtonText}>Book a service</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.bookingsContainer}>
            {bookings.map((booking) => (
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

        {/* LOGOUT */}

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ============================================================
// SERVICE CARD
// ============================================================

function ServiceCard({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.serviceCard,
        pressed && styles.serviceCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.serviceIcon}>
        <Text style={styles.serviceIconText}>{icon}</Text>
      </View>

      <Text style={styles.serviceTitle}>{title}</Text>

      <Text style={styles.serviceDescription}>{description}</Text>
    </Pressable>
  );
}

// ============================================================
// BOOKING CARD
// ============================================================

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

  const openBookingDetails = () => {
    router.push({
      pathname: "/booking-details",
      params: {
        id: booking.id,
      },
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.bookingCard,
        pressed && styles.bookingCardPressed,
      ]}
      onPress={openBookingDetails}
    >
      {/* TOP */}

      <View style={styles.bookingTop}>
        <View style={styles.bookingServiceRow}>
          <View style={styles.bookingIcon}>
            <Text style={styles.bookingIconText}>
              {booking.serviceName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.bookingServiceInfo}>
            <Text style={styles.bookingServiceName}>{booking.serviceName}</Text>

            <Text style={styles.bookingSubtitle}>
              Professional service through SewaGo
            </Text>
          </View>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{getStatusText(booking.status)}</Text>
        </View>
      </View>

      <View style={styles.bookingSeparator} />

      {/* DATE */}

      <View style={styles.bookingDetailRow}>
        <Text style={styles.bookingDetailLabel}>Date</Text>

        <Text style={styles.bookingDetailValue}>
          {formatDate(booking.scheduled_date)}
        </Text>
      </View>

      {/* TIME */}

      <View style={styles.bookingDetailRow}>
        <Text style={styles.bookingDetailLabel}>Time</Text>

        <Text style={styles.bookingDetailValue}>
          {formatTime(booking.scheduled_start_time)}
        </Text>
      </View>

      {/* ADDRESS */}

      <View style={styles.bookingDetailRow}>
        <Text style={styles.bookingDetailLabel}>Address</Text>

        <Text style={styles.bookingAddressValue}>{booking.address}</Text>
      </View>

      <View style={styles.bookingSeparator} />

      {/* PRICE */}

      <View style={styles.bookingPriceRow}>
        <Text style={styles.bookingPriceLabel}>Estimated amount</Text>

        <Text style={styles.bookingPrice}>
          ₹{Number(amount).toLocaleString("en-IN")}
        </Text>
      </View>

      {/* TAP HINT */}

      <View style={styles.viewDetailsRow}>
        <Text style={styles.viewDetailsText}>Tap to view booking details</Text>

        <Text style={styles.viewDetailsArrow}>›</Text>
      </View>
    </Pressable>
  );
}

// ============================================================
// STYLES
// ============================================================

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

  loadingText: {
    marginTop: 12,
    color: "#666666",
    fontSize: 15,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  headerTextContainer: {
    flex: 1,
    paddingRight: 20,
  },

  greeting: {
    fontSize: 27,
    fontWeight: "700",
    color: "#111111",
  },

  headerSubtitle: {
    fontSize: 15,
    color: "#666666",
    marginTop: 5,
  },

  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  profileButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  searchBox: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 17,
    marginBottom: 30,
  },

  searchIcon: {
    fontSize: 25,
    color: "#777777",
    marginRight: 10,
  },

  searchText: {
    fontSize: 15,
    color: "#999999",
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 15,
  },

  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },

  serviceCard: {
    width: "31.5%",
    minWidth: 150,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },

  serviceCardPressed: {
    opacity: 0.7,
  },

  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  serviceIconText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  serviceTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  serviceDescription: {
    fontSize: 12,
    color: "#777777",
    marginTop: 5,
    lineHeight: 17,
  },

  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  bookingCount: {
    fontSize: 13,
    color: "#777777",
    marginBottom: 15,
  },

  bookingsContainer: {
    gap: 14,
    marginBottom: 25,
  },

  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8E8E8",
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

  bookingServiceRow: {
    flexDirection: "row",
    flex: 1,
    paddingRight: 10,
  },

  bookingIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  bookingIconText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
  },

  bookingServiceInfo: {
    flex: 1,
  },

  bookingServiceName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  bookingSubtitle: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333333",
  },

  bookingSeparator: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 17,
  },

  bookingDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 11,
  },

  bookingDetailLabel: {
    fontSize: 13,
    color: "#888888",
  },

  bookingDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    textAlign: "right",
    maxWidth: "65%",
  },

  bookingAddressValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    textAlign: "right",
    maxWidth: "65%",
    lineHeight: 19,
  },

  bookingPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  bookingPriceLabel: {
    fontSize: 13,
    color: "#777777",
  },

  bookingPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  viewDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 17,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  viewDetailsText: {
    fontSize: 12,
    color: "#777777",
    fontWeight: "600",
  },

  viewDetailsArrow: {
    fontSize: 22,
    color: "#777777",
    lineHeight: 20,
  },

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    marginBottom: 25,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  emptyText: {
    fontSize: 14,
    color: "#777777",
    lineHeight: 21,
    marginTop: 7,
    textAlign: "center",
  },

  loadingBookingsText: {
    marginTop: 12,
    fontSize: 14,
    color: "#777777",
  },

  bookButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#111111",
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },

  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  logoutButton: {
    height: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "600",
  },
});
