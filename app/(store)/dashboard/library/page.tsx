import Link from "next/link";
import { DashboardShell, Empty, Panel, NotConfigured } from "@/components/dashboard-shell";
import { readerNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireViewer("/dashboard/library");
  const { error } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const errorMessage: Record<string, string> = {
    not_entitled: "That book is not in your library, so no download was issued.",
    no_file: "The publisher has not attached a downloadable file to that book yet.",
    storage_not_configured: "File storage is not connected on this deployment.",
    sign_failed: "The download link could not be created. Please try again.",
    not_configured: "Accounts are not connected on this deployment.",
  };

  if (!supabase) {
    return (
      <DashboardShell eyebrow="Reader" title="My library" sections={readerNav()}>
        <NotConfigured what="Your library" />
      </DashboardShell>
    );
  }

  const { data: entitlements } = await supabase
    .from("entitlements")
    .select("id, granted_at, kind, books(id, book_code, title, slug, cover_path), order_id")
    .is("revoked_at", null)
    .order("granted_at", { ascending: false });

  const rows = entitlements ?? [];

  return (
    <DashboardShell
      eyebrow="Reader"
      title="My library"
      description="Everything you have bought. Access does not expire; each download link is valid for seven days."
      sections={readerNav()}
    >
      <div className="space-y-6">
        {error && errorMessage[error] && (
          <div className="border border-gold/60 bg-ivory p-4 text-[0.85rem] text-charcoal">
            {errorMessage[error]}
          </div>
        )}

        <Panel title={`${rows.length} ${rows.length === 1 ? "title" : "titles"}`}>
          {rows.length === 0 ? (
            <Empty title="Your library is empty">
              Buy a book from the catalogue and it will appear here.{" "}
              <Link href="/books" className="text-navy underline">
                Browse books
              </Link>
              .
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((row) => {
                const book = row.books as unknown as
                  | { id: string; book_code: string; title: string; slug: string }
                  | null;
                return (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                    <div>
                      <p className="text-[0.95rem] text-navy">{book?.title ?? "Book"}</p>
                      <p className="mt-1 font-mono text-[0.7rem] tracking-[0.04em] text-charcoal-soft">
                        {book?.book_code ?? "—"}
                      </p>
                      <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                        Added {formatDate(row.granted_at)} · {row.kind === "digital" ? "Ebook" : "Print"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {book?.slug && (
                        <Link
                          href={`/books/${book.slug}`}
                          className="text-[0.7rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase hover:text-navy"
                        >
                          Details
                        </Link>
                      )}
                      <a
                        href={book ? `/api/download/${book.id}` : "#"}
                        className="bg-navy px-4 py-2.5 text-[0.68rem] font-semibold tracking-[0.16em] text-ivory uppercase transition-colors hover:bg-navy-soft"
                      >
                        Download
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel tone="quiet">
          <p className="text-[0.8rem] leading-relaxed text-charcoal-soft">
            Download links are signed, personal and expire after seven days.
            Requesting a new link does not cost anything and does not affect your
            purchase — the entitlement is permanent. Sharing a signed link lets
            others download the file until it expires, so please keep it to
            yourself.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}
