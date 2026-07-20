const monthFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
});

function labelMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(year, monthNumber - 1, 1, 12);
  const label = monthFormatter.format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

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
    label: labelMonth(value),
  }));
}
