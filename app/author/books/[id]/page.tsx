import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { BookFileForm } from "@/components/book-file-form";
import { CoverUploadForm } from "@/components/cover-upload-form";
import { EditBookForm, type EditableBook } from "@/components/edit-book-form";
import { SubmitBookButton } from "@/components/submit-book-button";
import { authorNav } from "@/lib/nav";
import { requireAuthorArea } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel, formatMoney } from "@/lib/format";
import { ebookKindLabel } from "@/lib/ebooks";

export default async function AuthorBookPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuthorArea("/author/books");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const { data: book } = await supabase
    .from("books")
    .select(
      "id, book_code, title, slug, status, description_paragraphs, primary_category_id, submitted_at, reviewed_at, review_note, published_at, cover_path, rights_declared_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (!book) notFound();

  const [
    { data: files },
    { data: formats },
    { data: events },
    { data: prices },
    { data: categories },
  ] = await Promise.all([
    supabase.from("book_files").select("id, kind, storage_bucket, size_bytes, is_current, created_at").eq("book_id", id).order("created_at", { ascending: false }),
    supabase.from("book_formats").select("id, is_available").eq("book_id", id).eq("format", "ebook"),
    supabase.from("book_moderation_events").select("id, from_status, to_status, action, note, created_at").eq("book_id", id).order("created_at", { ascending: false }),
    supabase.from("book_prices").select("book_format_id, currency, price_minor, is_active").eq("is_active", true),
    supabase.from("categories").select("id, name, section").eq("is_active", true).order("sort_order"),
  ]);

  const formatIds = new Set((formats ?? []).map((format) => format.id));
  const relevantPrices = (prices ?? []).filter((price) => formatIds.has(price.book_format_id));
  const coverUrl = book.cover_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/book-covers/${book.cover_path}` : null;
  const canSubmit = ["draft", "changes_requested"].includes(book.status as string);

  const ngnPrice = relevantPrices.find((price) => price.currency === "NGN");

  const editableBook: EditableBook = {
    id: book.id,
    title: book.title,
    categoryId: book.primary_category_id,
    description: book.description_paragraphs ?? [],
    priceMajor: ngnPrice ? Number(ngnPrice.price_minor) / 100 : null,
    coverPath: book.cover_path,
  };

  const digitalFiles = (files ?? []).filter((file) =>
    ["ebook", "pdf"].includes(String(file.kind)),
  );
  const hasFile = digitalFiles.some((file) => file.is_current);

  return (
    <DashboardShell
      eyebrow={formatLabel(book.status)}
      title={book.title}
      description="eBook"
      sections={authorNav()}
      aside={
        canSubmit ? (
          <SubmitBookButton
            bookId={book.id}
            label={book.status === "changes_requested" ? "Resubmit for review" : "Submit for review"}
            disabled={!hasFile}
            disabledReason="Attach a PDF or EPUB below before submitting."
          />
        ) : (
          <Link href="/author/books" className="text-[0.72rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase hover:text-navy">
            ← All eBooks
          </Link>
        )
      }
    >
      <div className="space-y-6">
        {book.review_note && (
          <Panel tone="warning" title="Editor's note">
            <p className="text-[0.88rem] leading-relaxed text-charcoal">{book.review_note}</p>
            <p className="mt-2 text-[0.72rem] text-charcoal-soft">
              Reviewed {formatDate(book.reviewed_at)}. Address the note, then resubmit.
            </p>
          </Panel>
        )}

        {canSubmit && (
          <Panel title="Edit this book" tone="quiet">
            <p className="mb-5 text-[0.82rem] leading-relaxed text-charcoal-soft">
              Everything here can still be changed until an editor approves the
              book. Save your changes, then submit for review when it is ready.
            </p>
            <EditBookForm book={editableBook} categories={categories ?? []} />
          </Panel>
        )}

        <Panel title="Cover and details">
          <div className="flex flex-wrap gap-6">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="h-40 w-28 border border-line object-cover" />
            ) : (
              <div className="flex h-40 w-28 items-center justify-center border border-dashed border-line text-[0.7rem] text-charcoal-soft">
                No cover
              </div>
            )}
            <dl className="space-y-2 text-[0.82rem] text-charcoal">
              <div>
                <dt className="inline text-charcoal-soft">Book ID: </dt>
                <dd className="inline font-mono text-navy">{book.book_code ?? "Pending"}</dd>
              </div>
              <div>
                <dt className="inline text-charcoal-soft">Slug: </dt>
                <dd className="inline font-mono">{book.slug}</dd>
              </div>
              <div>
                <dt className="inline text-charcoal-soft">Rights declared: </dt>
                <dd className="inline">{book.rights_declared_at ? formatDate(book.rights_declared_at) : "Not yet"}</dd>
              </div>
              <div>
                <dt className="inline text-charcoal-soft">Submitted: </dt>
                <dd className="inline">{book.submitted_at ? formatDate(book.submitted_at) : "—"}</dd>
              </div>
              <div>
                <dt className="inline text-charcoal-soft">Published: </dt>
                <dd className="inline">{book.published_at ? formatDate(book.published_at) : "—"}</dd>
              </div>
            </dl>
          </div>
          <CoverUploadForm bookId={book.id} />
        </Panel>

        <Panel title="Price">
          {relevantPrices.length === 0 ? (
            <p className="text-[0.85rem] text-charcoal-soft">
              No active price. Set an NGN price before submitting.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {relevantPrices.map((price) => (
                <li
                  key={`${price.book_format_id}-${price.currency}`}
                  className="flex items-center justify-between py-2 text-[0.85rem]"
                >
                  <span className="text-charcoal">
                    eBook · {price.currency === "NGN" ? "base price" : "converted"}
                  </span>
                  <span className="text-navy">
                    {formatMoney(price.price_minor, price.currency as string)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
            Your NGN price is the base. Readers in other currencies see it
            converted with the platform FX table, and an administrator can set an
            override with a recorded reason.
          </p>
        </Panel>

        <Panel title="eBook file">
          {!hasFile && (
            <p className="mb-4 border border-gold/60 bg-ivory px-4 py-3 text-[0.8rem] text-charcoal">
              No eBook file yet. A PDF or EPUB is required before this can be
              submitted for approval.
            </p>
          )}
          <ul className="mb-5 divide-y divide-line">
            {digitalFiles.length === 0 ? (
              <li className="py-3 text-[0.85rem] text-charcoal-soft">
                No file uploaded yet.
              </li>
            ) : (
              digitalFiles.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[0.82rem]">
                  <span className="text-charcoal">
                    {ebookKindLabel(String(file.kind))} · {(file.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <span className="text-[0.7rem] text-charcoal-soft">
                    {file.is_current ? "current" : "superseded"} · {formatDate(file.created_at)}
                  </span>
                </li>
              ))
            )}
          </ul>
          <BookFileForm bookId={book.id} />
          <p className="mt-4 text-[0.75rem] leading-relaxed text-charcoal-soft">
            The file lives in a private bucket. Readers only ever receive a
            short-lived signed link after a verified purchase — never a permanent
            public URL.
          </p>
        </Panel>

        <Panel title="Moderation history" tone="quiet">
          {(events ?? []).length === 0 ? (
            <p className="text-[0.85rem] text-charcoal-soft">Nothing recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {(events ?? []).map((event) => (
                <li key={event.id} className="text-[0.82rem] text-charcoal">
                  <span className="font-medium">{formatLabel(event.action)}</span>{" "}
                  <span className="text-charcoal-soft">
                    {event.from_status ? `${formatLabel(event.from_status)} → ` : ""}
                    {formatLabel(event.to_status)} · {formatDate(event.created_at)}
                  </span>
                  {event.note && <p className="mt-1 text-[0.78rem] text-charcoal-soft">{event.note}</p>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
