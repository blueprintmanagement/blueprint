import { displayMonthLabel } from "@/lib/display";

export function getAvailableMonths(dates: string[], fallbackDate = new Date()) {
  const fallbackMonth = fallbackDate.toISOString().slice(0, 7);
  const months = Array.from(
    new Set(
      dates
        .filter(Boolean)
        .map((date) => date.slice(0, 7)),
    ),
  ).sort((a, b) => b.localeCompare(a));

  const normalizedMonths = months.length ? months : [fallbackMonth];

  return normalizedMonths.map((value) => ({
    value,
    label: displayMonthLabel(value),
  }));
}
