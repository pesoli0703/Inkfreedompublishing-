import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm } from "@/components/admin-form";
import { setReviewStatusAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function AdminReviewsPage() {
  await requireAdmin("/admin/reviews");
  const supabase = await createServerSupabaseClient();
  const { data: reviews } = supabase
    ? await supabase
        .from("reviews")
        .select("id, rating, title, body, status, created_at, books(title)")
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: null };

  return (
    <DashboardShell
      eyebrow="Operations"
      title="Reviews"
      description="Only verified purchasers can submit a review, and reviews stay pending until published here."
      sections={adminNav()}
    >
      <Panel title="Moderation queue">
        {(!reviews || reviews.length === 0) ? (
          <Empty title="No reviews submitted" />
        ) : (
          <ul className="divide-y divide-line">
            {reviews.map((review) => {
              const book = review.books as unknown as { title: string } | null;
              return (
                <li key={review.id} className="py-4">
                  <p className="text-[0.88rem] text-navy">
                    {review.rating}/5 · {book?.title ?? "Book"} · {formatLabel(review.status)}
                  </p>
                  <p className="text-[0.72rem] text-charcoal-soft">{formatDate(review.created_at)}</p>
                  {review.title && <p className="mt-1 text-[0.85rem] font-medium text-charcoal">{review.title}</p>}
                  {review.body && <p className="mt-1 text-[0.82rem] leading-relaxed text-charcoal-soft">{review.body}</p>}
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {(["published", "hidden", "pending"] as const).map((status) => (
                      <AdminForm
                        key={status}
                        action={setReviewStatusAction}
                        submitLabel={formatLabel(status)}
                        variant={status === "hidden" ? "danger" : "quiet"}
                      >
                        <input type="hidden" name="review_id" value={review.id} />
                        <input type="hidden" name="status" value={status} />
                      </AdminForm>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </DashboardShell>
  );
}
