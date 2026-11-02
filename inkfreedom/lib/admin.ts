import "server-only";

import { createSupabaseServerClient } from "./supabase/server";

export type AdminBook = {
  id: string;
  title: string;
  slug: string;
  status: string;
  category: string;
  price_kobo: number;
  ebook_format: string;
  cover_path: string | null;
  ebook_path: string | null;
  description: string;
  pages: number | null;
  submitted_at: string | null;
  published_at: string | null;
  review_note: string | null;
  updated_at: string;
  author: { id: string; name: string; slug: string; profile_id: string } | null;
};

const ADMIN_BOOK_SELECT = `
  id, title, slug, status, category, price_kobo, ebook_format, cover_path, ebook_path,
  description, pages, submitted_at, published_at, review_note, updated_at,
  author:ink_authors!ink_books_author_id_fkey ( id, name, slug, profile_id )
`;

export async function getAdminOverview() {
  const supabase = await createSupabaseServerClient();

  const [books, orders, profiles, payouts, items] = await Promise.all([
    supabase.from("ink_books").select("id, status, price_kobo, published_at, title, slug, submitted_at"),
    supabase
      .from("ink_orders")
      .select("id, reference, status, total_kobo, created_at, paid_at, reader_id")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("ink_profiles").select("id, role, created_at"),
    supabase
      .from("ink_payouts")
      .select("id, amount_kobo, status, requested_at, author_id, author:ink_authors ( name )")
      .order("requested_at", { ascending: false }),
    supabase.from("ink_order_items").select("id, platform_fee_kobo, author_share_kobo, title"),
  ]);

  const bookList = books.data ?? [];
  const orderList = orders.data ?? [];
  const paidOrders = orderList.filter((order) => order.status === "paid");
  const profileList = profiles.data ?? [];

  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total_kobo), 0);
  const fees = (items.data ?? []).reduce((sum, item) => sum + Number(item.platform_fee_kobo), 0);
  const royalties = (items.data ?? []).reduce(
    (sum, item) => sum + Number(item.author_share_kobo),
    0,
  );

  // Revenue for the last 14 days, bucketed by day.
  const series: Array<{ label: string; value: number }> = [];
  for (let index = 13; index >= 0; index -= 1) {
    const day = new Date(Date.now() - index * 86400000).toISOString().slice(0, 10);
    const value = paidOrders
      .filter((order) => (order.paid_at ?? order.created_at).slice(0, 10) === day)
      .reduce((sum, order) => sum + Number(order.total_kobo), 0);
    series.push({ label: day.slice(5), value: Math.round(value / 100) });
  }

  return {
    counts: {
      titles: bookList.filter((book) => book.status === "published").length,
      pending: bookList.filter((book) => book.status === "pending").length,
      drafts: bookList.filter((book) => book.status === "draft").length,
      readers: profileList.filter((profile) => profile.role === "reader").length,
      authors: profileList.filter((profile) => profile.role === "author").length,
      orders: paidOrders.length,
      payoutsDue: (payouts.data ?? []).filter((payout) => payout.status === "requested").length,
    },
    money: { revenue, fees, royalties },
    series,
    recentOrders: orderList.slice(0, 8),
    queue: bookList.filter((book) => book.status === "pending").slice(0, 6),
    payouts: (payouts.data ?? []) as unknown as Array<{
      id: string;
      amount_kobo: number;
      status: string;
      requested_at: string;
      author: { name: string } | null;
    }>,
  };
}

export async function listAdminBooks(status?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("ink_books").select(ADMIN_BOOK_SELECT);
  if (status) query = query.eq("status", status);
  const { data } = await query.order("updated_at", { ascending: false });
  return (data ?? []) as unknown as AdminBook[];
}

export async function getAdminBook(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("ink_books").select(ADMIN_BOOK_SELECT).eq("id", id).maybeSingle();
  return (data as unknown as AdminBook | null) ?? null;
}

export async function listAdminAuthors() {
  const supabase = await createSupabaseServerClient();
  const [authors, books, balances] = await Promise.all([
    supabase
      .from("ink_authors")
      .select("id, name, slug, tagline, status, location, created_at, profile_id, profile:ink_profiles ( email )")
      .order("created_at", { ascending: false }),
    supabase.from("ink_books").select("author_id, status"),
    supabase.from("ink_author_balances").select("author_id, lifetime_kobo, available_kobo, units_sold"),
  ]);

  const bookRows = books.data ?? [];
  const balanceRows = balances.data ?? [];

  return (authors.data ?? []).map((author) => {
    const own = bookRows.filter((book) => book.author_id === author.id);
    const balance = balanceRows.find((row) => row.author_id === author.id);
    return {
      ...author,
      published: own.filter((book) => book.status === "published").length,
      total: own.length,
      lifetime_kobo: Number(balance?.lifetime_kobo ?? 0),
      available_kobo: Number(balance?.available_kobo ?? 0),
      units_sold: Number(balance?.units_sold ?? 0),
    };
  }) as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    tagline: string | null;
    status: string;
    location: string | null;
    created_at: string;
    profile_id: string;
    profile: { email: string } | null;
    published: number;
    total: number;
    lifetime_kobo: number;
    available_kobo: number;
    units_sold: number;
  }>;
}

export async function listAdminReaders() {
  const supabase = await createSupabaseServerClient();
  const [profiles, orders, entitlements] = await Promise.all([
    supabase
      .from("ink_profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("ink_orders").select("reader_id, status, total_kobo"),
    supabase.from("ink_entitlements").select("reader_id"),
  ]);

  return (profiles.data ?? []).map((profile) => {
    const mine = (orders.data ?? []).filter(
      (order) => order.reader_id === profile.id && order.status === "paid",
    );
    return {
      ...profile,
      orders: mine.length,
      spent_kobo: mine.reduce((sum, order) => sum + Number(order.total_kobo), 0),
      books: (entitlements.data ?? []).filter((row) => row.reader_id === profile.id).length,
    };
  }) as unknown as Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    created_at: string;
    orders: number;
    spent_kobo: number;
    books: number;
  }>;
}

export async function listAdminOrders() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ink_orders")
    .select(
      `id, reference, status, total_kobo, created_at, paid_at, provider,
       reader:ink_profiles!ink_orders_reader_id_fkey ( email, full_name ),
       items:ink_order_items ( id, title )`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []) as unknown as Array<{
    id: string;
    reference: string;
    status: string;
    total_kobo: number;
    created_at: string;
    paid_at: string | null;
    provider: string;
    reader: { email: string; full_name: string | null } | null;
    items: Array<{ id: string; title: string }>;
  }>;
}

export async function listAdminPayouts() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ink_payouts")
    .select(
      `id, amount_kobo, status, note, requested_at, resolved_at,
       author:ink_authors!ink_payouts_author_id_fkey ( id, name, slug, profile:ink_profiles ( email ) )`,
    )
    .order("requested_at", { ascending: false });

  return (data ?? []) as unknown as Array<{
    id: string;
    amount_kobo: number;
    status: string;
    note: string | null;
    requested_at: string;
    resolved_at: string | null;
    author: { id: string; name: string; slug: string; profile: { email: string } | null } | null;
  }>;
}

export async function getStoreSettings() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("ink_settings").select("key, value").eq("key", "store").maybeSingle();
  const value = (data?.value ?? {}) as {
    commission_percent?: number;
    currency?: string;
    checkout_mode?: string;
  };
  return {
    commission_percent: value.commission_percent ?? 10,
    currency: value.currency ?? "NGN",
    checkout_mode: value.checkout_mode ?? "simulated",
  };
}
