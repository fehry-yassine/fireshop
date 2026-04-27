import type { MoneyValue } from "@/types";

export function formatTnd(value: MoneyValue | null | undefined) {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return "TND --";
  }

  return new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    maximumFractionDigits: 3,
  }).format(amount);
}
