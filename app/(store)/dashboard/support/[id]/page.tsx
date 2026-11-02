import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { ReplyForm } from "@/components/ticket-forms";
import { readerNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatLabel } from "@/lib/format";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireViewer("/dashboard/support");
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  if (!supabase) notFound();

  const [{ data: ticket }, { data: messages }] = await Promise.all([
    supabase.from("support_tickets").select("id, subject, status, category, created_at").eq("id", id).maybeSingle(),
    supabase
      .from("support_messages")
      .select("id, body, is_staff, created_at")
      .eq("ticket_id", id)
      .order("created_at"),
  ]);

  if (!ticket) notFound();

  return (
    <DashboardShell
      eyebrow="Support"
      title={ticket.subject}
      description={`${formatLabel(ticket.category)} · ${formatLabel(ticket.status)}`}
      sections={readerNav()}
    >
      <div className="space-y-5">
        <Panel>
          <ul className="space-y-4">
            {(messages ?? []).map((message) => (
              <li
                key={message.id}
                className={`border p-4 ${
                  message.is_staff ? "border-gold/50 bg-ivory" : "border-line bg-white"
                }`}
              >
                <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
                  {message.is_staff ? "INKFREEDOMPUBLISHING" : "You"}
                </p>
                <p className="mt-2 whitespace-pre-line text-[0.88rem] leading-relaxed text-charcoal">
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
          <ReplyForm ticketId={ticket.id} />
        </Panel>
        <Link
          href="/dashboard/support"
          className="inline-block text-[0.72rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase hover:text-navy"
        >
          ← All tickets
        </Link>
      </div>
    </DashboardShell>
  );
}
