import { showAlert } from "../utils/alert";
import { router, useLocalSearchParams } from "expo-router";
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
import { errorMessage } from "../utils/display";

export default function ReviewBookingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [serviceName, setServiceName] = useState("Service");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

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

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select(
          `
            id,
            customer_id,
            worker_id,
            service_id,
            status
          `,
        )
        .eq("id", id)
        .eq("customer_id", user.id)
        .maybeSingle();

      if (bookingError) {
        throw bookingError;
      }

      if (!booking) {
        showAlert("Booking not found", "This booking could not be found.", [
          {
            text: "OK",
            onPress: () => router.replace("/my-bookings"),
          },
        ]);
        return;
      }

      if (booking.status !== "completed") {
        showAlert(
          "Not available",
          "You can only review a completed booking.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/my-bookings"),
            },
          ],
        );
        return;
      }

      if (!booking.worker_id) {
        showAlert(
          "Professional unavailable",
          "This booking does not have a professional assigned.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/my-bookings"),
            },
          ],
        );
        return;
      }

      setWorkerId(booking.worker_id);

      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("name")
        .eq("id", booking.service_id)
        .maybeSingle();

      if (!serviceError && service?.name) {
        setServiceName(service.name);
      }

      const { data: existingReview, error: reviewError } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("booking_id", booking.id)
        .maybeSingle();

      if (reviewError) {
        console.log("Existing review check error:", reviewError);
      }

      if (existingReview) {
        setAlreadyReviewed(true);
        setRating(existingReview.rating);
        setComment(existingReview.comment || "");
      }
    } catch (error) {
      console.log("Review booking loading error:", error);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function submitReview() {
    if (!workerId || !id || submitting) {
      return;
    }

    if (rating < 1 || rating > 5) {
      showAlert(
        "Rating required",
        "Please select a rating from 1 to 5 stars.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        showAlert("Login required", "Please log in again.", [
          {
            text: "OK",
            onPress: () => router.replace("/customer-login"),
          },
        ]);
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        booking_id: id,
        customer_id: user.id,
        worker_id: workerId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        if (error.code === "23505") {
          setAlreadyReviewed(true);

          showAlert(
            "Already reviewed",
            "You have already reviewed this booking.",
            [
              {
                text: "OK",
                onPress: () => router.replace("/my-bookings"),
              },
            ],
          );

          return;
        }

        throw error;
      }

      setAlreadyReviewed(true);

      showAlert(
        "Review submitted",
        "Thank you for rating your professional.",
        [
          {
            text: "Done",
            onPress: () => router.replace("/my-bookings"),
          },
        ],
      );
    } catch (error) {
      console.log("Review submission error:", error);

      showAlert(
        "Unable to submit review",
        errorMessage(error, "Something went wrong while submitting your review."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Loading review...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.title}>{id ? "Unable to load this review" : "Booking not found"}</Text>
        <Text style={styles.subtitle}>Open a completed booking from My Bookings to leave a review.</Text>
        {id ? <Pressable style={styles.submitButton} onPress={loadBooking}><Text style={styles.submitButtonText}>Retry</Text></Pressable> : null}
        <Pressable style={styles.dashboardButton} onPress={() => router.replace("/my-bookings")}><Text style={styles.dashboardButtonText}>Back to bookings</Text></Pressable>
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
            onPress={() => router.replace("/my-bookings")}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.title}>
              {alreadyReviewed ? "Your review" : "Rate your professional"}
            </Text>

            <Text style={styles.subtitle}>{serviceName}</Text>
          </View>
        </View>

        {/* RATING */}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How was your experience?</Text>

          <Text style={styles.cardSubtitle}>
            Your feedback helps improve SewaGo.
          </Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => {
                  if (!alreadyReviewed) {
                    setRating(star);
                  }
                }}
                disabled={alreadyReviewed}
                style={styles.starButton}
              >
                <Text
                  style={[styles.star, star <= rating && styles.starActive]}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.ratingText}>
            {rating === 0 ? "Select a rating" : `${rating} out of 5`}
          </Text>
        </View>

        {/* REVIEW */}

        <View style={styles.card}>
          <Text style={styles.inputLabel}>REVIEW</Text>

          <TextInput
            style={styles.input}
            placeholder="Tell us about your experience..."
            placeholderTextColor="#999999"
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
            editable={!alreadyReviewed}
            maxLength={500}
          />

          <Text style={styles.characterCount}>{comment.length}/500</Text>
        </View>

        {/* SUBMIT */}

        {alreadyReviewed ? (
          <View style={styles.submittedCard}>
            <Text style={styles.submittedTitle}>Review submitted</Text>

            <Text style={styles.submittedText}>
              You have already reviewed this booking.
            </Text>
          </View>
        ) : (
          <Pressable
            style={[
              styles.submitButton,
              (submitting || rating === 0) && styles.submitButtonDisabled,
            ]}
            onPress={submitReview}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <>
                <ActivityIndicator color="#FFFFFF" />

                <Text style={styles.submitLoadingText}>Submitting...</Text>
              </>
            ) : (
              <Text style={styles.submitButtonText}>Submit review</Text>
            )}
          </Pressable>
        )}

        {/* BACK */}

        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/my-bookings")}
        >
          <Text style={styles.dashboardButtonText}>Back to bookings</Text>
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
    maxWidth: 700,
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
    fontSize: 25,
    fontWeight: "700",
    color: "#111111",
  },

  subtitle: {
    fontSize: 13,
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

  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
  },

  cardSubtitle: {
    fontSize: 13,
    color: "#777777",
    textAlign: "center",
    marginTop: 6,
  },

  stars: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },

  starButton: {
    paddingHorizontal: 6,
  },

  star: {
    fontSize: 42,
    color: "#D8D8D8",
  },

  starActive: {
    color: "#111111",
  },

  ratingText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555555",
    textAlign: "center",
    marginTop: 10,
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#888888",
    letterSpacing: 1,
    marginBottom: 12,
  },

  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 13,
    padding: 14,
    fontSize: 14,
    color: "#111111",
    backgroundColor: "#FAFAFA",
  },

  characterCount: {
    fontSize: 11,
    color: "#999999",
    textAlign: "right",
    marginTop: 7,
  },

  submitButton: {
    height: 55,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginBottom: 12,
  },

  submitButtonDisabled: {
    opacity: 0.45,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  submitLoadingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 10,
  },

  submittedCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E7E7",
    padding: 20,
    marginBottom: 12,
  },

  submittedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },

  submittedText: {
    fontSize: 13,
    color: "#777777",
    marginTop: 5,
  },

  dashboardButton: {
    height: 53,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    alignItems: "center",
    justifyContent: "center",
  },

  dashboardButtonText: {
    color: "#333333",
    fontSize: 14,
    fontWeight: "600",
  },
});
