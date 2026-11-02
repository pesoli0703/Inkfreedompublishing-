import type { Metadata } from "next";
import Link from "next/link";
import { EmptyRow, PageHead, StatusPill, TableShell } from "@/components/dash";
import { listAdminAuthors } from "@/lib/admin";
import { formatDate, formatNaira } from "@/lib/format";
import { setAuthorStatusAction } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Authors" };

export default async function AdminAuthorsPage() {
  const authors = await listAdminAuthors();

  return (
    <div>
      <PageHead
        eyebrow="People"
        title="Authors"
        description="Everyone with a studio, what they have published and what they have earned."
      />

      <div className="mt-6 border border-line bg-paper-card">
        <TableShell head={["Author", "Titles", "Sales", "Royalties", "Joined", ""]}>
          {authors.length === 0 ? (
            <EmptyRow colSpan={6}>No authors yet.</EmptyRow>
          ) : (
            authors.map((author) => (
              <tr key={author.id} className="text-[0.82rem]">
                <td className="px-4 py-3 pl-5">
                  <Link
                    href={`/authors/${author.slug}`}
                    className="font-medium text-ink hover:text-ember"
                  >
                    {author.name}
                  </Link>
                  <p className="text-[0.68rem] text-ink-muted">
                    {author.profile?.email ?? author.location ?? "—"}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                  {author.published} live / {author.total}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink-soft">
                  {author.units_sold}
                </td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">
                  {formatNaira(author.lifetime_kobo)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                  {formatDate(author.created_at)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <StatusPill status={author.status} />
                    <form action={setAuthorStatusAction}>
                      <input type="hidden" name="authorId" value={author.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={author.status === "active" ? "suspended" : "active"}
                      />
                      <button
                        type="submit"
                        className="text-[0.72rem] text-ink-muted hover:text-ember"
                      >
                        {author.status === "active" ? "Suspend" : "Reinstate"}
                      </button>
                    </form>
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
