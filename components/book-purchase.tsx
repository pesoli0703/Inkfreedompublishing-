import { PurchasePanel } from "@/components/purchase-panel";
import { LivePurchasePanel } from "@/components/live-purchase-panel";
import { getLiveBookBySlug } from "@/lib/catalogue-db";
import type { Book } from "@/lib/data/types";

/**
 * Uses the live catalogue when the slug exists in Supabase; otherwise falls back
 * to the labelled design-preview panel. The fallback never implies a real title
 * is for sale.
 */
export async function BookPurchase({ slug, book }: { slug: string; book: Book }) {
  const live = await getLiveBookBySlug(slug);
  if (!live || live.offers.length === 0) return <PurchasePanel book={book} />;

  return (
    <div className="space-y-3">
      <LivePurchasePanel title={live.title} offers={live.offers} currencies={live.currencies} />
      <p className="text-[0.7rem] leading-relaxed text-charcoal-soft">
        Prices in other currencies are converted from the author’s NGN base price
        using the platform rate table. Each converted price carries its rate,
        source and timestamp.
      </p>
    </div>
  );
}
