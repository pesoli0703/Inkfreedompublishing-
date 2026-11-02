import { LivePurchasePanel } from "@/components/live-purchase-panel";
import type { LiveBook } from "@/lib/catalogue-live";

/**
 * Purchase panel for a published title. Only live books reach this component,
 * so there is no placeholder purchase flow to fall back to.
 */
export function BookPurchase({ book }: { book: LiveBook }) {
  if (book.offers.length === 0) return null;

  return (
    <div className="space-y-3">
      <LivePurchasePanel
        title={book.title}
        offers={book.offers}
        currencies={book.currencies}
      />
      <p className="text-[0.7rem] leading-relaxed text-charcoal-soft">
        Prices in other currencies are converted from the author’s NGN base price
        using the platform rate table. Each converted price carries its rate,
        source and timestamp.
      </p>
    </div>
  );
}
