import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookCard } from "@/components/book-card";
import { coverPalette } from "@/components/book-cover";
import { Eyebrow } from "@/components/ui";
import { getAuthorBySlug, listBooksByAuthor } from "@/lib/queries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author) return { title: "Author not found" };
  return {
    title: author.name,
    description: author.bio?.slice(0, 180) ?? `${author.name} on Inkfreedom.`,
  };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const author = await getAuthorBySlug(slug);
  if (!author || author.status !== "active") notFound();

  const books = await listBooksByAuthor(author.id);
  const palette = coverPalette(books[0]?.category ?? "Fiction");

  return (
    <>
      <section className="border-b border-line bg-paper-deep">
        <div className="shell py-12 md:py-16">
          <Link href="/authors" className="text-[0.78rem] text-ink-muted hover:text-ink">
            ← All authors
          </Link>

          <div className="mt-8 grid gap-8 md:grid-cols-[auto_1fr] md:items-start md:gap-10">
            <span
              className="grid h-24 w-24 place-items-center rounded-full font-display text-[2.6rem] leading-none"
              style={{ backgroundColor: palette.bg, color: palette.ink }}
            >
              {author.name.slice(0, 1)}
            </span>
            <div>
              <Eyebrow>
                {author.location ?? "Inkfreedom author"} · {books.length}{" "}
                {books.length === 1 ? "title" : "titles"}
              </Eyebrow>
              <h1 className="display-lg mt-3 text-ink">{author.name}</h1>
              {author.tagline ? (
                <p className="italic-display mt-2 text-[1.35rem] text-ink-muted">
                  {author.tagline}
                </p>
              ) : null}
              {author.bio ? (
                <p className="mt-5 max-w-2xl text-[0.95rem] leading-[1.75] text-ink-soft">
                  {author.bio}
                </p>
              ) : null}
              {author.website ? (
                <a
                  href={author.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-block text-[0.82rem] font-medium text-ink underline decoration-line underline-offset-4 hover:text-ember"
                >
                  {author.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="shell py-12 md:py-16">
        <h2 className="display-md text-ink">Published on Inkfreedom</h2>
        {books.length > 0 ? (
          <div className="stagger mt-8 grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-7">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-[0.9rem] text-ink-muted">
            No published titles yet. Check back shortly.
          </p>
        )}
      </section>
    </>
  );
}
