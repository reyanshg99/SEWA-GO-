import { showAlert } from "../utils/alert";
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
import { errorMessage, formatBookingStatus } from "../utils/display";

type Booking = {
  id: string;
  customer_id: string;
  worker_id: string | null;
  service_id: string;
  address_id: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string | null;
  status: string;
  estimated_amount: number | null;
  final_amount: number | null;
  cancellation_reason: string | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
};

type Address = {
  id: string;
  label: string | null;
  address_line: string;
  city: string | null;
};

export default function BookingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [address, setAddress] = useState<Address | null>(null);

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [startingTrip, setStartingTrip] = useState(false);
  const [startingService, setStartingService] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isWorker, setIsWorker] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [counterpartyName, setCounterpartyName] = useState("");
  const [counterpartyPhone, setCounterpartyPhone] = useState("");

  useEffect(() => {
    if (id) loadBooking();
    else { setLoading(false); setLoadError(true); }
  }, [id]);

  async function loadBooking() {
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const workerUser = profile?.role === "worker";
      if (profile?.role !== "worker" && profile?.role !== "customer") {
        router.replace("/");
        return;
      }
      setIsWorker(workerUser);

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(
          `
            id,
            customer_id,
            worker_id,
            service_id,
            address_id,
            scheduled_date,
            scheduled_start_time,
            scheduled_end_time,
            status,
            estimated_amount,
            final_amount,
            cancellation_reason
          `,
        )
        .eq("id", id)
        .maybeSingle();

      if (bookingError) {
        throw bookingError;
      }

      if (!bookingData) {
        setBooking(null);
        return;
      }

      setBooking(bookingData);

      const personId = workerUser ? bookingData.customer_id : bookingData.worker_id;
      if (personId) {
        const { data: person } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", personId)
          .maybeSingle();
        setCounterpartyName(person?.full_name ?? "");
        setCounterpartyPhone(person?.phone ?? "");
      }

      const { data: serviceData } = await supabase
        .from("services")
        .select("id, name, description")
        .eq("id", bookingData.service_id)
        .maybeSingle();

      const { data: addressData } = await supabase
        .from("addresses")
        .select("id, label, address_line, city")
        .eq("id", bookingData.address_id)
        .maybeSingle();

      setService(serviceData);
      setAddress(addressData);
    } catch (error) {
      console.log("Booking details error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function acceptBooking() {
    if (!booking || accepting) {
      return;
    }

    try {
      setAccepting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showAlert("Login required", "Please log in again.");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({
          worker_id: user.id,
          status: "accepted",
        })
        .eq("id", booking.id)
        .eq("status", "pending")
        .is("worker_id", null)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) throw new Error("This request is no longer available.");

      setBooking({
        ...booking,
        worker_id: user.id,
        status: "accepted",
      });

      showAlert(
        "Booking accepted",
        "This service request is now assigned to you.",
      );
    } catch (error) {
      console.log("Accept booking error:", error);

      showAlert(
        "Unable to accept booking",
        errorMessage(error, "Something went wrong while accepting this booking."),
      );
    } finally {
      setAccepting(false);
    }
  }

  async function startTrip() {
    if (!booking || startingTrip) {
      return;
    }

    try {
      setStartingTrip(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showAlert("Login required", "Please log in again.");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "on_the_way",
        })
        .eq("id", booking.id)
        .eq("worker_id", user.id)
        .eq("status", "accepted")
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) throw new Error("This booking has changed. Refresh and try again.");

      setBooking({
        ...booking,
        status: "on_the_way",
      });

      showAlert("Status updated", "Your status is now On the Way.");
    } catch (error) {
      console.log("Start trip error:", error);

      showAlert(
        "Unable to start trip",
        errorMessage(error, "Something went wrong while starting the trip."),
      );
    } finally {
      setStartingTrip(false);
    }
  }

  async function startService() {
    if (!booking || startingService) {
      return;
    }

    try {
      setStartingService(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showAlert("Login required", "Please log in again.");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "in_progress",
        })
        .eq("id", booking.id)
        .eq("worker_id", user.id)
        .eq("status", "arrived")
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) throw new Error("This booking has changed. Refresh and try again.");

      setBooking({
        ...booking,
        status: "in_progress",
      });

      showAlert("Service started", "The job is now marked as in progress.");
    } catch (error) {
      console.log("Start service error:", error);

      showAlert(
        "Unable to start service",
        errorMessage(error, "Something went wrong while starting the service."),
      );
    } finally {
      setStartingService(false);
    }
  }

  async function cancelBooking() {
    if (!booking || cancelling) {
      return;
    }

    try {
      setCancelling(true);

      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          cancellation_reason: "Cancelled by customer",
        })
        .eq("id", booking.id)
        .eq("customer_id", booking.customer_id)
        .eq("status", booking.status)
        .select("id")
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (!data) throw new Error("This booking can no longer be cancelled.");

      setBooking({
        ...booking,
        status: "cancelled",
        cancellation_reason: "Cancelled by customer",
      });

      showAlert("Booking cancelled", "Your booking has been cancelled.");
    } catch (error) {
      console.log("Cancel booking error:", error);

      showAlert(
        "Unable to cancel",
        errorMessage(error, "Something went wrong while cancelling the booking."),
      );
    } finally {
      setCancelling(false);
    }
  }

  function confirmCancelBooking() {
    showAlert(
      "Cancel booking",
      "Are you sure you want to cancel this booking?",
      [
        {
          text: "Keep booking",
          style: "cancel",
        },
        {
          text: "Cancel booking",
          style: "destructive",
          onPress: cancelBooking,
        },
      ],
    );
  }

  function formatDate(value: string) {
    if (!value) {
      return "Not available";
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function formatTime(value: string) {
    if (!value) {
      return "Not available";
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

  function formatStatus(value: string) {
    return formatBookingStatus(value);
  }

  async function transitionWorkerBooking(nextStatus: "arrived" | "completed") {
    if (!booking || updatingStatus) return;
    try {
      setUpdatingStatus(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please log in again.");
      const { data, error } = await supabase.from("bookings")
        .update({ status: nextStatus })
        .eq("id", booking.id)
        .eq("worker_id", user.id)
        .eq("status", booking.status)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This booking has changed. Refresh and try again.");
      setBooking({ ...booking, status: nextStatus });
    } catch (error) {
      console.log("Booking status update error:", error);
      showAlert("Unable to update booking", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading booking...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>{loadError ? "Booking could not be loaded" : "Booking not found"}</Text>

        <Text style={styles.errorText}>
          This booking may no longer exist or you may not have access to it.
        </Text>

        {loadError ? <Pressable style={styles.backButtonLarge} onPress={loadBooking}><Text style={styles.backButtonLargeText}>Retry</Text></Pressable> : null}
        <Pressable style={styles.backButtonLarge} onPress={() => router.replace(isWorker ? "/worker-home" : "/my-bookings")}>
          <Text style={styles.backButtonLargeText}>Back to bookings</Text>
        </Pressable>
      </View>
    );
  }

  const amount =
    booking.final_amount !== null
      ? booking.final_amount
      : booking.estimated_amount || 0;

  const canAccept =
    isWorker && booking.status === "pending" && booking.worker_id === null;

  const canStartTrip =
    isWorker && booking.status === "accepted" && booking.worker_id !== null;

  const canStartService =
    isWorker && booking.status === "arrived" && booking.worker_id !== null;
  const canMarkArrived = isWorker && booking.status === "on_the_way" && booking.worker_id !== null;
  const canComplete = isWorker && booking.status === "in_progress" && booking.worker_id !== null;

  const canCancel =
    !isWorker &&
    (booking.status === "pending" || booking.status === "accepted");

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace(isWorker ? "/worker-home" : "/my-bookings")}>
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.title}>Booking details</Text>

            <Text style={styles.subtitle}>
              #{booking.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {formatStatus(booking.status)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SERVICE</Text>

          <View style={styles.serviceRow}>
            <View style={styles.serviceIcon}>
              <Text style={styles.serviceIconText}>
                {(service?.name || "S").charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName}>
                {service?.name || "Service"}
              </Text>

              <Text style={styles.serviceDescription}>
                {service?.description || "Professional service through SewaGo"}
              </Text>
            </View>
          </View>
        </View>

        {counterpartyName ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{isWorker ? "CUSTOMER" : "PROFESSIONAL"}</Text>
            <Text style={styles.serviceName}>{counterpartyName}</Text>
            {counterpartyPhone ? <Text style={styles.addressText}>{counterpartyPhone}</Text> : null}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>DATE & TIME</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>

            <Text style={styles.detailValue}>
              {formatDate(booking.scheduled_date)}
            </Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start time</Text>

            <Text style={styles.detailValue}>
              {formatTime(booking.scheduled_start_time)}
            </Text>
          </View>

          {booking.scheduled_end_time ? (
            <>
              <View style={styles.separator} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>End time</Text>

                <Text style={styles.detailValue}>
                  {formatTime(booking.scheduled_end_time)}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>SERVICE ADDRESS</Text>

          <Text style={styles.addressLabel}>
            {address?.label || "Service Address"}
          </Text>

          <Text style={styles.addressText}>
            {address?.address_line || "Address not available"}
          </Text>

          {address?.city ? (
            <Text style={styles.cityText}>{address.city}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>PRICE</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Estimated amount</Text>

            <Text style={styles.priceValue}>
              ₹{Number(booking.estimated_amount ?? 0).toLocaleString("en-IN")}
            </Text>
          </View>

          {booking.final_amount !== null ? (
            <>
              <View style={styles.separator} />

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Final amount</Text>

                <Text style={styles.finalPriceValue}>
                  ₹{Number(booking.final_amount).toLocaleString("en-IN")}
                </Text>
              </View>
            </>
          ) : null}

          <Text style={styles.priceNote}>
            Final price may vary depending on the work required.
          </Text>
        </View>

        {canAccept ? (
          <Pressable
            style={[styles.primaryButton, accepting && styles.buttonDisabled]}
            onPress={acceptBooking}
            disabled={accepting}
          >
            {accepting ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingButtonText}>Accepting...</Text>
              </>
            ) : (
              <Text style={styles.primaryButtonText}>Accept booking</Text>
            )}
          </Pressable>
        ) : null}

        {canStartTrip ? (
          <Pressable
            style={[
              styles.primaryButton,
              startingTrip && styles.buttonDisabled,
            ]}
            onPress={startTrip}
            disabled={startingTrip}
          >
            {startingTrip ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingButtonText}>Starting trip...</Text>
              </>
            ) : (
              <Text style={styles.primaryButtonText}>Start trip</Text>
            )}
          </Pressable>
        ) : null}

        {canStartService ? (
          <Pressable
            style={[
              styles.primaryButton,
              startingService && styles.buttonDisabled,
            ]}
            onPress={startService}
            disabled={startingService}
          >
            {startingService ? (
              <>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.loadingButtonText}>
                  Starting service...
                </Text>
              </>
            ) : (
              <Text style={styles.primaryButtonText}>Start service</Text>
            )}
          </Pressable>
        ) : null}

        {canMarkArrived ? (
          <Pressable style={[styles.primaryButton, updatingStatus && styles.buttonDisabled]} onPress={() => transitionWorkerBooking("arrived")} disabled={updatingStatus}>
            {updatingStatus ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Mark arrived</Text>}
          </Pressable>
        ) : null}

        {canComplete ? (
          <Pressable style={[styles.primaryButton, updatingStatus && styles.buttonDisabled]} onPress={() => transitionWorkerBooking("completed")} disabled={updatingStatus}>
            {updatingStatus ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Complete job</Text>}
          </Pressable>
        ) : null}

        {booking.status === "arrived" && isWorker ? (
          <View style={styles.acceptedCard}><Text style={styles.acceptedTitle}>You have arrived</Text><Text style={styles.acceptedText}>Start the service when you are ready.</Text></View>
        ) : null}

        {booking.status === "completed" && isWorker ? (
          <View style={styles.acceptedCard}><Text style={styles.acceptedTitle}>Job completed</Text><Text style={styles.acceptedText}>This booking is complete.</Text></View>
        ) : null}

        {booking.status === "accepted" && isWorker ? (
          <View style={styles.acceptedCard}>
            <Text style={styles.acceptedTitle}>Booking accepted</Text>

            <Text style={styles.acceptedText}>
              This service request is assigned to you.
            </Text>
          </View>
        ) : null}

        {booking.status === "on_the_way" && isWorker ? (
          <View style={styles.acceptedCard}>
            <Text style={styles.acceptedTitle}>You are on the way</Text>

            <Text style={styles.acceptedText}>
              The customer has been notified that you are travelling to the
              service address.
            </Text>
          </View>
        ) : null}

        {booking.status === "in_progress" && isWorker ? (
          <View style={styles.acceptedCard}>
            <Text style={styles.acceptedTitle}>Service in progress</Text>

            <Text style={styles.acceptedText}>
              This job is currently in progress.
            </Text>
          </View>
        ) : null}

        {booking.cancellation_reason ? (
          <View style={styles.cancelledCard}>
            <Text style={styles.cancelledTitle}>Cancellation reason</Text>

            <Text style={styles.cancelledText}>
              {booking.cancellation_reason}
            </Text>
          </View>
        ) : null}

        {canCancel ? (
          <Pressable
            style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
            onPress={confirmCancelBooking}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.cancelButtonText}>Cancel booking</Text>
            )}
          </Pressable>
        ) : null}

        {!isWorker && booking.status === "completed" ? (
          <Pressable
            style={styles.rateButton}
            onPress={() =>
              router.push({
                pathname: "/booking-review",
                params: {
                  id: booking.id,
                },
              })
            }
          >
            <Text style={styles.rateButtonText}>Rate professional</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={styles.dashboardButton}
          onPress={() =>
            router.replace(isWorker ? "/worker-home" : "/customer-home")
          }
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
    textAlign: "center",
    lineHeight: 21,
    marginTop: 8,
  },

  backButtonLarge: {
    marginTop: 25,
    height: 50,
    paddingHorizontal: 25,
    borderRadius: 13,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  backButtonLargeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
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

  headerInfo: {
    flex: 1,
  },

  title: {
    fontSize: 27,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 12,
    color: "#888888",
    marginTop: 4,
  },

  statusBadge: {
    backgroundColor: "#F0F0F0",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333333",
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
    lineHeight: 19,
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
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    maxWidth: "65%",
    textAlign: "right",
  },

  separator: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },

  addressLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 6,
  },

  addressText: {
    fontSize: 15,
    color: "#333333",
    lineHeight: 22,
  },

  cityText: {
    fontSize: 14,
    color: "#777777",
    marginTop: 4,
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  priceLabel: {
    fontSize: 14,
    color: "#777777",
  },

  priceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  finalPriceValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
  },

  priceNote: {
    fontSize: 12,
    color: "#888888",
    lineHeight: 18,
    marginTop: 12,
  },

  primaryButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  loadingButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
  },

  acceptedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    padding: 20,
    marginBottom: 12,
  },

  acceptedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111111",
  },

  acceptedText: {
    fontSize: 14,
    color: "#777777",
    marginTop: 5,
    lineHeight: 21,
  },

  cancelledCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    padding: 22,
    marginBottom: 16,
  },

  cancelledTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 7,
  },

  cancelledText: {
    fontSize: 14,
    color: "#777777",
    lineHeight: 21,
  },

  cancelButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#555555",
  },

  rateButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },

  rateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  dashboardButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
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
