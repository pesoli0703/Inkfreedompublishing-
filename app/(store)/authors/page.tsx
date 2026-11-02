import type { Metadata } from "next";
import Link from "next/link";
import { AuthorCard } from "@/components/author-card";
import { loadLiveAuthors } from "@/lib/catalogue-live";

export const metadata: Metadata = {
  title: "Authors",
  description: "The authors published by INKFREEDOMPUBLISHING.",
};

export const revalidate = 300;

export default async function AuthorsPage() {
  const authors = await loadLiveAuthors();

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
            Writers who publish with us. Profiles are written by the authors
            themselves and appear once they have opened their author workspace.
          </p>
        </div>
      </section>

      <section className="container-editorial py-14 sm:py-20">
        {authors.length === 0 ? (
          <div className="border border-line bg-white px-6 py-16 text-center">
            <p className="font-display text-2xl text-navy">No authors yet</p>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-charcoal-soft">
              Author profiles appear here with their first title. The list is
              open to anyone — there is no application to wait on.
            </p>
            <Link
              href="/author"
              className="mt-7 inline-flex bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
            >
              Become an author
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <AuthorCard key={author.slug} author={author} />
            ))}
          </div>
        )}

        <div className="mt-14 flex flex-col items-start justify-between gap-6 border border-line bg-white p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="font-display text-2xl text-navy">
              Want to join the list?
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-charcoal-soft">
              Create an account, choose a pen name and your workspace opens
              immediately. Upload your eBook, set your price and submit it — an
              editor reviews every title before it goes on sale.
            </p>
          </div>
          <Link
            href="/author"
            className="shrink-0 bg-navy px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
          >
            Start publishing
          </Link>
        </div>
      </section>
    </>
  );
}
