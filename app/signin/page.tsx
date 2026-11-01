import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/sign-in-form";
import { books } from "@/lib/data/books";
import { BookCover } from "@/components/book-cover";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Reader and author accounts for INKFREEDOMPUBLISHING — accounts are not connected in this preview build.",
};

const benefits = [
  "Track orders and download digital editions",
  "Save titles to a reading list",
  "Follow authors on the list",
  "Access the author dashboard for submissions",
];

export default function SignInPage() {
  const shelf = books.slice(0, 3);

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
            Accounts will hold your orders, your reading list and — for authors
            — your submissions and royalty statements.
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
          <SignInForm />

          <div className="mt-5 border border-line bg-ivory p-5">
            <p className="eyebrow text-charcoal-soft">Not connected yet</p>
            <p className="mt-2 text-[0.8rem] leading-relaxed text-charcoal-soft">
              Authentication will run on Supabase. It has not been connected for
              this build, so signing in is not possible yet — the form above is
              here so the flow can be reviewed. No credentials are transmitted or
              stored.
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
