import "server-only";

import { createSupabaseServerClient } from "./supabase/server";
import type { Book } from "./types";

export type StudioSale = {
  id: string;
  title: string;
  author_share_kobo: number;
  unit_price_kobo: number;
  order: { reference: string; paid_at: string | null; status: string } | null;
};

export type StudioBalance = {
  lifetime_kobo: number;
  last_30_kobo: number;
  units_sold: number;
  available_kobo: number;
  committed_kobo: number;
};

export async function getStudioOverview(authorId: string) {
  const supabase = await createSupabaseServerClient();

  const [booksResult, salesResult, balanceResult, payoutsResult] = await Promise.all([
    supabase
      .from("ink_books")
      .select("id, title, slug, status, price_kobo, cover_path, category, ebook_path, published_at, submitted_at, review_note, updated_at, author_id, ebook_format, ebook_size_bytes, pages, language, subtitle, description, isbn, created_at")
      .eq("author_id", authorId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("ink_order_items")
      .select(
        "id, title, author_share_kobo, unit_price_kobo, order:ink_orders!inner ( reference, paid_at, status )",
      )
      .eq("author_id", authorId)
      .eq("order.status", "paid")
      .order("id", { ascending: false })
      .limit(8),
    supabase
      .from("ink_author_balances")
      .select("*")
      .eq("author_id", authorId)
      .maybeSingle(),
    supabase
      .from("ink_payouts")
      .select("id, amount_kobo, status, requested_at, resolved_at, note")
      .eq("author_id", authorId)
      .order("requested_at", { ascending: false }),
  ]);

  const books = (booksResult.data ?? []) as Book[];
  const sales = (salesResult.data ?? []) as unknown as StudioSale[];

  const balance: StudioBalance = {
    lifetime_kobo: Number(balanceResult.data?.lifetime_kobo ?? 0),
    last_30_kobo: Number(balanceResult.data?.last_30_kobo ?? 0),
    units_sold: Number(balanceResult.data?.units_sold ?? 0),
    available_kobo: Number(balanceResult.data?.available_kobo ?? 0),
    committed_kobo: Number(balanceResult.data?.committed_kobo ?? 0),
  };

  return {
    books,
    sales,
    balance,
    payouts: payoutsResult.data ?? [],
    counts: {
      published: books.filter((book) => book.status === "published").length,
      pending: books.filter((book) => book.status === "pending").length,
      drafts: books.filter((book) => book.status === "draft").length,
      rejected: books.filter((book) => book.status === "rejected").length,
    },
  };
}

export async function getStudioBook(bookId: string, authorId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ink_books")
    .select("*")
    .eq("id", bookId)
    .eq("author_id", authorId)
    .maybeSingle();
  return (data as Book | null) ?? null;
}

export async function getSalesSeries(authorId: string, days = 14) {
  const supabase = await createSupabaseServerClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data } = await supabase
    .from("ink_order_items")
    .select("author_share_kobo, order:ink_orders!inner ( paid_at, status )")
    .eq("author_id", authorId)
    .eq("order.status", "paid")
    .gte("order.paid_at", since);

  const buckets = new Map<string, number>();
  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(Date.now() - index * 86400000);
    buckets.set(date.toISOString().slice(5, 10), 0);
  }

  for (const row of (data ?? []) as unknown as Array<{
    author_share_kobo: number;
    order: { paid_at: string | null } | null;
  }>) {
    if (!row.order?.paid_at) continue;
    const key = row.order.paid_at.slice(5, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.author_share_kobo);
  }

  return [...buckets.entries()].map(([label, value]) => ({ label, value: Math.round(value / 100) }));
}
