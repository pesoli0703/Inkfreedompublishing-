import Link from "next/link";
import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { moderateBookAction, setPublicationAction, setFeaturedAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function AdminBooksPage() {
  await requireAdmin("/admin/books");
  const supabase = await createServerSupabaseClient();
  const { data: books } = supabase
    ? await supabase
        .from("books")
        .select("id, title, slug, status, submitted_at, review_note, is_featured, published_at, author_profiles(pen_name)")
        .order("submitted_at", { ascending: false, nullsFirst: false })
    : { data: null };

  const pending = (books ?? []).filter((book) => book.status === "submitted");
  const inCatalogue = (books ?? []).filter((book) => ["approved", "published", "unpublished"].includes(book.status as string));

  return (
    <DashboardShell
      eyebrow="Catalogue"
      title="Submissions & books"
      description="Review submissions, approve or request changes with a note, then publish. Every action is written to the moderation and audit logs."
      sections={adminNav({ submissions: pending.length })}
    >
      <div className="space-y-6">
        <Panel title={`Awaiting review (${pending.length})`}>
          {pending.length === 0 ? (
            <Empty title="Nothing awaiting review" />
          ) : (
            <ul className="space-y-6">
              {pending.map((book) => {
                const author = book.author_profiles as unknown as { pen_name: string } | null;
                return (
                  <li key={book.id} className="border border-line p-5">
                    <p className="font-display text-lg text-navy">{book.title}</p>
                    <p className="text-[0.75rem] text-charcoal-soft">
                      {author?.pen_name ?? "Unknown author"} · submitted {formatDate(book.submitted_at)}
                    </p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <AdminForm action={moderateBookAction} submitLabel="Approve">
                        <input type="hidden" name="book_id" value={book.id} />
                        <input type="hidden" name="decision" value="approved" />
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

        <Panel title="Catalogue and approved titles">
          {inCatalogue.length === 0 ? (
            <Empty title="No approved books yet" />
          ) : (
            <ul className="divide-y divide-line">
              {inCatalogue.map((book) => (
                <li key={book.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[0.92rem] text-navy">{book.title}</p>
                      <p className="text-[0.72rem] text-charcoal-soft">
                        {formatLabel(book.status)}
                        {book.published_at ? ` · published ${formatDate(book.published_at)}` : ""}
                        {book.is_featured ? " · featured" : ""}
                      </p>
                    </div>
                    <Link href={`/books/${book.slug}`} className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal-soft hover:text-navy">
                      View
                    </Link>
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
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
