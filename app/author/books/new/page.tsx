import { DashboardShell, Panel } from "@/components/dashboard-shell";
import { NewBookForm } from "@/components/new-book-form";
import { authorNav } from "@/lib/nav";
import { requireAuthorArea } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewBookPage() {
  const viewer = await requireAuthorArea("/author/books/new");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/author");

  const { data: author } = await supabase
    .from("author_profiles")
    .select("status")
    .eq("user_id", viewer.id)
    .maybeSingle();

  if (!author) redirect("/author/start");
  if (author.status === "suspended") redirect("/author/start");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, section")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <DashboardShell
      eyebrow="Author"
      title="New book"
      description="A draft is private. Nothing is listed until you submit it and an administrator approves it."
      sections={authorNav()}
    >
      <Panel>
        <NewBookForm categories={categories ?? []} />
      </Panel>
    </DashboardShell>
  );
}
