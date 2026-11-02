import Link from "next/link";
import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { setTicketStatusAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function AdminSupportPage() {
  await requireAdmin("/admin/support");
  const supabase = await createServerSupabaseClient();
  const { data: tickets } = supabase
    ? await supabase
        .from("support_tickets")
        .select("id, subject, category, status, created_at, profiles(full_name, email)")
        .order("created_at", { ascending: false })
    : { data: null };

  const open = (tickets ?? []).filter((ticket) => ["open", "in_progress"].includes(ticket.status as string));

  return (
    <DashboardShell
      eyebrow="Operations"
      title="Support"
      description="Reader and author tickets. Replies are sent from the ticket thread and appear in the requester's dashboard immediately."
      sections={adminNav({ support: open.length })}
    >
      <Panel title={`${open.length} open of ${tickets?.length ?? 0}`}>
        {(!tickets || tickets.length === 0) ? (
          <Empty title="No tickets" />
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((ticket) => {
              const profile = ticket.profiles as unknown as { full_name: string | null; email: string } | null;
              return (
                <li key={ticket.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/support/${ticket.id}`} className="text-[0.9rem] text-navy hover:underline">
                      {ticket.subject}
                    </Link>
                    <span className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-charcoal-soft">
                      {formatLabel(ticket.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                    {profile?.full_name ?? "Reader"} · {profile?.email} · {formatLabel(ticket.category)} · {formatDate(ticket.created_at)}
                  </p>
                  <div className="mt-3 max-w-xs">
                    <AdminForm action={setTicketStatusAction} submitLabel="Update status" variant="quiet">
                      <input type="hidden" name="ticket_id" value={ticket.id} />
                      <select name="status" defaultValue={ticket.status as string} className={adminField}>
                        <option value="open">Open</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </AdminForm>
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
