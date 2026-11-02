import Link from "next/link";
import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { EbookUploadForm } from "@/components/ebook-upload-form";
import { authorNav } from "@/lib/nav";
import { requireAuthorArea } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { priceCurrencyOptions } from "@/lib/ebooks";
import { redirect } from "next/navigation";

export default async function NewBookPage() {
  const viewer = await requireAuthorArea("/author/books/new");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/author");

  const [{ data: author }, { data: categories }, { data: rates }] = await Promise.all([
    supabase
      .from("author_profiles")
      .select("pen_name, status")
      .eq("user_id", viewer.id)
      .maybeSingle(),
    supabase
      .from("categories")
      .select("id, name, section")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("fx_rates").select("quote_currency"),
  ]);

  if (!author) redirect("/author/start");
  if (author.status === "suspended") redirect("/author");

  return (
    <DashboardShell
      eyebrow="Upload"
      title="Upload a new eBook"
      description="A PDF or an EPUB, a cover, a price. Nothing is listed until an administrator approves it."
      sections={authorNav()}
      aside={
        <Link
          href="/author/books"
          className="text-[0.72rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase hover:text-navy"
        >
          ← My eBooks
        </Link>
      }
    >
      <Panel>
        <EbookUploadForm
          authorName={author.pen_name ?? ""}
          categories={categories ?? []}
          currencies={priceCurrencyOptions(rates)}
        />
      </Panel>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          ["1. Upload", "Cover for the shop, PDF or EPUB for the buyer."],
          ["2. Review", "An administrator reads it and approves or sends it back."],
          ["3. On sale", "Approved eBooks appear in the bookstore automatically."],
        ].map(([title, body]) => (
          <div key={title} className="border border-line bg-ivory p-4">
            <p className="text-[0.78rem] font-semibold text-navy">{title}</p>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-charcoal-soft">{body}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
