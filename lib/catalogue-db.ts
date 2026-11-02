/**
 * Single entry point for catalogue reads from Supabase. The mapping lives in
 * `catalogue-live`; this module keeps the historical import names used by the
 * purchase panel so there is exactly one implementation.
 */
export {
  loadLiveCatalogue as getLiveBooks,
  loadLiveBook as getLiveBookBySlug,
  loadLiveAuthors as getLiveAuthors,
  formatLabelFor,
} from "@/lib/catalogue-live";
export type { LiveBook, LiveOffer, LiveAuthor, CatalogueResult } from "@/lib/catalogue-live";
