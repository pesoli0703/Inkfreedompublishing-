import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getViewer } from "@/lib/auth";
import { initials } from "@/lib/format";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  const summary = viewer
    ? {
        name: viewer.profile.full_name ?? viewer.profile.email.split("@")[0],
        role: viewer.profile.role,
        initials: initials(viewer.profile.full_name ?? viewer.profile.email.split("@")[0]),
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader viewer={summary} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
