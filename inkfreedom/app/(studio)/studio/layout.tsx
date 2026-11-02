import { PortalShell } from "@/components/portal-shell";
import { requireViewer } from "@/lib/auth";
import { initials } from "@/lib/format";

const NAV = [
  { href: "/studio", label: "Overview" },
  { href: "/studio/books", label: "My editions" },
  { href: "/studio/books/new", label: "Upload an edition" },
  { href: "/studio/earnings", label: "Earnings & payouts" },
  { href: "/studio/profile", label: "Public author page" },
];

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireViewer("/studio");
  const name = viewer.profile.full_name ?? viewer.profile.email.split("@")[0];

  return (
    <PortalShell
      variant="studio"
      nav={NAV}
      user={{
        name,
        email: viewer.profile.email,
        initials: initials(name),
      }}
    >
      {children}
    </PortalShell>
  );
}
