import { PortalFooter, PortalHeader } from "@/components/portal-header";
import { getViewer } from "@/lib/auth";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/books", label: "Submissions" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/withdrawals", label: "Withdrawals" },
  { href: "/admin/users", label: "Users" },
];

const links = [
  { href: "/", label: "View the bookstore" },
  { href: "/admin/settings", label: "Platform settings" },
  { href: "/admin/reports", label: "Financial reports" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();

  return (
    <>
      <PortalHeader
        portal="admin"
        items={items}
        links={links}
        viewer={viewer ? { name: viewer.fullName ?? "", email: viewer.email } : null}
      />
      {children}
      <PortalFooter portal="admin" links={links} />
    </>
  );
}
