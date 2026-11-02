import Link from "next/link";
import { BookCard } from "@/components/book-card";
import { BookCover, coverPalette } from "@/components/book-cover";
import { Eyebrow, SectionHead, TextLink } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";
import { formatNaira } from "@/lib/format";
import { getAuthorsPreview, getCategoryCounts, getHomepageBooks, getStoreStats } from "@/lib/home";

export const revalidate = 60;

export default async function HomePage() {
  const [books, stats, counts, authors] = await Promise.all([
    getHomepageBooks(),
    getStoreStats(),
    getCategoryCounts(),
    getAuthorsPreview(),
  ]);

  const lead = books[0] ?? null;
  const shelf = books.slice(0, 4);
  const secondShelf = books.slice(4, 8);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="grain-layer" aria-hidden="true" />
        <div className="shell relative pb-16 pt-10 md:pb-24 md:pt-16">
          <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="reveal">
              <div className="flex items-center gap-3">
                <span className="h-[1px] w-10 bg-ember" aria-hidden="true" />
                <Eyebrow tone="ember">An independent ebook press</Eyebrow>
              </div>

              <h1 className="display-xl mt-6 text-ink">
                Books that
                <br />
                don&apos;t wait
                <br />
                <span className="italic-display text-ember">for permission.</span>
              </h1>

              <p className="mt-8 max-w-md text-[1.0625rem] leading-relaxed text-ink-soft">
                Inkfreedom is a direct press. Authors upload a PDF or ePub and a cover,
                set their own price, and keep ninety per cent of every sale. Readers buy
                once and download the file for good.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link href="/books" className="btn btn-primary">
                  Browse the shelf
                  <span aria-hidden="true">→</span>
                </Link>
                <Link href="/publish" className="btn btn-quiet">
                  Publish your ebook
                </Link>
              </div>

              <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-line pt-7">
                <div>
                  <dd className="font-display text-[1.6rem] leading-none text-ink">
                    {stats.titles}
                  </dd>
                  <dt className="label mt-1.5 text-ink-muted">Titles on the shelf</dt>
                </div>
                <div>
                  <dd className="font-display text-[1.6rem] leading-none text-ink">
                    {stats.authors}
                  </dd>
                  <dt className="label mt-1.5 text-ink-muted">Publishing authors</dt>
                </div>
                <div>
                  <dd className="font-display text-[1.6rem] leading-none text-ink">90%</dd>
                  <dt className="label mt-1.5 text-ink-muted">Royalty to the author</dt>
                </div>
              </dl>
            </div>

            {/* Cover constellation */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[26rem]">
                <div
                  className="absolute inset-x-8 top-8 bottom-8 rounded-full"
                  aria-hidden="true"
                  style={{
                    background:
                      "radial-gradient(closest-side, rgba(191,69,41,0.10), rgba(191,69,41,0))",
                  }}
                />
                {lead ? (
                  <div
                    className="absolute left-1/2 top-1/2 w-[62%] -translate-x-1/2 -translate-y-1/2"
                    style={{ animation: "drift 9s ease-in-out infinite", ["--tilt" as string]: "-3deg" }}
                  >
                    <BookCover
                      title={lead.title}
                      author={lead.author?.name}
                      category={lead.category}
                      path={lead.cover_path}
                      priority
                      sizes="280px"
                      className="shadow-lift"
                    />
                  </div>
                ) : (
                  <div className="absolute left-1/2 top-1/2 aspect-[2/3] w-[62%] -translate-x-1/2 -translate-y-1/2 border border-line bg-paper-card" />
                )}

                {books[1] ? (
                  <div
                    className="absolute bottom-6 left-0 w-[38%] opacity-95"
                    style={{ transform: "rotate(-9deg)" }}
                  >
                    <BookCover
                      title={books[1].title}
                      author={books[1].author?.name}
                      category={books[1].category}
                      path={books[1].cover_path}
                      sizes="160px"
                      className="shadow-shelf"
                    />
                  </div>
                ) : null}

                {books[2] ? (
                  <div
                    className="absolute right-0 top-10 w-[36%] opacity-95"
                    style={{ transform: "rotate(8deg)" }}
                  >
                    <BookCover
                      title={books[2].title}
                      author={books[2].author?.name}
                      category={books[2].category}
                      path={books[2].cover_path}
                      sizes="150px"
                      className="shadow-shelf"
                    />
                  </div>
                ) : null}

                {lead ? (
                  <div className="absolute -bottom-2 right-2 max-w-[11rem] border border-line bg-paper-card p-3 shadow-shelf">
                    <p className="label text-ink-muted">Just published</p>
                    <p className="mt-1.5 font-display text-[1.05rem] leading-tight text-ink">
                      {lead.title}
                    </p>
                    <p className="mt-1 text-[0.7rem] text-ink-muted">
                      {lead.price_kobo === 0 ? "Free" : formatNaira(lead.price_kobo)} ·{" "}
                      {lead.ebook_format === "epub" ? "ePub" : "PDF"}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Category marquee */}
        <div className="marquee overflow-hidden border-y border-line bg-ink py-3.5">
          <div className="marquee-track flex w-max items-center gap-8">
            {[...CATEGORIES, ...CATEGORIES].map((category, index) => (
              <span
                key={`${category.slug}-${index}`}
                className="flex items-center gap-8 whitespace-nowrap text-[0.7rem] font-medium uppercase tracking-[0.22em] text-paper/55"
              >
                {category.name}
                <span className="h-1 w-1 rounded-full bg-ember" aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── New arrivals ─────────────────────────────────────────────── */}
      <section className="shell py-16 md:py-24">
        <SectionHead
          eyebrow="Freshly published"
          title="New on the shelf"
          aside={<TextLink href="/books">See all {stats.titles} titles</TextLink>}
        />

        {shelf.length > 0 ? (
          <div className="stagger mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-7">
            {shelf.map((book, index) => (
              <BookCard key={book.id} book={book} priority={index < 2} />
            ))}
          </div>
        ) : (
          <div className="mt-10 border border-dashed border-line bg-paper-card/60 px-6 py-16 text-center">
            <p className="font-display text-2xl text-ink">The shelf is being set</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              No titles are published yet. Authors publishing today will be the first
              names here.
            </p>
            <Link href="/publish" className="btn btn-primary mt-6">
              Publish the first ebook
            </Link>
          </div>
        )}
      </section>

      {/* ── Buy once, read forever ───────────────────────────────────── */}
      <section className="border-y border-line bg-paper-deep">
        <div className="shell grid gap-12 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div className="rise-in">
            <Eyebrow>How buying works</Eyebrow>
            <h2 className="display-lg mt-4 text-ink">
              Buy once.
              <br />
              <span className="italic-display">Read forever.</span>
            </h2>
            <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
              Every purchase adds the title to your Inkfreedom library, permanently. The
              file is stored privately and handed to you as a secure download — no
              subscription, no lending window, no expiry.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Instant download after checkout",
                "PDF or ePub — the format the author published",
                "Re-download any time from your library",
                "Your purchase history stays yours",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-ink-soft">
                  <span aria-hidden="true" className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rise-in grid gap-4 sm:grid-cols-2">
            {[
              {
                format: "ePub",
                blurb: "Reflows to any screen. The best choice for phones, tablets and e-readers.",
                bg: "#1d2a25",
                ink: "#e9e3d3",
              },
              {
                format: "PDF",
                blurb: "Fixed layout, exactly as designed. Best for illustrated books and desktop reading.",
                bg: "#5a4429",
                ink: "#f4ead6",
              },
            ].map((card) => (
              <div
                key={card.format}
                className="flex min-h-[15rem] flex-col justify-between p-6"
                style={{ backgroundColor: card.bg, color: card.ink }}
              >
                <p className="label opacity-60">Delivered as</p>
                <div>
                  <p className="font-display text-[3.2rem] leading-none tracking-[-0.03em]">
                    {card.format}
                  </p>
                  <p className="mt-4 max-w-[16rem] text-[0.8rem] leading-relaxed opacity-70">
                    {card.blurb}
                  </p>
                </div>
              </div>
            ))}
            <div className="border border-line bg-paper-card p-6 sm:col-span-2">
              <div className="flex items-baseline justify-between gap-4">
                <p className="label text-ink-muted">Commission</p>
                <p className="font-display text-[1.1rem] text-ink">15% platform · 90% author</p>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">
                Inkfreedom keeps 10% of each sale to run the press and deliver the file.
                The remaining 90% is credited to the author&apos;s balance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── More titles ──────────────────────────────────────────────── */}
      {secondShelf.length > 0 ? (
        <section className="shell py-16 md:py-24">
          <SectionHead
            eyebrow="Keep browsing"
            title="Also worth your evening"
            aside={<TextLink href="/books?sort=title">Browse by title</TextLink>}
          />
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-7">
            {secondShelf.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Categories ───────────────────────────────────────────────── */}
      <section className="border-t border-line">
        <div className="shell py-16 md:py-24">
          <SectionHead eyebrow="The catalogue" title="Browse by shelf" />
          <div className="mt-10 grid gap-x-12 gap-y-0 sm:grid-cols-2">
            {CATEGORIES.map((category, index) => {
              const count = counts.get(category.name) ?? 0;
              return (
                <Link
                  key={category.slug}
                  href={`/books?category=${encodeURIComponent(category.name)}`}
                  className="group flex items-start justify-between gap-6 border-b border-line py-5"
                >
                  <div className="flex items-start gap-5">
                    <span className="label mt-1.5 w-6 shrink-0 text-ink-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-display text-[1.5rem] leading-tight text-ink transition-colors group-hover:text-ember">
                        {category.name}
                      </p>
                      <p className="mt-1 text-[0.8rem] text-ink-muted">{category.blurb}</p>
                    </div>
                  </div>
                  <span className="shrink-0 pt-2 text-xs tabular-nums text-ink-muted">
                    {count} {count === 1 ? "title" : "titles"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Authors ──────────────────────────────────────────────────── */}
      {authors.length > 0 ? (
        <section className="border-t border-line bg-paper-deep">
          <div className="shell py-16 md:py-24">
            <SectionHead
              eyebrow="The people writing"
              title="Authors publishing here"
              aside={<TextLink href="/authors">All authors</TextLink>}
            />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {authors.map((author) => (
                <Link
                  key={author.id}
                  href={`/authors/${author.slug}`}
                  className="group border border-line bg-paper-card p-6 transition-colors hover:border-ink"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-full font-display text-[1.1rem]"
                      style={{
                        backgroundColor: coverPalette(author.top_category).bg,
                        color: coverPalette(author.top_category).ink,
                      }}
                    >
                      {author.name.slice(0, 1)}
                    </span>
                    <div>
                      <p className="font-display text-[1.25rem] leading-none text-ink group-hover:text-ember">
                        {author.name}
                      </p>
                      <p className="mt-1 text-[0.72rem] text-ink-muted">
                        {author.titles} {author.titles === 1 ? "title" : "titles"}
                      </p>
                    </div>
                  </div>
                  {author.tagline ? (
                    <p className="mt-4 line-clamp-2 text-[0.82rem] leading-relaxed text-ink-muted">
                      {author.tagline}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Publish CTA ──────────────────────────────────────────────── */}
      <section className="bg-ember text-[#fff6f0]">
        <div className="shell grid gap-10 py-16 md:grid-cols-[1.3fr_1fr] md:items-end md:py-24">
          <div>
            <p className="label text-[#ffe4d8]/80">For writers</p>
            <h2 className="display-lg mt-4">
              Your book.
              <br />
              <span className="italic-display">Your price. Your file.</span>
            </h2>
            <p className="mt-6 max-w-lg text-[0.95rem] leading-relaxed text-[#ffe9e0]/90">
              Upload the PDF or ePub you already finished, add a cover, set a price in
              naira. An editor reviews the listing, and then it is live for readers
              everywhere.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/publish" className="btn btn-paper w-full">
              Start publishing
            </Link>
            <Link
              href="/signup?role=author"
              className="btn w-full border border-[#fff6f0]/40 text-[#fff6f0] hover:bg-[#fff6f0]/10"
            >
              Create an author account
            </Link>
            <p className="mt-2 text-center text-[0.7rem] text-[#ffe4d8]/70">
              No listing fee. No exclusivity clause.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
