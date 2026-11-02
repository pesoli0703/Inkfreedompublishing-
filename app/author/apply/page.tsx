import Link from "next/link";
import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { AuthorApplicationForm } from "@/components/author-application-form";
import { authorNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function AuthorApplyPage() {
  const viewer = await requireViewer("/author/apply");
  const supabase = await createServerSupabaseClient();

  const { data: applications } = supabase
    ? await supabase
        .from("author_applications")
        .select("id, status, pen_name, submitted_at, decided_at, decision_note")
        .order("created_at", { ascending: false })
    : { data: null };

  const pending = applications?.find((application) => application.status === "pending");
  const latest = applications?.[0];

  return (
    <DashboardShell
      eyebrow="Publishing"
      title="Author application"
      description="Authorship is granted by review, never by request. A reviewer reads every application and records a decision note you can see here."
      sections={authorNav()}
    >
      <div className="space-y-6">
        {latest && (
          <Panel title="Your applications" tone="quiet">
            <ul className="divide-y divide-line">
              {(applications ?? []).map((application) => (
                <li key={application.id} className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[0.9rem] text-navy">{application.pen_name}</p>
                    <span className="text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-charcoal-soft">
                      {formatLabel(application.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                    Submitted {formatDate(application.submitted_at)}
                    {application.decided_at ? ` · decided ${formatDate(application.decided_at)}` : ""}
                  </p>
                  {application.decision_note && (
                    <p className="mt-2 border-l-2 border-gold/60 pl-3 text-[0.82rem] leading-relaxed text-charcoal">
                      {application.decision_note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {pending ? (
          <Panel tone="warning">
            <p className="eyebrow text-charcoal-soft">In review</p>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-charcoal">
              Your application is with the editorial team. You will see the
              decision here, and in your notifications, once it is made. You can
              keep buying books in the meantime.
            </p>
            <Link href="/dashboard" className="mt-5 inline-block text-[0.72rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep">
              Back to reader dashboard
            </Link>
          </Panel>
        ) : (
          <Panel title={latest ? "Apply again" : "New application"}>
            <AuthorApplicationForm />
          </Panel>
        )}

        <Panel tone="quiet">
          <p className="text-[0.8rem] leading-relaxed text-charcoal-soft">
            Signed in as <span className="text-charcoal">{viewer.email}</span>.
            Your email is taken from the account and cannot be edited here.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}
