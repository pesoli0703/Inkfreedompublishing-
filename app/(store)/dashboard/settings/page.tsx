import Link from "next/link";
import { DashboardShell, NotConfigured, Panel } from "@/components/dashboard-shell";
import { ProfileForm } from "@/components/profile-form";
import { readerNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const viewer = await requireViewer("/dashboard/settings");
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return (
      <DashboardShell eyebrow="Account" title="Settings" sections={readerNav()}>
        <NotConfigured what="Account settings" />
      </DashboardShell>
    );
  }

  const [{ data: profile }, { data: currencies }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, display_name, phone, country_code, preferred_currency, marketing_opt_in, role, created_at")
      .eq("id", viewer.id)
      .maybeSingle(),
    supabase
      .from("currencies")
      .select("code, name")
      .eq("is_enabled", true)
      .order("display_order"),
  ]);

  return (
    <DashboardShell
      eyebrow="Account"
      title="Settings"
      description="Your details, your currency preference and how we contact you."
      sections={readerNav()}
    >
      <div className="space-y-6">
        <Panel title="Profile">
          <ProfileForm
            profile={{
              full_name: profile?.full_name ?? null,
              display_name: profile?.display_name ?? null,
              phone: profile?.phone ?? null,
              country_code: profile?.country_code ?? null,
              preferred_currency: profile?.preferred_currency ?? "NGN",
              marketing_opt_in: profile?.marketing_opt_in ?? false,
            }}
            currencies={
              currencies?.map((c) => ({ code: c.code as string, name: c.name as string })) ?? [
                { code: "NGN", name: "Nigerian Naira" },
              ]
            }
          />
          <p className="mt-5 text-[0.75rem] leading-relaxed text-charcoal-soft">
            Email address changes and password changes are handled through the
            account recovery flow for security. Signed in as{" "}
            <span className="text-charcoal">{viewer.email}</span>.
          </p>
        </Panel>

        <Panel title="Security" tone="quiet">
          <ul className="space-y-3 text-[0.85rem] text-charcoal">
            <li>
              <Link href="/forgot-password" className="text-navy underline-offset-4 hover:underline">
                Change password
              </Link>{" "}
              — we send a reset link to your registered email.
            </li>
            <li>
              Account deletion and data export requests are handled by support
              within the periods described in the{" "}
              <Link href="/privacy" className="text-navy underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </li>
            <li>
              <Link href="/dashboard/support" className="text-navy underline-offset-4 hover:underline">
                Contact support
              </Link>{" "}
              for anything else.
            </li>
          </ul>
        </Panel>
      </div>
    </DashboardShell>
  );
}
