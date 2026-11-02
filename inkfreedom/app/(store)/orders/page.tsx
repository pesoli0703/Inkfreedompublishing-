import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account-shell";
import { Badge, EmptyState } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getOrders } from "@/lib/queries";
import { formatDate, formatNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

type Order = {
  id: string;
  reference: string;
  status: "pending" | "paid" | "failed" | "refunded";
  total_kobo: number;
  created_at: string;
  paid_at: string | null;
  items: Array<{ id: string; title: string; unit_price_kobo: number; book_id: string }>;
};

export default async function OrdersPage() {
  const viewer = await requireViewer("/orders");
  const orders = (await getOrders(viewer.user.id)) as unknown as Order[];

  const spent = orders
    .filter((order) => order.status === "paid")
    .reduce((sum, order) => sum + order.total_kobo, 0);

  return (
    <AccountShell
      eyebrow="Your account"
      title="Orders"
      description="Every purchase, with its reference and royalty split recorded at the time of sale."
      aside={
        <div className="text-right">
          <p className="font-display text-[2rem] leading-none text-ink">{formatNaira(spent)}</p>
          <p className="label mt-1 text-ink-muted">Spent on ebooks</p>
        </div>
      }
    >
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="When you buy an ebook the order appears here with its reference number."
          action={
            <Link href="/books" className="btn btn-primary">
              Browse the shelf
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-line border-y border-line">
          {orders.map((order) => (
            <div key={order.id} className="py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[0.72rem] font-mono text-ink-muted">{order.reference}</p>
                  <p className="mt-1 text-[0.95rem] font-medium text-ink">
                    {order.items.map((item) => item.title).join(", ") || "Ebook order"}
                  </p>
                  <p className="mt-1 text-[0.72rem] text-ink-muted">
                    {formatDate(order.paid_at ?? order.created_at)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[0.9rem] font-medium tabular-nums text-ink">
                    {order.total_kobo === 0 ? "Free" : formatNaira(order.total_kobo)}
                  </p>
                  <div className="mt-1.5 flex justify-end">
                    <Badge
                      tone={
                        order.status === "paid"
                          ? "green"
                          : order.status === "pending"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {order.status}
                    </Badge>
                  </div>
                </div>
              </div>

              {order.status === "pending" ? (
                <Link
                  href={`/checkout/${order.reference}`}
                  className="mt-3 inline-block text-[0.78rem] font-medium text-ember hover:underline"
                >
                  Finish this purchase →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </AccountShell>
  );
}
