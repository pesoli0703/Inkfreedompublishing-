/**
 * eBook file rules.
 *
 * The marketplace sells digital eBooks only: a PDF or an EPUB, delivered as a
 * private file the reader downloads after a verified purchase. Nothing here
 * touches print.
 */

export const EBOOK_MAX_BYTES = 200 * 1024 * 1024;
export const COVER_MAX_BYTES = 10 * 1024 * 1024;

/** What the file input accepts, and what the server will believe. */
export const EBOOK_ACCEPT = ".pdf,.epub,application/pdf,application/epub+zip";
export const COVER_ACCEPT = "image/jpeg,image/png,image/webp";

export type EbookKind = "pdf" | "ebook";

export type DescribedEbook = {
  /** `book_files.kind`: the PDF edition or the EPUB edition. */
  kind: EbookKind;
  extension: "pdf" | "epub";
  label: string;
};

/**
 * Identify a file as PDF or EPUB.
 *
 * The extension decides, because browsers send inconsistent (sometimes empty)
 * MIME types for EPUB. A claimed MIME type is only used as a fallback when the
 * name has no extension at all.
 */
export function describeEbookFile(file: {
  name: string;
  type?: string;
}): DescribedEbook | null {
  const name = file.name.toLowerCase();
  const extension = name.includes(".") ? name.split(".").pop() ?? "" : "";
  const type = (file.type ?? "").toLowerCase();

  if (extension === "pdf" || (!extension && type === "application/pdf")) {
    return { kind: "pdf", extension: "pdf", label: "PDF" };
  }
  if (extension === "epub" || (!extension && type === "application/epub+zip")) {
    return { kind: "ebook", extension: "epub", label: "EPUB" };
  }
  return null;
}

/** Human label for a stored file kind. */
export const ebookKindLabel = (kind: string) =>
  kind === "pdf" ? "PDF" : kind === "ebook" ? "EPUB" : kind;

/** The one format this platform sells. */
export const EBOOK_FORMAT_LABEL = "eBook";

/**
 * Currencies an author may price in today.
 *
 * NGN is the base price every catalogue offer and the submission checks depend
 * on. A second currency is only offered when the platform holds a conversion
 * rate for it, so a price can never be invented from nothing.
 */
export type PriceCurrency = { code: string; label: string; note?: string };

export const BASE_PRICE_CURRENCY: PriceCurrency = {
  code: "NGN",
  label: "NGN — Nigerian Naira",
  note: "Base price. Other currencies are converted from this.",
};

export function priceCurrencyOptions(
  rates: { quote_currency: string }[] | null | undefined,
): PriceCurrency[] {
  const extras = new Set((rates ?? []).map((row) => row.quote_currency?.toUpperCase()));
  const names: Record<string, string> = {
    USD: "USD — US Dollar",
    GBP: "GBP — Pound Sterling",
    EUR: "EUR — Euro",
  };
  return [
    BASE_PRICE_CURRENCY,
    ...["USD", "GBP", "EUR"]
      .filter((code) => extras.has(code))
      .map((code) => ({ code, label: names[code] ?? code })),
  ];
}
