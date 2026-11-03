import Link from "next/link";
import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { moderateBookAction, setPublicationAction, setFeaturedAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { ebookKindLabel } from "@/lib/ebooks";

/**
 * Submissions and the catalogue.
 *
 * Every query here is deliberately flat — one plain select per table, joined in
 * memory. An embedded select (`books(... book_files ...)`) fails as a whole if
 * PostgREST cannot resolve the relationship, and the page then rendered a
 * cheerful "Nothing awaiting review" while the dashboard badge said otherwise.
 * Worse, nothing told anyone the query had failed. Flat queries plus explicit
 * error reporting means a book that exists is always visible, and a failure is
 * always stated.
 */

type BookRow = {
  id: string;
  book_code: string | null;
  title: string;
  slug: string;
  status: string;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  is_featured: boolean | null;
  published_at: string | null;
  cover_path: string | null;
  description_paragraphs: string[] | null;
  author_id: string | null;
  primary_category_id: string | null;
};

type FormatRow = { id: string; book_id: string; format: string };
type PriceRow = { book_format_id: string; currency: string; price_minor: number };
type FileRow = {
  id: string;
  book_id: string;
  kind: string;
  size_bytes: number;
  is_current: boolean;
  created_at: string;
  scan_status: string;
};

const coverUrl = (path: string | null) =>
  path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-covers/${path}`
    : null;

export default async function AdminBooksPage() {
  await requireAdmin("/admin/books");
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return (
      <DashboardShell eyebrow="Catalogue" title="eBook submissions" sections={adminNav()}>
        <Panel tone="warning">Accounts are not connected on this deployment.</Panel>
      </DashboardShell>
    );
  }

  const problems: string[] = [];
  const note = (label: string, message: string | undefined) => {
    if (message) problems.push(`${label}: ${message}`);
  };

  const [booksResult, authorsResult, categoriesResult] = await Promise.all([
    supabase
      .from("books")
      .select(
        "id, book_code, title, slug, status, submitted_at, reviewed_at, review_note, is_featured, published_at, cover_path, description_paragraphs, author_id, primary_category_id",
      )
      .order("submitted_at", { ascending: false, nullsFirst: false }),
    supabase.from("author_profiles").select("id, pen_name, slug"),
    supabase.from("categories").select("id, name"),
  ]);

  note("books", booksResult.error?.message);
  note("authors", authorsResult.error?.message);
  note("categories", categoriesResult.error?.message);

  const books = (booksResult.data ?? []) as BookRow[];
  const bookIds = books.map((book) => book.id);

  const [formatsResult, filesResult] = await Promise.all([
    bookIds.length > 0
      ? supabase.from("book_formats").select("id, book_id, format").in("book_id", bookIds)
      : Promise.resolve({ data: [], error: null }),
    bookIds.length > 0
      ? supabase
          .from("book_files")
          .select("id, book_id, kind, size_bytes, is_current, created_at, scan_status")
          .in("book_id", bookIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  note("formats", formatsResult.error?.message);
  note("files", filesResult.error?.message);

  const formats = (formatsResult.data ?? []) as FormatRow[];
  const formatIds = formats.map((format) => format.id);

  const pricesResult = formatIds.length > 0
    ? await supabase
        .from("book_prices")
        .select("book_format_id, currency, price_minor")
        .in("book_format_id", formatIds)
        .eq("is_active", true)
    : { data: [], error: null };
  note("prices", pricesResult.error?.message);

  const prices = (pricesResult.data ?? []) as PriceRow[];
  const files = (filesResult.data ?? []) as FileRow[];

  const authors = new Map(
    ((authorsResult.data ?? []) as { id: string; pen_name: string | null }[]).map((author) => [
      author.id,
      author.pen_name,
    ]),
  );
  const categories = new Map(
    ((categoriesResult.data ?? []) as { id: string; name: string }[]).map((category) => [
      category.id,
      category.name,
    ]),
  );

  const formatsFor = (bookId: string) => formats.filter((format) => format.book_id === bookId);
  const pricesFor = (bookId: string) => {
    const ids = new Set(formatsFor(bookId).map((format) => format.id));
    return prices.filter((price) => ids.has(price.book_format_id));
  };
  const filesFor = (bookId: string) =>
    files.filter(
      (file) => file.book_id === bookId && file.is_current && ["ebook", "pdf"].includes(file.kind),
    );

  const pending = books.filter((book) => book.status === "submitted");
  const inCatalogue = books.filter((book) =>
    ["approved", "published", "unpublished"].includes(book.status),
  );

  return (
    <DashboardShell
      eyebrow="Catalogue"
      title="eBook submissions"
      description="Read each submitted eBook, approve or request changes with a note, then publish. Every action is written to the moderation and audit logs."
      sections={adminNav({ submissions: pending.length })}
    >
      <div className="space-y-6">
        {problems.length > 0 && (
          <Panel tone="warning" title="Some data could not be loaded">
            <ul className="space-y-1 text-[0.8rem] leading-relaxed text-charcoal">
              {problems.map((problem) => (
                <li key={problem} className="font-mono text-[0.75rem]">
                  {problem}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.78rem] leading-relaxed text-charcoal-soft">
              This is shown instead of an empty list, so a failed query is never
              mistaken for &ldquo;nothing submitted&rdquo;.
            </p>
          </Panel>
        )}

        <Panel title={`Awaiting review (${pending.length})`}>
          {pending.length === 0 ? (
            <Empty title="Nothing awaiting review">
              {books.length === 0
                ? "No book has been created yet."
                : "No submitted book is waiting. Books appear here the moment an author submits one."}
            </Empty>
          ) : (
            <ul className="space-y-6">
              {pending.map((book) => {
                const bookFiles = filesFor(book.id);
                const cover = coverUrl(book.cover_path);
                const bookPrices = pricesFor(book.id);
                const paragraphs = book.description_paragraphs ?? [];
                const category = book.primary_category_id
                  ? categories.get(book.primary_category_id)
                  : undefined;

                return (
                  <li key={book.id} className="border border-line p-5">
                    <div className="flex flex-col gap-5 sm:flex-row">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover}
                          alt={`Cover of ${book.title}`}
                          className="h-40 w-28 shrink-0 border border-line object-cover"
                        />
                      ) : (
                        <div className="flex h-40 w-28 shrink-0 items-center justify-center border border-dashed border-line text-[0.65rem] text-charcoal-soft">
                          No cover
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[0.7rem] tracking-[0.04em] text-gold-deep">
                          {book.book_code ?? "Pending"}
                        </p>
                        <p className="font-display text-lg text-navy">{book.title}</p>
                        <p className="text-[0.75rem] text-charcoal-soft">
                          {book.author_id ? authors.get(book.author_id) ?? "Unknown author" : "Unknown author"}
                          {book.submitted_at ? ` · submitted ${formatDate(book.submitted_at)}` : ""}
                          {category ? ` · ${category}` : ""}
                        </p>

                        <ul className="mt-3 space-y-1 text-[0.78rem] text-charcoal">
                          {bookPrices.map((price) => (
                            <li key={`${price.book_format_id}-${price.currency}`}>
                              eBook · {formatMoney(price.price_minor, price.currency)}
                              {price.currency === "NGN" ? " (base)" : ""}
                            </li>
                          ))}
                          {bookPrices.length === 0 && (
                            <li className="text-gold-deep">No active price — cannot be sold yet.</li>
                          )}
                        </ul>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.75rem]">
                          {bookFiles.length > 0 ? (
                            <>
                              <a
                                href={`/api/admin/book-file/${book.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="border border-navy px-3 py-1.5 text-[0.68rem] font-semibold tracking-[0.1em] text-navy uppercase hover:bg-navy hover:text-ivory"
                              >
                                Open eBook file
                              </a>
                              <span className="text-charcoal-soft">
                                {bookFiles
                                  .map(
                                    (file) =>
                                      `${ebookKindLabel(file.kind)} · ${(file.size_bytes / 1024 / 1024).toFixed(1)} MB`,
                                  )
                                  .join(" / ")}
                              </span>
                              {bookFiles.some((file) => file.scan_status === "failed") && (
                                <span className="text-red-700">Scan failed</span>
                              )}
                            </>
                          ) : (
                            <span className="text-gold-deep">
                              No eBook file attached — the author must upload one.
                            </span>
                          )}
                        </div>

                        {paragraphs.length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-[0.72rem] font-semibold tracking-[0.1em] text-charcoal-soft uppercase">
                              Read the description
                            </summary>
                            <div className="mt-2 space-y-2 text-[0.8rem] leading-relaxed text-charcoal">
                              {paragraphs.map((paragraph, index) => (
                                <p key={index}>{paragraph}</p>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <AdminForm action={moderateBookAction} submitLabel="Approve & publish">
                        <input type="hidden" name="book_id" value={book.id} />
                        <input type="hidden" name="decision" value="approved" />
                        <input type="hidden" name="publish" value="true" />
                        <textarea name="note" required rows={2} placeholder="Note (required)" className={adminField} />
                      </AdminForm>
                      <AdminForm action={moderateBookAction} submitLabel="Request changes" variant="quiet">
                        <input type="hidden" name="book_id" value={book.id} />
                        <input type="hidden" name="decision" value="changes_requested" />
                        <textarea name="note" required rows={2} placeholder="What must change" className={adminField} />
                      </AdminForm>
                      <AdminForm action={moderateBookAction} submitLabel="Reject" variant="danger">
                        <input type="hidden" name="book_id" value={book.id} />
                        <input type="hidden" name="decision" value="rejected" />
                        <textarea name="note" required rows={2} placeholder="Reason" className={adminField} />
                      </AdminForm>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Published and approved eBooks">
          {inCatalogue.length === 0 ? (
            <Empty title="No approved eBooks yet" />
          ) : (
            <ul className="divide-y divide-line">
              {inCatalogue.map((book) => {
                const cover = coverUrl(book.cover_path);
                const bookPrices = pricesFor(book.id);
                return (
                  <li key={book.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="h-16 w-11 border border-line object-cover" />
                        ) : (
                          <div className="flex h-16 w-11 items-center justify-center border border-dashed border-line text-[0.55rem] text-charcoal-soft">
                            —
                          </div>
                        )}
                        <div>
                          <p className="font-mono text-[0.7rem] tracking-[0.04em] text-charcoal-soft">
                            {book.book_code ?? "Pending"}
                          </p>
                          <p className="text-[0.92rem] text-navy">{book.title}</p>
                          <p className="text-[0.72rem] text-charcoal-soft">
                            {book.author_id ? authors.get(book.author_id) ?? "Unknown author" : "Unknown author"} ·{" "}
                            {formatLabel(book.status)}
                            {book.published_at ? ` · published ${formatDate(book.published_at)}` : ""}
                            {book.is_featured ? " · featured" : ""}
                          </p>
                          <p className="text-[0.72rem] text-charcoal-soft">
                            {bookPrices.map((price) => formatMoney(price.price_minor, price.currency)).join(" · ") ||
                              "No active price"}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={`/api/admin/book-file/${book.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[0.68rem] font-semibold tracking-[0.1em] text-charcoal-soft uppercase hover:text-navy"
                        >
                          File
                        </a>
                        {book.status === "published" && (
                          <Link
                            href={`/books/${book.slug}`}
                            className="text-[0.68rem] font-semibold tracking-[0.1em] text-charcoal-soft uppercase hover:text-navy"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <AdminForm
                        action={setPublicationAction}
                        submitLabel={book.status === "published" ? "Unpublish" : "Publish"}
                        variant={book.status === "published" ? "quiet" : "primary"}
                      >
                        <input type="hidden" name="book_id" value={book.id} />
                        <input type="hidden" name="publish" value={book.status === "published" ? "false" : "true"} />
                      </AdminForm>
                      <AdminForm
                        action={setFeaturedAction}
                        submitLabel={book.is_featured ? "Unfeature" : "Feature"}
                        variant="quiet"
                      >
                        <input type="hidden" name="kind" value="book" />
                        <input type="hidden" name="id" value={book.id} />
                        <input type="hidden" name="featured" value={book.is_featured ? "false" : "true"} />
                        <input name="rank" type="number" min="1" placeholder="Rank" className={adminField} />
                      </AdminForm>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
