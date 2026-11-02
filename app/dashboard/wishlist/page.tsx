import Link from "next/link";
import { DashboardShell, Empty, Panel, NotConfigured } from "@/components/dashboard-shell";
import { readerNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { toggleWishlistAction } from "../actions";
import { formatDate } from "@/lib/format";

export default async function WishlistPage() {
  await requireViewer("/dashboard/wishlist");
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <DashboardShell eyebrow="Reader" title="Wishlist" sections={readerNav()}>
        <NotConfigured what="Your wishlist" />
      </DashboardShell>
    );
  }

  const { data } = await supabase
    .from("wishlist_items")
    .select("id, created_at, book_id, books(slug, title)")
    .order("created_at", { ascending: false });

  const rows = data ?? [];

  return (
    <DashboardShell
      eyebrow="Reader"
      title="Wishlist"
      description="Titles you are considering. Nothing is reserved and prices can change."
      sections={readerNav({ wishlist: rows.length })}
    >
      <Panel title={`${rows.length} saved`}>
        {rows.length === 0 ? (
          <Empty title="Nothing saved yet">
            Use “Save to wishlist” on any book page.
          </Empty>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((row) => {
              const book = row.books as unknown as { slug: string; title: string } | null;
              return (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    {book ? (
                      <Link href={`/books/${book.slug}`} className="text-[0.95rem] text-navy hover:underline">
                        {book.title}
                      </Link>
                    ) : (
                      <span className="text-[0.95rem] text-charcoal">Unavailable title</span>
                    )}
                    <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                      Saved {formatDate(row.created_at)}
                    </p>
                  </div>
                  <form action={toggleWishlistAction.bind(null, row.book_id)}>
                    <button
                      type="submit"
                      className="text-[0.7rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase hover:text-navy"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </DashboardShell>
  );
}
