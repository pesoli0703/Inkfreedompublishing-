import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { BookGrid } from "@/components/book-card";
import { AuthorCard } from "@/components/author-card";
import { SearchBar } from "@/components/search-bar";
import { SectionHeading } from "@/components/section-heading";
import { NewsletterForm } from "@/components/newsletter-form";
import { loadCategories, loadLiveAuthors, loadLiveCatalogue } from "@/lib/catalogue-live";
import { formatPrice } from "@/lib/format";

const publishingSteps = [
  {
    number: "01",
    title: "Send your manuscript",
    body: "A short proposal, a synopsis and a sample chapter is enough to begin. We reply to every submission, whether or not we take it forward.",
  },
  {
    number: "02",
    title: "Editorial review",
    body: "We read for fit with the list, then look at structure, line and title. If the book needs work, we say so before anyone signs anything.",
  },
  {
    number: "03",
    title: "Design & production",
    body: "Cover, typesetting and proof rounds are handled in-house so the book looks like it belongs with the rest of the catalogue.",
  },
  {
    number: "04",
    title: "Publication & sales",
    body: "We prepare both print and digital editions and list the book on this marketplace, with royalties agreed in writing up front.",
  },
];

const commitments = [
  {
    title: "Author-owned rights",
    body: "Licensing terms are agreed per title and set out in writing before production begins.",
  },
  {
    title: "Edited, not just uploaded",
    body: "Every title on the list passes through editorial and proof rounds.",
  },
  {
    title: "Print and digital",
    body: "The catalogue is being prepared for both physical editions and ebooks.",
  },
  {
    title: "A small, deliberate list",
    body: "We publish a limited number of titles each year, on purpose.",
  },
];

export const revalidate = 300;

