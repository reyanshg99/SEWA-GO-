export const BOOKING_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
  expired: "Expired",
};

export function formatBookingStatus(status: string): string {
  return BOOKING_STATUS_LABELS[status] ?? "Status unavailable";
}

export function formatCurrency(amount: number | null | undefined): string {
  return `₹${Number(amount ?? 0).toLocaleString("en-IN")}`;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
