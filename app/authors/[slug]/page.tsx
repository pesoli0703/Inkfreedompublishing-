import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookGrid } from "@/components/book-card";
import { authors, getAuthor } from "@/lib/data/authors";
import { booksByAuthor } from "@/lib/catalogue";

type Params = { slug: string };

export function generateStaticParams() {
  return authors.map((author) => ({ slug: author.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) return { title: "Author not found" };
  return {
    title: author.name,
    description: `${author.tagline}. ${author.writingIn}, based in ${author.based}.`,
  };
}

export default async function AuthorPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const author = getAuthor(slug);
  if (!author) notFound();

  const titles = booksByAuthor(author.slug);

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
            <Link href="/authors" className="transition-colors hover:text-navy">
              Authors
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span className="text-navy">{author.name}</span>
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-7">
              <p className="eyebrow text-gold-deep">{author.writingIn}</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.05] text-navy sm:text-5xl">
                {author.name}
              </h1>
              <p className="mt-4 font-display text-xl leading-snug text-charcoal-soft italic">
                {author.tagline}
              </p>

              <div className="mt-7 space-y-4 text-[0.95rem] leading-relaxed text-charcoal-soft">
                {author.bio.map((paragraph) => (
                  <p key={paragraph.slice(0, 28)}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="border border-line bg-ivory p-7">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/50 font-display text-xl text-gold-deep"
                  >
                    {author.initials}
                  </span>
                  <div>
                    <p className="eyebrow text-charcoal-soft">Based in</p>
                    <p className="mt-1 text-sm text-navy">{author.based}</p>
                  </div>
                </div>

                <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-charcoal-soft">Writes</dt>
                    <dd className="text-right text-navy">{author.writingIn}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-charcoal-soft">Titles on the list</dt>
                    <dd className="text-navy">{titles.length}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-charcoal-soft">Profile status</dt>
                    <dd className="text-right text-charcoal-soft">
                      Placeholder
                    </dd>
                  </div>
                </dl>

                <p className="mt-6 border-t border-line pt-4 text-[0.72rem] leading-relaxed text-charcoal-soft">
                  This is a fictional profile for the preview build. No awards,
                  sales figures or press coverage are claimed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-editorial py-14 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
          <h2 className="font-display text-2xl text-navy sm:text-3xl">
            Books by {author.name}
          </h2>
          <Link
            href="/books"
            className="text-[0.7rem] font-semibold tracking-[0.16em] text-gold-deep uppercase hover:text-navy"
          >
            All books →
          </Link>
        </div>
        <BookGrid books={titles} className="mt-10" />
      </section>
    </>
  );
}
