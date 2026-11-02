import { CURRENCY } from "./data/types";

const priceFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

/** ₦8,500 */
export const formatPrice = (amount: number) => priceFormatter.format(amount);

export const formatCount = (count: number, singular: string, plural?: string) =>
  `${count} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;

/** Minor-unit money, e.g. formatMoney(850000, "NGN") → "₦8,500.00" */
export function formatMoney(minor: number | bigint | null | undefined, currency = "NGN") {
  const value = Number(minor ?? 0) / 100;
  const digits = currency === "NGN" ? 2 : 2;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: digits === 2 && value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** "2 Nov 2026, 14:03" in a stable, readable form. */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const formatLabel = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/_/g, " ")
    .replace(/^\w/, (character) => character.toUpperCase());
