import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { AuthorProfileForm } from "@/components/author-profile-form";
import { authorNav } from "@/lib/nav";
import { requireViewer } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AuthorSettingsPage() {
  const viewer = await requireViewer("/author/settings");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/author");

  const { data: author } = await supabase
    .from("author_profiles")
    .select("pen_name, tagline, bio, based_in, writing_in, country_code, avatar_path, status")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!author) redirect("/author/apply");

  const avatarUrl = author.avatar_path
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/author-avatars/${author.avatar_path}`
    : null;

  return (
    <DashboardShell
      eyebrow="Author"
      title="Author profile"
      description="This is the public face of your work on the site. Nothing here is auto-translated or embellished."
      sections={authorNav()}
    >
      <Panel>
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="mb-6 h-20 w-20 rounded-full border border-line object-cover" />
        )}
        <AuthorProfileForm
          author={{
            pen_name: author.pen_name ?? "",
            tagline: author.tagline ?? "",
            bio: author.bio ?? "",
            based_in: author.based_in ?? "",
            writing_in: author.writing_in ?? "",
            country_code: author.country_code ?? "NG",
          }}
        />
      </Panel>
    </DashboardShell>
  );
}
