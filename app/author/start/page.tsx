import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { BecomeAuthorForm } from "@/components/become-author-form";
import { authorNav } from "@/lib/nav";
import { requireAuthorArea } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Become an author",
  description:
    "Start selling your eBooks on INKFREEDOMPUBLISHING. No application fee, no publishing contract.",
};

export default async function BecomeAuthorPage() {
  const viewer = await requireAuthorArea("/author/start");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/signin");

  const { data: author } = await supabase
    .from("author_profiles")
    .select("id, status")
    .eq("user_id", viewer.id)
    .maybeSingle();

  // Already publishing: send them to their workspace rather than asking again.
  if (author && author.status === "approved") redirect("/author/books");

  if (author && author.status === "suspended") {
    return (
      <DashboardShell
        eyebrow="Publishing"
        title="Publishing is closed on this account"
        sections={authorNav()}
      >
        <Panel tone="warning" title="Account suspended">
          <p className="text-[0.88rem] leading-relaxed text-charcoal">
            This publishing account has been suspended. Contact support if you
            believe this is a mistake — the reason is recorded on your account.
          </p>
          <Link
            href="/dashboard/support"
            className="mt-4 inline-block text-[0.72rem] font-semibold tracking-[0.14em] text-navy uppercase hover:text-gold-deep"
          >
            Contact support →
          </Link>
        </Panel>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      eyebrow="Publishing"
      title="Become an author"
      description="You can start selling today. Choose the name that will appear on your books and your workspace opens immediately."
      sections={authorNav()}
    >
      <Panel title="Your author profile">
        <BecomeAuthorForm defaultName={viewer.fullName ?? undefined} />
      </Panel>
    </DashboardShell>
  );
}
