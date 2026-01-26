export const formatDisplayDate = (dateString) => {
  if (!dateString) return "N/A";
  const datePart = dateString.split(" ")[0].split("T")[0];
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}`;
};

export const formatFullDate = (dateString) => {
  if (!dateString) return "N/A";
  const datePart = dateString.split(" ")[0].split("T")[0];
  const [year, month, day] = datePart.split("-");

  const safeDate = new Date(year, month - 1, day);

  return safeDate.toLocaleDateString("en-US", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatDisplayTime = (timeString) => {
  if (!timeString) return "N/A";
  return timeString.substring(0, 5);
};

export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    hour12: false,
  });
};

export const formatDateForBackend = (date) => {
  if (!date) return null;
  if (typeof date === "string") {
    return date.split(" ")[0].split("T")[0];
  }
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getEndTime = (startTime, durationMinutes) => {
  if (!startTime || !durationMinutes) return "--:--";
  const [h, m] = startTime.split(":").map(Number);
  const totalMinutes = h * 60 + m + parseInt(durationMinutes);

  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;

  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

/**
 *
 * @param {number} amount
 * @returns {string}
 */
export const formatMoney = (amount) => {
  if (amount === undefined || amount === null) return "$0";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error("Currency Format Error:", error);
    return `$${amount}`;
  }
};
