import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { BookCover } from "@/components/book-cover";
import { loadLiveCatalogue } from "@/lib/catalogue-live";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your INKFREEDOMPUBLISHING reader or author account.",
};

const benefits = [
  "Track orders and download digital editions",
  "Save titles to a reading list",
  "Follow authors on the list",
  "Publish and sell your own eBooks",
];

export default async function SignInPage() {
  const shelf = (await loadLiveCatalogue()).slice(0, 3);

  return (
    <section className="container-editorial py-12 sm:py-20">
      <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
        <Link href="/" className="transition-colors hover:text-navy">
          Home
        </Link>
        <span aria-hidden="true" className="mx-2">
          /
        </span>
        <span className="text-navy">Sign in</span>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="eyebrow text-gold-deep">Your account</p>
          <h1 className="mt-4 font-display text-4xl leading-[1.06] text-navy sm:text-5xl">
            Welcome back
          </h1>
          <p className="mt-5 max-w-md text-[0.95rem] leading-relaxed text-charcoal-soft">
            Accounts hold your orders, your library, your reading list and — for
            authors — submissions, sales and royalty statements.
          </p>

          <ul className="mt-8 space-y-3">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 text-[0.9rem] text-charcoal">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold"
                />
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-10 hidden items-end gap-3 sm:flex">
            {shelf.map((book, index) => (
              <div
                key={book.slug}
                className={`w-20 ${index === 1 ? "-translate-y-3" : ""}`}
              >
                <BookCover book={book} decorative />
              </div>
            ))}
            <span className="ml-2 pb-1 text-[0.66rem] tracking-[0.14em] text-charcoal-soft uppercase">
              The catalogue
            </span>
          </div>
        </div>

        <div className="lg:col-span-7">
          <Suspense fallback={null}>
            <AuthForm />
          </Suspense>

          <div className="mt-5 border border-line bg-ivory p-5">
            <p className="eyebrow text-charcoal-soft">How accounts work</p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-charcoal-soft">
              Accounts run on Supabase Authentication. Reader accounts are
              created immediately, and you can open an author workspace from your
              dashboard whenever you like — choose a pen name and start
              uploading. Administrator access is granted only inside the
              database; no one can promote themselves from the browser.
            </p>
          </div>

          <p className="mt-6 text-[0.8rem] text-charcoal-soft">
            Just here to read?{" "}
            <Link
              href="/books"
              className="border-b border-gold/60 font-medium text-navy hover:border-navy"
            >
              Browse the catalogue
            </Link>{" "}
            — no account needed.
          </p>
        </div>
      </div>
    </section>
  );
}
