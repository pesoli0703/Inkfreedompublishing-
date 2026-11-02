import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { resolveCopyrightAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function AdminCopyrightPage() {
  await requireAdmin("/admin/copyright");
  const supabase = await createServerSupabaseClient();
  const { data: reports } = supabase
    ? await supabase
        .from("copyright_reports")
        .select("id, reporter_name, reporter_email, claimant, claim, status, resolution, created_at, books(title, slug)")
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <DashboardShell
      eyebrow="Operations"
      title="Copyright complaints"
      description="Notices are recorded with the claimant, the claim and the title. Actioning a notice is a manual editorial decision; nothing is removed automatically."
      sections={adminNav()}
    >
      <Panel title={`${reports?.length ?? 0} notices`}>
        {(!reports || reports.length === 0) ? (
          <Empty title="No notices received" />
        ) : (
          <ul className="space-y-6">
            {reports.map((report) => {
              const book = report.books as unknown as { title: string; slug: string } | null;
              const open = ["received", "under_review"].includes(report.status as string);
              return (
                <li key={report.id} className="border border-line p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.9rem] text-navy">{book?.title ?? "Unlinked title"}</p>
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal-soft">
                      {formatLabel(report.status)} · {formatDate(report.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-[0.78rem] text-charcoal-soft">
                    Claimant: {report.claimant} · Reported by {report.reporter_name} ({report.reporter_email})
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[0.85rem] leading-relaxed text-charcoal">{report.claim}</p>
                  {report.resolution && (
                    <p className="mt-3 border-l-2 border-gold/60 pl-3 text-[0.82rem] text-charcoal">{report.resolution}</p>
                  )}
                  {open && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <AdminForm action={resolveCopyrightAction} submitLabel="Mark under review" variant="quiet">
                        <input type="hidden" name="report_id" value={report.id} />
                        <input type="hidden" name="status" value="under_review" />
                        <input name="resolution" required placeholder="What is being checked" className={adminField} />
                      </AdminForm>
                      <AdminForm action={resolveCopyrightAction} submitLabel="Action notice" variant="danger">
                        <input type="hidden" name="report_id" value={report.id} />
                        <input type="hidden" name="status" value="actioned" />
                        <input name="resolution" required placeholder="Action taken (e.g. title unpublished)" className={adminField} />
                      </AdminForm>
                      <AdminForm action={resolveCopyrightAction} submitLabel="Dismiss" variant="quiet">
                        <input type="hidden" name="report_id" value={report.id} />
                        <input type="hidden" name="status" value="dismissed" />
                        <input name="resolution" required placeholder="Why the notice is dismissed" className={adminField} />
                      </AdminForm>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </DashboardShell>
  );
}
