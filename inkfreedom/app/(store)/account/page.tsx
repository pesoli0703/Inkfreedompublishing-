import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account-shell";
import { PasswordForm, ProfileForm } from "@/components/account-forms";
import { Badge } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { becomeAuthorAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountPage() {
  const viewer = await requireViewer("/account");
  const { profile } = viewer;

  return (
    <AccountShell
      eyebrow="Your account"
      title="Account settings"
      description="The details attached to your library and your purchases."
      aside={<Badge tone={profile.role === "admin" ? "ember" : "ink"}>{profile.role}</Badge>}
    >
      <div className="space-y-12">
        <section>
          <h2 className="font-display text-[1.35rem] text-ink">Profile</h2>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            Member since {formatDate(profile.created_at)}.
          </p>
          <div className="mt-5">
            <ProfileForm
              fullName={profile.full_name ?? ""}
              email={profile.email}
            />
          </div>
        </section>

        <section className="border-t border-line pt-10">
          <h2 className="font-display text-[1.35rem] text-ink">Password</h2>
          <p className="mt-1 text-[0.82rem] text-ink-muted">
            Choose something long. There is no second factor on this build yet.
          </p>
          <div className="mt-5">
            <PasswordForm />
          </div>
        </section>

        {profile.role === "reader" ? (
          <section className="border-t border-line pt-10">
            <h2 className="font-display text-[1.35rem] text-ink">Publish your own work</h2>
            <p className="mt-1 max-w-lg text-[0.82rem] leading-relaxed text-ink-muted">
              Add an author studio to this account. You keep your library, and gain a
              public author page, upload tools and royalty tracking.
            </p>
            <form action={becomeAuthorAction} className="mt-5">
              <button type="submit" className="btn btn-ember">
                Become an author
              </button>
            </form>
          </section>
        ) : (
          <section className="border-t border-line pt-10">
            <h2 className="font-display text-[1.35rem] text-ink">
              {profile.role === "admin" ? "Editorial console" : "Author studio"}
            </h2>
            <p className="mt-1 text-[0.82rem] text-ink-muted">
              {profile.role === "admin"
                ? "Review listings, watch the ledger and settle royalties."
                : "Upload editions, track sales and request payouts."}
            </p>
            <Link
              href={profile.role === "admin" ? "/admin" : "/studio"}
              className="btn btn-quiet mt-5"
            >
              Open {profile.role === "admin" ? "the console" : "the studio"}
            </Link>
          </section>
        )}
      </div>
    </AccountShell>
  );
}
