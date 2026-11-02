import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Admin sign in",
  description: "Authorised administrators only.",
  robots: { index: false, follow: false },
};

export default async function AdminSignInPage() {
  const viewer = await getViewer();
  if (viewer?.role === "admin") redirect("/admin");

  return (
    <section className="container-editorial py-12 sm:py-20">
      <div className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow text-gold-deep">Administration</p>
          <h1 className="mt-4 font-display text-3xl leading-tight text-navy sm:text-4xl">
            Administrator sign in
          </h1>
          <p className="mt-4 text-[0.9rem] leading-relaxed text-charcoal-soft">
            This console manages books, orders, payments and payouts. There is no
            self-service registration: administrator access is granted inside the
            database, never from the browser.
          </p>
          <p className="mt-4 text-[0.8rem] leading-relaxed text-charcoal-soft">
            Not an administrator?{" "}
            <Link href="/" className="text-navy underline">
              Return to the bookstore
            </Link>
            .
          </p>
        </div>

        <div className="lg:col-span-7">
          <Suspense fallback={<div className="h-64 border border-line bg-white" />}>
            <AuthForm initialMode="signin" defaultNext="/admin" allowCreate={false} />
          </Suspense>
          <p className="mt-4 border border-line bg-ivory px-4 py-3 text-[0.75rem] leading-relaxed text-charcoal-soft">
            Signing in here does not grant administrator rights. Only accounts
            whose role is already <span className="font-mono">admin</span> in the
            database can open any page under <span className="font-mono">/admin</span>.
          </p>
        </div>
      </div>
    </section>
  );
}