export default async function HomePage() {
  const [catalogue, categories, authors] = await Promise.all([
    loadLiveCatalogue(),
    loadCategories(),
    loadLiveAuthors(),
  ]);

  const featuredBooks = catalogue.slice(0, 4);
  const featuredAuthors = authors.filter((author) => author.titles > 0).slice(0, 4);
  const lead = featuredBooks[0];
  const shelf = featuredBooks.slice(0, 3);
  const catalogueCount = catalogue.length;

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-line bg-ivory paper-texture">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full border border-gold/20"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-24 h-[24rem] w-[24rem] rounded-full border border-gold/15"
        />

        <div className="container-editorial relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-12 lg:gap-10 lg:py-28">
          <div className="lg:col-span-6 xl:col-span-6">
            <p className="eyebrow flex items-center gap-3 text-gold-deep">
              <span aria-hidden="true" className="h-px w-8 bg-gold" />
              Independent publishing house
            </p>

            <h1 className="mt-6 font-display text-[2.6rem] leading-[1.02] text-navy sm:text-6xl lg:text-[4.1rem]">
              Books made with
              <span className="block italic text-gold-deep">editorial care.</span>
            </h1>

            <p className="mt-7 max-w-lg text-[1.02rem] leading-relaxed text-charcoal-soft">
              INKFREEDOMPUBLISHING is a premium home for independent authors —
              a publishing house and a marketplace in one. We edit, design and
              sell a small list of literary fiction, poetry, essays, memoir and
              children&rsquo;s books.
            </p>

            <div className="mt-9 max-w-xl">
              <SearchBar />
              <p className="mt-3 text-xs text-charcoal-soft">
                Search the catalogue by title, author, category or theme.
              </p>
            </div>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/books"
                className="inline-flex items-center gap-2 bg-navy px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
              >
                Discover books
              </Link>
              <Link
                href="/publish"
                className="inline-flex items-center gap-2 border border-navy/25 px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy hover:bg-navy/5"
              >
                Publish with us
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              <div>
                <dt className="text-[0.65rem] tracking-[0.16em] text-charcoal-soft uppercase">
                  Published titles
                </dt>
                <dd className="mt-1 font-display text-2xl text-navy">
                  {catalogueCount}
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] tracking-[0.16em] text-charcoal-soft uppercase">
                  Categories
                </dt>
                <dd className="mt-1 font-display text-2xl text-navy">
                  {categories.length}
                </dd>
              </div>
              <div>
                <dt className="text-[0.65rem] tracking-[0.16em] text-charcoal-soft uppercase">
                  Formats
                </dt>
                <dd className="mt-1 font-display text-lg leading-tight text-navy">
                  Print &amp; digital
                </dd>
              </div>
            </dl>
          </div>

          {/* Editorial cover plate */}
          <div className="lg:col-span-6">
            {shelf.length === 0 ? (
              <div className="relative mx-auto flex max-w-xl flex-col items-center justify-center border border-line bg-white/60 px-8 py-16 text-center">
                <span
                  aria-hidden="true"
                  className="h-16 w-px bg-gold/60"
                />
                <p className="mt-6 font-display text-xl leading-snug text-navy">
                  The first titles are being prepared for the shelf.
                </p>
                <p className="mt-3 max-w-sm text-[0.85rem] leading-relaxed text-charcoal-soft">
                  Our catalogue opens with its first published books. Authors can
                  apply, upload a manuscript and go through editorial review now.
                </p>
                <Link
                  href="/publish"
                  className="mt-7 inline-flex items-center gap-2 border border-navy/25 px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy hover:bg-navy/5"
                >
                  Publish with us
                </Link>
              </div>
            ) : (
            <div className="relative mx-auto max-w-xl">
              <div
                aria-hidden="true"
                className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-linear-to-r from-transparent via-gold/50 to-transparent"
              />
              <div className="relative grid grid-cols-3 items-center gap-3 sm:gap-5">
                {shelf.map((book, index) => {
                  const offsets = [
                    "translate-y-6 -rotate-3",
                    "-translate-y-2",
                    "translate-y-8 rotate-3",
                  ];
                  return (
                    <div
                      key={book.slug}
                      className={`${offsets[index]} transition-transform duration-700 hover:translate-y-0 hover:rotate-0`}
                    >
                      <Link
                        href={`/books/${book.slug}`}
                        aria-label={`${book.title} — ${book.authorName}`}
                        className="block"
                      >
                        <BookCover book={book} priority decorative />
                      </Link>
                    </div>
                  );
                })}
              </div>

              <div className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-4">
                <p className="text-[0.66rem] tracking-[0.14em] text-charcoal-soft uppercase">
                  Featured this season
                </p>
                <p className="text-[0.66rem] tracking-[0.14em] text-charcoal-soft uppercase">
                  {lead ? `${formatPrice(lead.price)} and up` : ""}
                </p>
              </div>
            </div>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Commitments */}
      <section aria-label="How we publish" className="border-b border-line bg-white">
        <div className="container-editorial grid gap-px py-0 sm:grid-cols-2 lg:grid-cols-4">
          {commitments.map((item) => (
            <div
              key={item.title}
              className="border-line py-8 sm:border-l sm:px-6 sm:first:border-l-0 sm:first:pl-0 lg:py-10"
            >
              <h2 className="flex items-center gap-2 font-display text-base text-navy">
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
                {item.title}
              </h2>
              <p className="mt-2 text-[0.85rem] leading-relaxed text-charcoal-soft">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- Featured books */}
      {featuredBooks.length > 0 ? (
        <section className="container-editorial py-16 sm:py-20 lg:py-24">
          <SectionHeading
            eyebrow="Featured books"
            title="A shelf built with intent"
            description="Selected from the current catalogue."
            action={{ href: "/books", label: "All books" }}
          />
          <BookGrid books={featuredBooks} className="mt-12" />
        </section>
      ) : null}

      {/* ---------------------------------------------------------- Categories */}
      <section className="border-y border-line bg-ivory-deep/70">
        <div className="container-editorial py-16 sm:py-20 lg:py-24">
          <SectionHeading
            eyebrow="Browse by category"
            title="Find the shelf you came for"
            description="Every shelf on the list, from literary fiction to illustrated books for younger readers."
            action={{ href: "/categories", label: "All categories" }}
          />

          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/books?category=${category.slug}`}
                className="group relative flex flex-col justify-between gap-8 bg-ivory p-7 transition-colors duration-300 hover:bg-white"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-2xl leading-tight text-navy">
                    {category.name}
                  </h3>
                  <span className="mt-1 shrink-0 text-[0.65rem] tracking-[0.14em] text-charcoal-soft uppercase">
                    {category.count === 0
                      ? "Opening soon"
                      : `${category.count} ${category.count === 1 ? "title" : "titles"}`}
                  </span>
                </div>
                <p className="text-[0.88rem] leading-relaxed text-charcoal-soft">
                  {category.blurb}
                </p>
                <span className="inline-flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.18em] text-navy uppercase">
                  Browse
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-1.5"
                  >
                    →
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Featured authors */}
      {featuredAuthors.length > 0 ? (
        <section className="container-editorial py-16 sm:py-20 lg:py-24">
          <SectionHeading
            eyebrow="Featured authors"
            title="The people on the list"
            description="Writers published on INKFREEDOMPUBLISHING."
            action={{ href: "/authors", label: "All authors" }}
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredAuthors.map((author) => (
              <AuthorCard key={author.slug} author={author} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------ How publishing works */}
      <section className="bg-navy text-ivory">
        <div className="container-editorial py-16 sm:py-20 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionHeading
                eyebrow="How publishing works"
                title={
                  <>
                    From manuscript
                    <span className="block italic text-gold-soft">to bookshop.</span>
                  </>
                }
                description="A clear four-stage process for independent authors, with terms agreed before production begins."
                tone="dark"
              />
              <Link
                href="/publish"
                className="mt-8 inline-flex items-center gap-2 border border-white/20 px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:border-gold hover:text-gold-soft"
              >
                Read the full process
              </Link>
            </div>

            <div className="lg:col-span-8">
              <ol className="grid gap-px bg-white/10 sm:grid-cols-2">
                {publishingSteps.map((step) => (
                  <li key={step.number} className="bg-navy p-7 sm:p-8">
                    <span className="font-display text-sm tracking-[0.2em] text-gold">
                      {step.number}
                    </span>
                    <h3 className="mt-4 font-display text-xl text-ivory">
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-[0.88rem] leading-relaxed text-ivory/60">
                      {step.body}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-6 text-[0.72rem] text-ivory/55">
                Author dashboards and manuscript tracking are live. Customer
                payments are switched off until the purchase and download journey
                has been signed off.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ Become an author */}
      <section className="container-editorial py-16 sm:py-20 lg:py-24">
        <div className="relative overflow-hidden border border-line bg-white">
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-24 h-72 w-72 rounded-full border border-gold/25"
          />
          <div
            aria-hidden="true"
            className="absolute -right-10 -bottom-32 h-56 w-56 rounded-full border border-gold/20"
          />

          <div className="relative grid gap-10 p-8 sm:p-12 lg:grid-cols-12 lg:gap-16 lg:p-16">
            <div className="lg:col-span-7">
              <p className="eyebrow text-gold-deep">Become an author</p>
              <h2 className="mt-4 font-display text-3xl leading-[1.1] text-navy sm:text-4xl lg:text-[2.6rem]">
                You write the book.
                <span className="block italic text-gold-deep">
                  We make it a title.
                </span>
              </h2>
              <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-charcoal-soft">
                We are opening the list to independent authors across fiction,
                poetry, essays, memoir and children&rsquo;s books. Submissions
                are read by an editor, not a form.
              </p>

              <ul className="mt-8 grid gap-3 text-[0.9rem] text-charcoal sm:grid-cols-2">
                {[
                  "Editorial assessment on every submission",
                  "Cover and typesetting handled in-house",
                  "Print and ebook production",
                  "Royalty terms agreed in writing",
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold"
                    />
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/publish#submit"
                  className="inline-flex items-center bg-navy px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
                >
                  Submit a manuscript
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center border border-navy/20 px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy"
                >
                  About the press
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="h-full border border-line bg-ivory p-7">
                <p className="eyebrow text-charcoal-soft">Currently open</p>
                <dl className="mt-5 space-y-5 text-sm">
                  <div>
                    <dt className="font-display text-base text-navy">
                      Literary fiction
                    </dt>
                    <dd className="text-charcoal-soft">
                      Novels and story collections, 60,000–110,000 words.
                    </dd>
                  </div>
                  <div className="border-t border-line pt-5">
                    <dt className="font-display text-base text-navy">Poetry</dt>
                    <dd className="text-charcoal-soft">
                      Full collections, 48–96 pages.
                    </dd>
                  </div>
                  <div className="border-t border-line pt-5">
                    <dt className="font-display text-base text-navy">
                      Essays &amp; memoir
                    </dt>
                    <dd className="text-charcoal-soft">
                      Proposals with two sample essays or chapters.
                    </dd>
                  </div>
                  <div className="border-t border-line pt-5">
                    <dt className="font-display text-base text-navy">
                      Children &amp; young readers
                    </dt>
                    <dd className="text-charcoal-soft">
                      Picture books and early readers, with or without artwork.
                    </dd>
                  </div>
                </dl>
                <p className="mt-6 border-t border-line pt-4 text-[0.72rem] leading-relaxed text-charcoal-soft">
                  Applications are reviewed by an editor. Once approved, you can
                  upload your manuscript and cover from your author dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Newsletter */}
      <section className="border-t border-line bg-ivory-deep">
        <div className="container-editorial py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
            <div className="lg:col-span-6">
              <p className="eyebrow text-gold-deep">The Reading Room</p>
              <h2 className="mt-4 font-display text-3xl leading-[1.1] text-navy sm:text-4xl">
                Notes from an independent press
              </h2>
              <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-charcoal-soft">
                Occasional letters on new titles, author interviews and open
                submissions. No noise, and nothing sold on.
              </p>
            </div>
            <div className="lg:col-span-6">
              <NewsletterForm tone="light" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
