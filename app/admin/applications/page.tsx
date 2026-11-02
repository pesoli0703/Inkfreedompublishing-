import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { decideApplicationAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function ApplicationsPage() {
  await requireAdmin("/admin/applications");
  const supabase = await createServerSupabaseClient();
  const { data: applications } = supabase
    ? await supabase
        .from("author_applications")
        .select("id, full_name, pen_name, email, biography, country_code, publishing_interests, submitted_at, status, decision_note, decided_at")
        .order("submitted_at", { ascending: false })
    : { data: null };

  const pending = (applications ?? []).filter((application) => application.status === "pending");
  const decided = (applications ?? []).filter((application) => application.status !== "pending");

  return (
    <DashboardShell
      eyebrow="Catalogue"
      title="Author applications"
      description="Approve or reject with a note. Approving creates the author profile and gives the account author access; nobody can do this themselves."
      sections={adminNav({ applications: pending.length })}
    >
      <div className="space-y-6">
        <Panel title={`Pending (${pending.length})`}>
          {pending.length === 0 ? (
            <Empty title="Nothing waiting" />
          ) : (
            <ul className="space-y-6">
              {pending.map((application) => (
                <li key={application.id} className="border border-line p-5">
                  <div>
                    <p className="font-display text-lg text-navy">{application.pen_name}</p>
                    <p className="text-[0.75rem] text-charcoal-soft">
                      {application.full_name} · {application.email} · {application.country_code} · submitted {formatDate(application.submitted_at)}
                    </p>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-[0.85rem] leading-relaxed text-charcoal">{application.biography}</p>
                  {application.publishing_interests && application.publishing_interests.length > 0 && (
                    <p className="mt-2 text-[0.75rem] text-charcoal-soft">
                      Interests: {application.publishing_interests.join(", ")}
                    </p>
                  )}
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <AdminForm action={decideApplicationAction} submitLabel="Approve">
                      <input type="hidden" name="application_id" value={application.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <textarea name="note" required rows={2} placeholder="Approval note (required)" className={adminField} />
                    </AdminForm>
                    <AdminForm action={decideApplicationAction} submitLabel="Reject" variant="danger">
                      <input type="hidden" name="application_id" value={application.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <textarea name="note" required rows={2} placeholder="Reason (required, shown to the applicant)" className={adminField} />
                    </AdminForm>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Decided">
          {decided.length === 0 ? (
            <Empty title="No decisions yet" />
          ) : (
            <ul className="divide-y divide-line">
              {decided.map((application) => (
                <li key={application.id} className="py-3 text-[0.85rem]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-navy">{application.pen_name}</span>
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal-soft">
                      {formatLabel(application.status)} · {formatDate(application.decided_at)}
                    </span>
                  </div>
                  {application.decision_note && (
                    <p className="mt-1 text-[0.78rem] text-charcoal-soft">{application.decision_note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
