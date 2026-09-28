import { showAlert } from "../utils/alert";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function BookingReviewScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    price: string;
    date: string;
    time: string;
    address: string;
  }>();

  const [confirming, setConfirming] = useState(false);

  const serviceId = params.id || "";
  const serviceName = params.name || "Service";
  const price = Number(params.price || 0);
  const date = params.date || "";
  const time = params.time || "";
  const address = params.address || "";

  const confirmBooking = async () => {
    if (confirming) return;

    if (!serviceId) {
      showAlert("Error", "Service information is missing.");
      return;
    }

    if (!date) {
      showAlert("Error", "Please select a date.");
      return;
    }

    if (!time) {
      showAlert("Error", "Please select a time.");
      return;
    }

    if (!address.trim()) {
      showAlert("Error", "Please provide your service address.");
      return;
    }
    const parsedDate = new Date(`${date}T00:00:00`);
    const normalizedDate = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}-${String(parsedDate.getDate()).padStart(2, "0")}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsedDate.getTime()) || normalizedDate !== date || parsedDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      showAlert("Invalid date", "Choose today or a future date.");
      return;
    }
    if (!["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM"].includes(time.trim())) {
      showAlert("Invalid time", "Choose one of the available time slots.");
      return;
    }

    try {
      setConfirming(true);

      // ---------------------------------------------------------
      // 1. Get the currently logged-in customer
      // ---------------------------------------------------------

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        showAlert(
          "Login required",
          "Please log in before confirming your booking.",
        );

        router.replace("/customer-login");
        return;
      }

      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("id, name, starting_price, estimated_duration_minutes")
        .eq("id", serviceId)
        .eq("is_active", true)
        .maybeSingle();
      if (serviceError) throw serviceError;
      if (!service) throw new Error("This service is no longer available. Please choose another service.");

      // ---------------------------------------------------------
      // 2. Create an address for this booking
      // ---------------------------------------------------------

      const { data: addressData, error: addressError } = await supabase
        .from("addresses")
        .insert({
          customer_id: user.id,
          label: "Service Address",
          address_line: address.trim(),
          city: "",
          is_default: false,
        })
        .select("id")
        .single();

      if (addressError) {
        console.log("Address creation error:", addressError);
        throw addressError;
      }

      if (!addressData?.id) {
        throw new Error("Could not create the service address.");
      }

      // ---------------------------------------------------------
      // 3. Convert the selected time into a database time value
      // ---------------------------------------------------------

      const convertTimeTo24Hour = (value: string) => {
        const cleaned = value.trim();

        const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

        if (!match) {
          return cleaned;
        }

        let hour = Number(match[1]);
        const minute = match[2];
        const period = match[3].toUpperCase();

        if (period === "AM" && hour === 12) {
          hour = 0;
        }

        if (period === "PM" && hour !== 12) {
          hour += 12;
        }

        return `${String(hour).padStart(2, "0")}:${minute}:00`;
      };

      const startTime = convertTimeTo24Hour(time);

      // ---------------------------------------------------------
      // 4. Calculate a simple 1-hour end time
      // ---------------------------------------------------------

      const duration = Math.max(1, service.estimated_duration_minutes ?? 60);
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const endMinutes = (startHour * 60 + startMinute + duration) % (24 * 60);
      const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}:00`;

      // ---------------------------------------------------------
      // 5. Create the booking
      // ---------------------------------------------------------

      const bookingData = {
        customer_id: user.id,
        service_id: serviceId,
        address_id: addressData.id,
        problem_description: "",
        scheduled_date: date,
        scheduled_start_time: startTime,
        scheduled_end_time: endTime,
        status: "pending",
        estimated_amount: Number(service.starting_price ?? price),
        final_amount: null,
        cancellation_reason: null,
      };

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert(bookingData)
        .select("id")
        .single();

      if (bookingError) {
        console.log("Booking creation error:", bookingError);

        // The address was already created, but booking failed.
        // Try to remove the unused address.
        await supabase.from("addresses").delete().eq("id", addressData.id);

        throw bookingError;
      }

      if (!booking?.id) {
        throw new Error("Booking was not created.");
      }

      // ---------------------------------------------------------
      // 6. Success
      // ---------------------------------------------------------

      router.replace({
        pathname: "/booking-details",
        params: { id: booking.id },
      });
    } catch (error) {
      console.log("Confirm booking error:", error);

      showAlert(
        "Booking failed",
        error instanceof Error ? error.message : "Something went wrong while creating your booking.",
      );
    } finally {
      setConfirming(false);
    }
  };

  if (!serviceId || !params.name || !date || !time || !address.trim() || !Number.isFinite(price) || price < 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Booking details are incomplete. Please return to the service and try again.</Text>
        <Pressable onPress={() => router.replace("/services")}><Text>Browse services</Text></Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.replace({ pathname: "/booking", params: { id: serviceId, name: serviceName, price: String(price) } })}
            disabled={confirming}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>Review booking</Text>

            <Text style={styles.subtitle}>
              Check your details before confirming
            </Text>
          </View>
        </View>

        {/* SERVICE */}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SERVICE</Text>

          <View style={styles.serviceRow}>
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceIconText}>
                {serviceName.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>{serviceName}</Text>

              <Text style={styles.serviceDescription}>
                Professional service through SewaGo
              </Text>
            </View>
          </View>
        </View>

        {/* DATE & TIME */}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>DATE & TIME</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>

            <Text style={styles.detailValue}>{date || "Not selected"}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time</Text>

            <Text style={styles.detailValue}>{time || "Not selected"}</Text>
          </View>
        </View>

        {/* ADDRESS */}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SERVICE ADDRESS</Text>

          <Text style={styles.address}>{address || "No address provided"}</Text>
        </View>

        {/* PRICE */}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>PRICE DETAILS</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Starting price</Text>

            <Text style={styles.price}>₹{price.toLocaleString("en-IN")}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated total</Text>

            <Text style={styles.totalPrice}>
              ₹{price.toLocaleString("en-IN")}
            </Text>
          </View>

          <Text style={styles.priceNote}>
            Final price may vary depending on the work required.
          </Text>
        </View>

        {/* CONFIRM */}

        <Pressable
          style={({ pressed }) => [
            styles.confirmButton,
            pressed && styles.buttonPressed,
            confirming && styles.confirmButtonDisabled,
          ]}
          onPress={confirmBooking}
          disabled={confirming}
        >
          {confirming ? (
            <View style={styles.confirmingContent}>
              <ActivityIndicator color="#FFFFFF" />

              <Text style={styles.confirmButtonText}>Confirming...</Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>Confirm booking</Text>
          )}
        </Pressable>

        <Text style={styles.bottomText}>
          You will be able to see this booking in your dashboard after
          confirmation.
        </Text>
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666666",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  backIcon: {
    fontSize: 31,
    color: "#111111",
    marginTop: -3,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 14,
    color: "#777777",
    marginTop: 4,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    padding: 22,
    marginBottom: 16,
  },

  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 1,
    marginBottom: 16,
  },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },

  serviceIconText: {
    fontSize: 23,
    fontWeight: "700",
    color: "#111111",
  },

  serviceInfo: {
    flex: 1,
  },

  serviceName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  serviceDescription: {
    fontSize: 13,
    color: "#777777",
    marginTop: 5,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 30,
  },

  detailLabel: {
    fontSize: 14,
    color: "#777777",
  },

  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    maxWidth: "60%",
    textAlign: "right",
  },

  separator: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },

  address: {
    fontSize: 15,
    color: "#333333",
    lineHeight: 23,
  },

  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  totalLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  totalPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111111",
  },

  priceNote: {
    fontSize: 12,
    color: "#888888",
    lineHeight: 18,
    marginTop: 12,
  },

  confirmButton: {
    height: 56,
    backgroundColor: "#111111",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
  },

  confirmButtonDisabled: {
    opacity: 0.7,
  },

  buttonPressed: {
    opacity: 0.7,
  },

  confirmingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  bottomText: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 15,
  },
});
