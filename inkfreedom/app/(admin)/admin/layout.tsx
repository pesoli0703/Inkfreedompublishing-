import { PortalShell } from "@/components/portal-shell";
import { requireAdmin } from "@/lib/auth";
import { initials } from "@/lib/format";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/moderation", label: "Review queue" },
  { href: "/admin/titles", label: "Titles" },
  { href: "/admin/authors", label: "Authors" },
  { href: "/admin/readers", label: "Readers" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireAdmin();
  const name = viewer.profile.full_name ?? "Editor";

  return (
    <PortalShell
      variant="admin"
      nav={NAV}
      user={{ name, email: viewer.profile.email, initials: initials(name) }}
    >
      {children}
    </PortalShell>
  );
}
