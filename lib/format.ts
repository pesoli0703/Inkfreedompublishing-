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
