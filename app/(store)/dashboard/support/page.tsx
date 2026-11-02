import Link from "next/link";
import { DashboardShell, Empty, NotConfigured, Panel } from "@/components/dashboard-shell";
import { NewTicketForm } from "@/components/ticket-forms";
import { readerNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function SupportPage() {
  await requireViewer("/dashboard/support");
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <DashboardShell eyebrow="Support" title="Help" sections={readerNav()}>
        <NotConfigured what="Support" />
      </DashboardShell>
    );
  }

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("id, subject, status, category, created_at")
    .order("created_at", { ascending: false });

  return (
    <DashboardShell
      eyebrow="Support"
      title="Help and support"
      description="Open a ticket and reply in one place. Order, payment and download questions are answered by the same team that runs the store."
      sections={readerNav()}
    >
      <div className="space-y-6">
        <Panel title="Your tickets">
          {(!tickets || tickets.length === 0) ? (
            <Empty title="No tickets open">
              Nothing outstanding. Open a ticket below if something needs
              attention.
            </Empty>
          ) : (
            <ul className="divide-y divide-line">
              {tickets.map((ticket) => (
                <li key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <Link
                      href={`/dashboard/support/${ticket.id}`}
                      className="text-[0.92rem] text-navy hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <p className="mt-1 text-[0.72rem] text-charcoal-soft">
                      {formatLabel(ticket.status)} · opened {formatDate(ticket.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/support/${ticket.id}`}
                    className="text-[0.7rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep"
                  >
                    Open
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Open a new ticket">
          <NewTicketForm />
        </Panel>

        <Panel tone="quiet">
          <p className="text-[0.8rem] leading-relaxed text-charcoal-soft">
            For copyright complaints use the{" "}
            <Link href="/copyright" className="text-navy underline">
              notice and takedown
            </Link>{" "}
            form so the claim is recorded with the right details.
          </p>
        </Panel>
      </div>
    </DashboardShell>
  );
}
