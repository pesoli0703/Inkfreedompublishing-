import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { setUserRoleAction, setUserStatusAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatDate, formatLabel } from "@/lib/format";

export default async function AdminUsersPage() {
  const viewer = await requireAdmin("/admin/users");
  const supabase = await createServerSupabaseClient();
  const { data: users } = supabase
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, role, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200)
    : { data: null };

  return (
    <DashboardShell
      eyebrow="Operations"
      title="Users & roles"
      description="Role changes are reserved for existing administrators, cannot be applied to your own account, and are written to the audit log."
      sections={adminNav()}
    >
      <Panel title={`${users?.length ?? 0} accounts`}>
        {(!users || users.length === 0) ? (
          <Empty title="No accounts yet" />
        ) : (
          <ul className="divide-y divide-line">
            {users.map((user) => (
              <li key={user.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[0.9rem] text-navy">
                      {user.full_name ?? "Unnamed"}
                      {user.id === viewer.id && <span className="ml-2 text-[0.68rem] text-charcoal-soft">(you)</span>}
                    </p>
                    <p className="text-[0.72rem] text-charcoal-soft">
                      {user.email} · {formatLabel(user.role)} · {formatLabel(user.status)} · joined {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>

                {user.id !== viewer.id && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <AdminForm action={setUserRoleAction} submitLabel="Set role" variant="quiet">
                      <input type="hidden" name="user_id" value={user.id} />
                      <select name="role" defaultValue={user.role as string} className={adminField}>
                        <option value="reader">Reader</option>
                        <option value="author">Author</option>
                        <option value="admin">Administrator</option>
                      </select>
                    </AdminForm>
                    <AdminForm action={setUserStatusAction} submitLabel="Set status" variant="quiet">
                      <input type="hidden" name="user_id" value={user.id} />
                      <select name="status" defaultValue={user.status as string} className={adminField}>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="deleted">Deleted</option>
                      </select>
                    </AdminForm>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </DashboardShell>
  );
}
