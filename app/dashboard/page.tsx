import Link from "next/link";
import { DashboardShell, Empty, Panel, StatGrid, NotConfigured } from "@/components/dashboard-shell";
import { readerNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/format";

export default async function ReaderDashboard() {
  const viewer = await requireViewer("/dashboard");
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <DashboardShell eyebrow="Reader" title="Your dashboard" sections={readerNav()}>
        <NotConfigured what="Your account data" />
      </DashboardShell>
    );
  }

  const [entitlements, orders, wishlist, notifications] = await Promise.all([
    supabase
      .from("entitlements")
      .select("id, granted_at, books(title, slug), order_id")
      .is("revoked_at", null)
      .order("granted_at", { ascending: false })
      .limit(4),
    supabase
      .from("orders")
      .select("id, order_number, status, currency, total_minor, placed_at")
      .order("created_at", { ascending: false })
      .limit(4),
    supabase.from("wishlist_items").select("id", { count: "exact", head: true }),
    supabase
      .from("notifications")
      .select("id, title, body, link, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const libraryCount = entitlements.data?.length ?? 0;
  const openOrders = (orders.data ?? []).filter((order) =>
    ["pending_payment", "draft", "failed"].includes(order.status as string),
  ).length;

  return (
    <DashboardShell
      eyebrow="Reader"
      title={`Welcome back${viewer.fullName ? `, ${viewer.fullName.split(" ")[0]}` : ""}`}
      description="Your purchases, downloads and account in one place."
      sections={readerNav({ wishlist: wishlist.count ?? 0, orders: openOrders })}
      aside={
        <Link
          href="/books"
          className="border border-navy px-5 py-3 text-[0.68rem] font-semibold tracking-[0.16em] text-navy uppercase transition-colors hover:bg-navy hover:text-ivory"
        >
          Browse books
        </Link>
      }
    >
      <div className="space-y-8">
        <StatGrid
          stats={[
            { label: "Books in library", value: String(libraryCount) },
            { label: "Wishlist", value: String(wishlist.count ?? 0) },
            { label: "Open orders", value: String(openOrders) },
          ]}
        />

        <Panel
          title="Recently added to your library"
          action={
            <Link href="/dashboard/library" className="text-[0.72rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep">
              View all
            </Link>
          }
        >
          {libraryCount === 0 ? (
            <Empty title="No books yet">
              Purchases appear here permanently. Digital downloads can be
              re-requested at any time, each request valid for seven days.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {(entitlements.data ?? []).map((item) => {
                const book = item.books as unknown as { title: string; slug: string } | null;
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-[0.92rem] text-navy">{book?.title ?? "Book"}</p>
                      <p className="text-[0.72rem] text-charcoal-soft">
                        Added {formatDate(item.granted_at)}
                      </p>
                    </div>
                    <Link
                      href="/dashboard/library"
                      className="text-[0.72rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep"
                    >
                      Download
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Account activity">
          {(!notifications.data || notifications.data.length === 0) ? (
            <Empty title="Nothing yet">
              Order updates, approvals and support replies appear here.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {notifications.data.map((note) => (
                <li key={note.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.9rem] text-navy">{note.title}</p>
                      {note.body && (
                        <p className="mt-1 text-[0.8rem] leading-relaxed text-charcoal-soft">
                          {note.body}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-[0.7rem] text-charcoal-soft">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent orders">
          {(!orders.data || orders.data.length === 0) ? (
            <Empty title="No orders">
              When you buy a book, the order and payment record appear here.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {orders.data.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-mono text-[0.8rem] text-navy">{order.order_number}</p>
                    <p className="text-[0.72rem] text-charcoal-soft">
                      {formatDate(order.placed_at)} · {order.status}
                    </p>
                  </div>
                  <span className="text-[0.9rem] text-charcoal">
                    {formatMoney(order.total_minor, order.currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
