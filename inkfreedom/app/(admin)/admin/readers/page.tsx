import type { Metadata } from "next";
import { EmptyRow, PageHead, TableShell } from "@/components/dash";
import { listAdminReaders } from "@/lib/admin";
import { formatDate, formatNaira } from "@/lib/format";
import { RoleSelect } from "@/components/admin-role-select";

export const metadata: Metadata = { title: "Readers" };

export default async function AdminReadersPage() {
  const people = await listAdminReaders();

  return (
    <div>
      <PageHead
        eyebrow="People"
        title="Accounts"
        description="Everybody with an account, what they have bought, and their role on the press. Role changes take effect immediately."
      />

      <div className="mt-6 border border-line bg-paper-card">
        <TableShell head={["Person", "Role", "Library", "Orders", "Spent", "Joined"]}>
          {people.length === 0 ? (
            <EmptyRow colSpan={6}>No accounts yet.</EmptyRow>
          ) : (
            people.map((person) => (
              <tr key={person.id} className="text-[0.82rem]">
                <td className="px-4 py-3 pl-5">
                  <p className="font-medium text-ink">{person.full_name ?? "—"}</p>
                  <p className="text-[0.68rem] text-ink-muted">{person.email}</p>
                </td>
                <td className="px-4 py-3">
                  <RoleSelect profileId={person.id} role={person.role} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{person.books}</td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{person.orders}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums text-ink">
                  {formatNaira(person.spent_kobo)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                  {formatDate(person.created_at)}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </div>

      <p className="mt-4 text-[0.72rem] text-ink-muted">
        Roles are protected in the database: an account cannot promote itself, and only
        an administrator can change a role.
      </p>
    </div>
  );
}
