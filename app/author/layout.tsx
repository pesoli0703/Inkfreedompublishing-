import { PortalFooter, PortalHeader } from "@/components/portal-header";
import { getViewer } from "@/lib/auth";

const items = [
  { href: "/author", label: "Overview" },
  { href: "/author/books", label: "My books" },
  { href: "/author/earnings", label: "Sales & earnings" },
  { href: "/author/settings", label: "Profile" },
];

const links = [
  { href: "/", label: "View the bookstore" },
  { href: "/author-agreement", label: "Author agreement" },
  { href: "/publish", label: "How publishing works" },
];

export default async function AuthorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();

  return (
    <>
      <PortalHeader
        portal="author"
        items={items}
        links={links}
        viewer={viewer ? { name: viewer.fullName ?? "", email: viewer.email } : null}
      />
      {children}
      <PortalFooter portal="author" links={links} />
    </>
  );
}
