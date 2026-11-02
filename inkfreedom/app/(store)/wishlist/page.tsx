import type { Metadata } from "next";
import Link from "next/link";
import { AccountShell } from "@/components/account-shell";
import { BookCover } from "@/components/book-cover";
import { EmptyState } from "@/components/ui";
import { requireViewer } from "@/lib/auth";
import { getWishlist } from "@/lib/queries";
import { formatNaira } from "@/lib/format";
import { toggleWishlistAction } from "@/lib/actions/commerce";

export const metadata: Metadata = { title: "Wishlist" };

type WishEntry = {
  book_id: string;
  created_at: string;
  book: {
    id: string;
    title: string;
    slug: string;
    subtitle: string | null;
    description: string;
    price_kobo: number;
    cover_path: string | null;
    category: string;
    author: { name: string; slug: string } | null;
  } | null;
};

export default async function WishlistPage() {
  const viewer = await requireViewer("/wishlist");
  const entries = (await getWishlist(viewer.user.id)) as unknown as WishEntry[];
  const saved = entries.filter((entry) => entry.book);

  return (
    <AccountShell
      eyebrow="Your account"
      title="Wishlist"
      description="Titles you have set aside. Prices are set by the authors, so check back."
      aside={
        <div className="text-right">
          <p className="font-display text-[2rem] leading-none text-ink">{saved.length}</p>
          <p className="label mt-1 text-ink-muted">Saved titles</p>
        </div>
      }
    >
      {saved.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Tap “Save for later” on any book page and it will wait for you here."
          action={
            <Link href="/books" className="btn btn-primary">
              Find something to read
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {saved.map((entry) => {
            const book = entry.book!;
            return (
              <article key={entry.book_id} className="flex gap-4 border border-line bg-paper-card p-4">
                <Link href={`/books/${book.slug}`} className="w-20 shrink-0">
                  <BookCover
                    title={book.title}
                    author={book.author?.name}
                    category={book.category}
                    path={book.cover_path}
                    sizes="80px"
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <Link
                      href={`/books/${book.slug}`}
                      className="font-display text-[1.15rem] leading-tight text-ink hover:text-ember"
                    >
                      {book.title}
                    </Link>
                    <p className="mt-1 text-[0.75rem] text-ink-muted">{book.author?.name}</p>
                    <p className="mt-2 text-[0.85rem] font-medium text-ink">
                      {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      href={`/books/${book.slug}`}
                      className="text-[0.75rem] font-medium text-ink underline decoration-line underline-offset-4 hover:text-ember"
                    >
                      View title
                    </Link>
                    <form action={toggleWishlistAction}>
                      <input type="hidden" name="bookId" value={book.id} />
                      <input type="hidden" name="redirectTo" value="/wishlist" />
                      <button
                        type="submit"
                        className="text-[0.75rem] text-ink-muted transition-colors hover:text-ember"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
