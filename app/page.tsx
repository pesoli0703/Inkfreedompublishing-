import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { BookGrid } from "@/components/book-card";
import { AuthorCard } from "@/components/author-card";
import { SearchBar } from "@/components/search-bar";
import { SectionHeading } from "@/components/section-heading";
import { NewsletterForm } from "@/components/newsletter-form";
import { groupCategoriesBySection } from "@/lib/category-sections";
import { loadCategories, loadLiveAuthors, loadLiveCatalogue } from "@/lib/catalogue-live";
import { formatPrice } from "@/lib/format";

const publishingSteps = [
  {
    number: "01",
    title: "Create an account",
    body: "Register with your email address and your author workspace opens immediately — no application, no waiting to be accepted.",
  },
  {
    number: "02",
    title: "Upload your eBook",
    body: "Add the title, description, cover image and the book itself as a PDF or EPUB. Files stay private until someone buys.",
  },
  {
    number: "03",
    title: "Set your price",
    body: "Choose your price in naira. We convert it for readers in other currencies and you keep 90% of every sale.",
  },
  {
    number: "04",
    title: "Submit for approval",
    body: "An administrator checks the listing, then your book goes live in the bookstore for readers to buy.",
  },
];

const commitments = [
  {
    title: "You keep the rights",
    body: "A non-exclusive licence, not a publishing contract. Sell the same book anywhere else.",
  },
  {
    title: "90% to the author",
    body: "You keep 90% of every sale. No application fee and no publishing fee.",
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
  const categoryGroups = groupCategoriesBySection(categories);

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
              sell books across every shelf, from literary fiction and memoir to
              business, children&rsquo;s books and academic texts.
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
                  open a workspace, upload a book and send it for editorial review
                  now.
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
            description={`${categories.length} shelves in ${categoryGroups.length} sections — fiction, non-fiction, business, poetry and drama, children and young adult, textbooks and academic.`}
            action={{ href: "/categories", label: "All categories" }}
          />

          <div className="mt-12 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {categoryGroups.map((group) => {
              const preview = group.categories.slice(0, 3).map((shelf) => shelf.name);
              const remainder = group.categories.length - preview.length;

              return (
                <Link
                  key={group.section.slug}
                  href={`/categories#${group.section.slug}`}
                  className="group relative flex flex-col justify-between gap-7 bg-ivory p-7 transition-colors duration-300 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-display text-2xl leading-tight text-navy">
                      {group.section.name}
                    </h3>
                    <span className="mt-1 shrink-0 text-[0.65rem] tracking-[0.14em] text-charcoal-soft uppercase">
                      {group.categories.length}{" "}
                      {group.categories.length === 1 ? "shelf" : "shelves"}
                    </span>
                  </div>

                  <div>
                    <p className="text-[0.88rem] leading-relaxed text-charcoal-soft">
                      {group.section.blurb}
                    </p>
                    <p className="mt-4 text-[0.72rem] leading-relaxed tracking-[0.04em] text-charcoal-soft">
                      {preview.join(" · ")}
                      {remainder > 0 ? ` · +${remainder} more` : ""}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 text-[0.68rem] font-semibold tracking-[0.18em] text-navy uppercase">
                      Open section
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-1.5"
                      >
                        →
                      </span>
                    </span>
                    <span className="text-[0.65rem] tracking-[0.12em] text-charcoal-soft uppercase">
                      {group.count === 0
                        ? "Opening soon"
                        : `${group.count} ${group.count === 1 ? "title" : "titles"}`}
                    </span>
                  </div>

                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100"
                  />
                </Link>
              );
            })}
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
                eyebrow="How self-publishing works"
                title={
                  <>
                    From your file
                    <span className="block italic text-gold-soft">to a reader.</span>
                  </>
                }
                description="Four steps. No application fee, no publishing contract, no waiting for an editor to accept you."
                tone="dark"
              />
              <Link
                href="/publish"
                className="mt-8 inline-flex items-center gap-2 border border-white/20 px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:border-gold hover:text-gold-soft"
              >
                Start publishing
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
                Author workspaces and book review are live. Customer payments are
                switched off until the purchase and download journey has been
                signed off.
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
                We are open to independent authors on every shelf — fiction,
                non-fiction, poetry and drama, business, children&rsquo;s books
                and academic texts. Upload on your own account; an editor reads
                every book before it goes on sale.
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
                  href="/author/start"
                  className="inline-flex items-center bg-navy px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
                >
                  Start publishing
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
                <p className="eyebrow text-charcoal-soft">Publish any of these</p>
                <dl className="mt-5 space-y-5 text-sm">
                  <div>
                    <dt className="font-display text-base text-navy">
                      Literary fiction
                    </dt>
                    <dd className="text-charcoal-soft">
                      Novels and story collections, any length.
                    </dd>
                  </div>
                  <div className="border-t border-line pt-5">
                    <dt className="font-display text-base text-navy">Poetry</dt>
                    <dd className="text-charcoal-soft">
                      Full collections and pamphlets.
                    </dd>
                  </div>
                  <div className="border-t border-line pt-5">
                    <dt className="font-display text-base text-navy">
                      Essays &amp; memoir
                    </dt>
                    <dd className="text-charcoal-soft">
                      Essay collections, criticism and memoir.
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
                  Every shelf is open: {categories.length} of them, from crime
                  novels to law textbooks. Choose your pen name and upload — no one
                  has to accept you first.
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
