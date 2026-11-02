import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, PageHead, StatusPill, TableShell } from "@/components/dash";
import { listAdminBooks } from "@/lib/admin";
import { formatDate, formatNaira } from "@/lib/format";
import { publishBookAction, unpublishBookAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Titles" };

const FILTERS = [
  { value: "", label: "All" },
  { value: "published", label: "Live" },
  { value: "pending", label: "In review" },
  { value: "draft", label: "Drafts" },
  { value: "rejected", label: "Returned" },
];

export default async function AdminTitlesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const books = await listAdminBooks(status);
  const back = status ? `/admin/titles?status=${status}` : "/admin/titles";

  return (
    <div>
      <PageHead
        eyebrow="Catalogue"
        title="Every title"
        description="The full catalogue, including drafts and returned listings."
      />

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.label}
            href={filter.value ? `/admin/titles?status=${filter.value}` : "/admin/titles"}
            className={`chip ${(status ?? "") === filter.value ? "chip-on" : ""}`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 border border-line bg-paper-card">
        <TableShell head={["Title", "Author", "Status", "Price", "Updated", ""]}>
          {books.length === 0 ? (
            <EmptyRow colSpan={6}>No titles match this filter.</EmptyRow>
          ) : (
            books.map((book) => (
              <tr key={book.id} className="text-[0.82rem]">
                <td className="max-w-[18rem] px-4 py-3 pl-5">
                  <Link
                    href={book.status === "published" ? `/books/${book.slug}` : "/admin/moderation"}
                    className="truncate font-medium text-ink hover:text-ember"
                  >
                    {book.title}
                  </Link>
                  <p className="text-[0.68rem] text-ink-muted">
                    {book.category} · {book.ebook_format === "epub" ? "ePub" : "PDF"}
                  </p>
                </td>
                <td className="px-4 py-3 text-ink-muted">{book.author?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusPill status={book.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">
                  {book.price_kobo === 0 ? "Free" : formatNaira(book.price_kobo)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                  {formatDate(book.updated_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {book.status === "published" ? (
                      <form action={unpublishBookAction}>
                        <input type="hidden" name="bookId" value={book.id} />
                        <input type="hidden" name="back" value={back} />
                        <button
                          type="submit"
                          className="text-[0.72rem] text-ink-muted hover:text-ember"
                        >
                          Unpublish
                        </button>
                      </form>
                    ) : (
                      <form action={publishBookAction}>
                        <input type="hidden" name="bookId" value={book.id} />
                        <input type="hidden" name="back" value={back} />
                        <button
                          type="submit"
                          className="text-[0.72rem] font-medium text-ink hover:text-ember"
                        >
                          Publish
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>
    </div>
  );
}
