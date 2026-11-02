import Link from "next/link";
import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { moderateBookAction, setPublicationAction, setFeaturedAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { ebookKindLabel } from "@/lib/ebooks";

type Author = { pen_name: string | null; slug: string | null };
type Format = { id: string; format: string };
type Price = { book_format_id: string; currency: string; price_minor: number };
type File = {
  id: string;
  kind: string;
  size_bytes: number;
  is_current: boolean;
  created_at: string;
  scan_status: string;
};
type Category = { name: string } | null;

const coverUrl = (path: string | null) =>
  path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-covers/${path}`
    : null;

export default async function AdminBooksPage() {
  await requireAdmin("/admin/books");
  const supabase = await createServerSupabaseClient();
  const { data: books } = supabase
    ? await supabase
        .from("books")
        .select(
          "id, book_code, title, slug, status, submitted_at, review_note, is_featured, published_at, cover_path, description_paragraphs, author_profiles(pen_name, slug), categories(name), book_formats(id, format), book_files(id, kind, size_bytes, is_current, created_at, scan_status)",
        )
        .order("submitted_at", { ascending: false, nullsFirst: false })
    : { data: null };

  const bookIds = (books ?? []).map((book) => book.id);
  const { data: prices } = supabase && bookIds.length > 0
    ? await supabase
        .from("book_prices")
        .select("book_format_id, currency, price_minor")
        .in("book_format_id",
          (books ?? []).flatMap((book) =>
            ((book.book_formats ?? []) as Format[]).map((format) => format.id),
          ),
        )
        .eq("is_active", true)
    : { data: null };

  const priceList = (prices ?? []) as Price[];
  const priceFor = (formats: Format[]) => {
    const ids = new Set(formats.map((format) => format.id));
    return priceList.filter((price) => ids.has(price.book_format_id));
  };

  const pending = (books ?? []).filter((book) => book.status === "submitted");
  const inCatalogue = (books ?? []).filter((book) =>
    ["approved", "published", "unpublished"].includes(book.status as string),
  );

  return (
    <DashboardShell
      eyebrow="Catalogue"
      title="eBook submissions"
      description="Read each submitted eBook, approve or request changes with a note, then publish. Every action is written to the moderation and audit logs."
      sections={adminNav({ submissions: pending.length })}
    >
      <div className="space-y-6">
        <Panel title={`Awaiting review (${pending.length})`}>
          {pending.length === 0 ? (
            <Empty title="Nothing awaiting review">
              eBooks an author submits appear here with their cover, details and
              the uploaded file.
            </Empty>
          ) : (
            <ul className="space-y-6">
              {pending.map((book) => {
                const author = book.author_profiles as unknown as Author | null;
                const formats = (book.book_formats ?? []) as Format[];
                const files = ((book.book_files ?? []) as File[]).filter(
                  (file) => ["ebook", "pdf"].includes(file.kind) && file.is_current,
                );
                const cover = coverUrl(book.cover_path);
                const category = book.categories as unknown as Category;
                const paragraphs = (book.description_paragraphs ?? []) as string[];

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
                          {author?.pen_name ?? "Unknown author"} · submitted {formatDate(book.submitted_at)}
                          {category?.name ? ` · ${category.name}` : ""}
                        </p>

                        <ul className="mt-3 space-y-1 text-[0.78rem] text-charcoal">
                          {priceFor(formats).map((price) => (
                            <li key={`${price.book_format_id}-${price.currency}`}>
                              eBook · {formatMoney(price.price_minor, price.currency)}
                              {price.currency === "NGN" ? " (base)" : ""}
                            </li>
                          ))}
                          {priceFor(formats).length === 0 && (
                            <li className="text-gold-deep">No active price — cannot be sold yet.</li>
                          )}
                        </ul>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-[0.75rem]">
                          {files.length > 0 ? (
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
                                {files
                                  .map(
                                    (file) =>
                                      `${ebookKindLabel(file.kind)} · ${(file.size_bytes / 1024 / 1024).toFixed(1)} MB`,
                                  )
                                  .join(" / ")}
                              </span>
                              {files.some((file) => file.scan_status === "failed") && (
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
                const author = book.author_profiles as unknown as Author | null;
                const formats = (book.book_formats ?? []) as Format[];
                const cover = coverUrl(book.cover_path);
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
                            {author?.pen_name ?? "Unknown author"} · {formatLabel(book.status)}
                            {book.published_at ? ` · published ${formatDate(book.published_at)}` : ""}
                            {book.is_featured ? " · featured" : ""}
                          </p>
                          <p className="text-[0.72rem] text-charcoal-soft">
                            {priceFor(formats)
                              .map((price) => formatMoney(price.price_minor, price.currency))
                              .join(" · ") || "No active price"}
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
