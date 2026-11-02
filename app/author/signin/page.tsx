import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Author sign in",
  description: "Sign in to your INKFREEDOMPUBLISHING author dashboard.",
};

export default async function AuthorSignInPage() {
  const viewer = await getViewer();
  if (viewer) redirect("/author");

  return (
    <section className="container-editorial py-10 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow text-gold-deep">Author portal</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
            Welcome back
          </h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-charcoal-soft">
            Sign in to upload a book, check a review, see sales and request a
            withdrawal. New here?{" "}
            <Link href="/author/register" className="text-navy underline">
              Create an author account
            </Link>{" "}
            — it takes one step.
          </p>
        </div>

        <div className="lg:col-span-7">
          <Suspense fallback={<div className="h-64 border border-line bg-white" />}>
            <AuthForm initialMode="signin" defaultNext="/author" allowCreate={false} />
          </Suspense>
          <p className="mt-4 text-[0.75rem] text-charcoal-soft">
            Looking to buy books instead?{" "}
            <Link href="/signin" className="text-navy underline">
              Reader sign in
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
