import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorRegisterForm } from "@/components/author-register-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create an author account",
  description:
    "Open an author workspace on INKFREEDOMPUBLISHING and publish an eBook today — no application, no publishing contract.",
};

export default async function AuthorRegisterPage() {
  const viewer = await getViewer();
  // Signed in already: finish enrolment rather than creating a second account.
  if (viewer) redirect("/author/start");

  return (
    <section className="container-editorial py-10 sm:py-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow text-gold-deep">Author portal</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
            Open your author workspace
          </h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-charcoal-soft">
            One email, one password, one pen name. Your dashboard opens
            immediately — upload a book, set the price and submit it for review.
            There is no application to be accepted by and no publishing contract
            to sign.
          </p>

          <ol className="mt-8 space-y-5">
            {[
              ["Register", "An email address and a password. Nothing to submit."],
              ["Upload", "PDF or EPUB, plus a cover. Files stay private until a reader buys."],
              ["Set the price", "One Naira price; the storefront converts it for other currencies."],
              ["Submit", "An administrator reads it, then it goes on sale. You keep 90%."],
            ].map(([title, body], index) => (
              <li key={title} className="flex gap-4">
                <span className="mt-0.5 font-display text-lg text-gold-deep">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-[0.9rem] font-medium text-navy">{title}</p>
                  <p className="mt-1 text-[0.85rem] leading-relaxed text-charcoal-soft">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-7">
          <div className="border border-line bg-ivory p-6 sm:p-8">
            <h2 className="font-display text-2xl text-navy">Create your account</h2>
            <p className="mt-2 mb-6 text-[0.82rem] leading-relaxed text-charcoal-soft">
              Already have a reader or author account?{" "}
              <Link href="/author/signin" className="text-navy underline">
                Sign in here
              </Link>
              .
            </p>
            <AuthorRegisterForm />
          </div>
        </div>
      </div>
    </section>
  );
}
