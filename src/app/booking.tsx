import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function BookingScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    price?: string;
  }>();

  const serviceName = params.name || "Service";
  const servicePrice = params.price || "0";

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [address, setAddress] = useState("");

  const dates = getNextDates();

  const times = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
    "6:00 PM",
  ];

  const canContinue =
    selectedDate !== "" && selectedTime !== "" && address.trim() !== "";

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }

    router.push({
      pathname: "/booking-confirmation",
      params: {
        id: params.id || "",
        name: serviceName,
        price: servicePrice,
        date: selectedDate,
        time: selectedTime,
        address: address.trim(),
      },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.replace("/services")}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View>
            <Text style={styles.title}>Book service</Text>

            <Text style={styles.subtitle}>Choose a convenient time</Text>
          </View>
        </View>

        <View style={styles.serviceCard}>
          <View style={styles.serviceIcon}>
            <Text style={styles.serviceIconText}>
              {serviceName.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{serviceName}</Text>

            <Text style={styles.servicePrice}>
              Starting from ₹{Number(servicePrice).toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose a date</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {dates.map((date) => (
            <Pressable
              key={date.value}
              style={[
                styles.dateCard,
                selectedDate === date.value && styles.dateCardSelected,
              ]}
              onPress={() => setSelectedDate(date.value)}
            >
              <Text
                style={[
                  styles.dateDay,
                  selectedDate === date.value && styles.selectedText,
                ]}
              >
                {date.day}
              </Text>

              <Text
                style={[
                  styles.dateNumber,
                  selectedDate === date.value && styles.selectedText,
                ]}
              >
                {date.number}
              </Text>

              <Text
                style={[
                  styles.dateMonth,
                  selectedDate === date.value && styles.selectedText,
                ]}
              >
                {date.month}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Choose a time</Text>

        <View style={styles.timeGrid}>
          {times.map((time) => (
            <Pressable
              key={time}
              style={[
                styles.timeButton,
                selectedTime === time && styles.timeButtonSelected,
              ]}
              onPress={() => setSelectedTime(time)}
            >
              <Text
                style={[
                  styles.timeText,
                  selectedTime === time && styles.selectedText,
                ]}
              >
                {time}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Service address</Text>

        <View style={styles.inputCard}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Enter your complete address"
            placeholderTextColor="#999999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={styles.addressInput}
          />
        </View>

        <Text style={styles.helperText}>
          Please provide the address where the professional should provide the
          service.
        </Text>

        <Pressable
          style={[
            styles.continueButton,
            !canContinue && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!canContinue}
        >
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function getNextDates() {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    dates.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      day: date.toLocaleDateString("en-US", {
        weekday: "short",
      }),
      number: date.getDate().toString(),
      month: date.toLocaleDateString("en-US", {
        month: "short",
      }),
    });
  }

  return dates;
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
    borderWidth: 1,
    borderColor: "#E2E2E2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  backText: {
    fontSize: 28,
    color: "#111111",
    lineHeight: 30,
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

  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  serviceIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  serviceIconText: {
    fontSize: 20,
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

  servicePrice: {
    fontSize: 13,
    color: "#777777",
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111111",
    marginBottom: 14,
  },

  dateRow: {
    gap: 10,
    paddingBottom: 28,
  },

  dateCard: {
    width: 82,
    height: 95,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  dateCardSelected: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  dateDay: {
    fontSize: 12,
    color: "#777777",
    fontWeight: "600",
  },

  dateNumber: {
    fontSize: 25,
    fontWeight: "700",
    color: "#111111",
    marginTop: 3,
  },

  dateMonth: {
    fontSize: 12,
    color: "#777777",
    marginTop: 2,
  },

  selectedText: {
    color: "#FFFFFF",
  },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 30,
  },

  timeButton: {
    width: "31.5%",
    minWidth: 120,
    height: 50,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E2E2",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },

  timeButtonSelected: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },

  timeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },

  inputCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E2E2E2",
    overflow: "hidden",
  },

  addressInput: {
    minHeight: 120,
    padding: 16,
    fontSize: 15,
    color: "#111111",
  },

  helperText: {
    fontSize: 12,
    color: "#888888",
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 24,
  },

  continueButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#111111",
    alignItems: "center",
    justifyContent: "center",
  },

  continueButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
