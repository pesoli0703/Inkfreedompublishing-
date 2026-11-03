import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Administrator access required",
  robots: { index: false, follow: false },
};

/**
 * Where a signed-in non-administrator lands when they reach for /admin.
 *
 * This page exists because the previous behaviour — silently redirecting to the
 * reader dashboard — was indistinguishable from a broken link: you click Admin,
 * the URL changes to /dashboard, and nothing explains why. The rule has not
 * changed: administrator access is granted in the database, never here.
 */
export default async function AdminNoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/admin/signin?next=%2Fadmin");
  if (viewer.role === "admin") redirect("/admin");

  const { from } = await searchParams;
  const attempted = from && from.startsWith("/admin") ? from : "/admin";

  return (
    <section className="container-editorial py-12 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="eyebrow text-gold-deep">Administration</p>
        <h1 className="mt-4 font-display text-3xl leading-tight text-navy sm:text-4xl">
          This account is not an administrator
        </h1>

        <div className="mt-6 border border-line bg-ivory p-6">
          <p className="text-[0.9rem] leading-relaxed text-charcoal">
            You are signed in as{" "}
            <span className="font-mono text-[0.85rem] text-navy">{viewer.email}</span>, whose role
            is <span className="font-mono text-[0.85rem]">{viewer.role}</span>. Nothing is wrong
            with the link — reading{" "}
            <span className="font-mono text-[0.8rem]">{attempted}</span> requires the{" "}
            <span className="font-mono text-[0.85rem]">admin</span> role.
          </p>
          <p className="mt-3 text-[0.85rem] leading-relaxed text-charcoal-soft">
            Administrator rights are granted inside the database, never from a
            sign-in form. If this account should be an administrator, the role has
            to be changed there; if you have another account that already is one,
            sign out and use it.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.16em] text-ivory uppercase transition-colors hover:bg-navy-soft"
            >
              Sign out and use another account
            </button>
          </form>
          <Link
            href="/dashboard"
            className="border border-line px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.16em] text-navy uppercase transition-colors hover:border-navy"
          >
            Go to my reader dashboard
          </Link>
          <Link
            href="/"
            className="text-[0.72rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase hover:text-navy"
          >
            Bookstore
          </Link>
        </div>
      </div>
    </section>
  );
}
