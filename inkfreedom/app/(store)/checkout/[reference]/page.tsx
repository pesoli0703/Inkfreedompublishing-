import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui";
import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeSimulatedPaymentAction } from "@/lib/actions/commerce";
import { formatNaira } from "@/lib/format";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/signin?next=/checkout/${reference}`);

  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase
    .from("ink_orders")
    .select(
      `id, reference, status, total_kobo, created_at, paid_at,
       items:ink_order_items ( id, title, unit_price_kobo, book:ink_books ( slug, ebook_format, author:ink_authors ( name ) ) )`,
    )
    .eq("reference", reference)
    .maybeSingle();

  if (!order) notFound();

  const item = (order.items as unknown as Array<{
    id: string;
    title: string;
    unit_price_kobo: number;
    book: { slug: string; ebook_format: string; author: { name: string } | null } | null;
  }>)[0];

  const commission = Math.round(order.total_kobo * 0.1);

  return (
    <div className="shell max-w-4xl py-12 md:py-20">
      <div className="flex items-center gap-3">
        <Link href="/books" className="text-[0.8rem] text-ink-muted hover:text-ink">
          ← Back to the shelf
        </Link>
      </div>

      <div className="mt-8 grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="label text-ink-muted">Checkout</p>
          <h1 className="display-lg mt-3 text-ink">
            {order.status === "paid" ? "You own this book." : "One step left."}
          </h1>
          <p className="mt-4 max-w-md text-[0.9rem] leading-relaxed text-ink-muted">
            {order.status === "paid"
              ? "The edition has been added to your library. You can download it now, and any time after."
              : "Confirm the payment below. The edition is added to your library immediately and stays there."}
          </p>

          <div className="mt-8 border border-line bg-paper-card">
            <div className="flex items-start justify-between gap-4 border-b border-line p-5">
              <div>
                <p className="font-display text-[1.35rem] leading-tight text-ink">
                  {item?.title ?? "Ebook"}
                </p>
                <p className="mt-1 text-[0.8rem] text-ink-muted">
                  {item?.book?.author?.name ?? "Inkfreedom"} ·{" "}
                  {item?.book?.ebook_format === "epub" ? "ePub" : "PDF"}
                </p>
              </div>
              <Badge tone={order.status === "paid" ? "green" : "amber"}>
                {order.status === "paid" ? "Paid" : "Awaiting payment"}
              </Badge>
            </div>

            <dl className="divide-y divide-line-soft p-5 text-[0.85rem]">
              <div className="flex items-center justify-between pb-3">
                <dt className="text-ink-muted">Edition</dt>
                <dd className="text-ink">{formatNaira(item?.unit_price_kobo ?? 0)}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-muted">Platform fee (10%)</dt>
                <dd className="text-ink-muted">{formatNaira(commission)}</dd>
              </div>
              <div className="flex items-center justify-between py-3">
                <dt className="text-ink-muted">Author royalty (90%)</dt>
                <dd className="text-ink-muted">
                  {formatNaira((item?.unit_price_kobo ?? 0) - commission)}
                </dd>
              </div>
              <div className="flex items-center justify-between pt-3">
                <dt className="font-medium text-ink">Total due</dt>
                <dd className="font-display text-[1.5rem] leading-none text-ink">
                  {order.total_kobo === 0 ? "Free" : formatNaira(order.total_kobo)}
                </dd>
              </div>
            </dl>
          </div>

          <p className="mt-4 text-[0.75rem] leading-relaxed text-ink-muted">
            Reference <span className="font-mono text-ink-soft">{order.reference}</span>
          </p>
        </div>

        <aside className="md:pt-16">
          {order.status === "paid" ? (
            <div className="border border-line bg-paper-deep p-6">
              <p className="label text-ink-muted">Next</p>
              <p className="mt-2 font-display text-[1.35rem] leading-tight text-ink">
                Your library is ready.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <Link href="/library" className="btn btn-primary w-full">
                  Open my library
                </Link>
                {item?.book?.slug ? (
                  <Link href={`/books/${item.book.slug}`} className="btn btn-quiet w-full">
                    Back to the title
                  </Link>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="border border-ink bg-ink p-6 text-paper">
              <p className="label text-paper/50">Payment</p>
              <p className="mt-2 font-display text-[1.35rem] leading-tight">
                Card checkout is not connected yet.
              </p>
              <p className="mt-3 text-[0.8rem] leading-relaxed text-paper/60">
                This build has no payment processor attached, so this step is
                simulated. No money moves and no card details are collected. The
                order, the royalty split and the entitlement are real.
              </p>

              <form action={completeSimulatedPaymentAction} className="mt-6">
                <input type="hidden" name="reference" value={order.reference} />
                <button type="submit" className="btn btn-ember w-full">
                  Complete simulated payment
                </button>
              </form>

              <p className="mt-4 text-center text-[0.68rem] text-paper/40">
                Connected by an administrator once Flutterwave keys are added.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
