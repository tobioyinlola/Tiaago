// Shared by both the browser report view and the PDF builder so numbers
// render identically in both places.

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

const countFormatter = new Intl.NumberFormat("en-US");

export const formatNaira = (value: number | null | undefined): string =>
  value == null ? "N/A" : nairaFormatter.format(value);

export const formatPercent = (value: number | null | undefined): string =>
  value == null ? "N/A" : `${value}%`;

export const formatDays = (value: number | null | undefined): string =>
  value == null ? "N/A" : `${value} ${value === 1 ? "day" : "days"}`;

export const formatHours = (value: number | null | undefined): string => {
  if (value == null) return "N/A";
  if (value >= 24) return `${(value / 24).toFixed(1)} days`;
  return `${value} hrs`;
};

export const formatCount = (value: number | null | undefined): string =>
  value == null ? "N/A" : countFormatter.format(value);

export const formatDate = (value: string | null | undefined): string =>
  value ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "N/A";

export const formatDateRange = (from: string, to: string): string => `${formatDate(from)} - ${formatDate(to)}`;
