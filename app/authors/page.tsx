import type { Metadata } from "next";
import Link from "next/link";
import { AuthorCard } from "@/components/author-card";
import { authors } from "@/lib/data/authors";

export const metadata: Metadata = {
  title: "Authors",
  description:
    "The authors on the INKFREEDOMPUBLISHING list. Sample profiles for the preview build.",
};

export default function AuthorsPage() {
  return (
    <>
      <section className="border-b border-line bg-white paper-texture">
        <div className="container-editorial py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
            <Link href="/" className="transition-colors hover:text-navy">
              Home
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span className="text-navy">Authors</span>
          </nav>

          <p className="eyebrow mt-6 text-gold-deep">Our authors</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
            The people on the list
          </h1>
          <p className="mt-5 max-w-2xl text-[0.97rem] leading-relaxed text-charcoal-soft">
            A small, hand-edited list of writers. These profiles are placeholders
            created for the preview build and will be replaced with real author
            biographies, photographs and titles.
          </p>
        </div>
      </section>

      <section className="container-editorial py-14 sm:py-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {authors.map((author) => (
            <AuthorCard key={author.slug} author={author} />
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border border-line bg-white p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl text-navy">
              Want to join the list?
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-charcoal-soft">
              We read every submission. Send a proposal, a synopsis and a sample
              chapter to start the conversation.
            </p>
          </div>
          <Link
            href="/publish#submit"
            className="shrink-0 bg-navy px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
          >
            Submit a manuscript
          </Link>
        </div>
      </section>
    </>
  );
}
