import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

/**
 * Issues a seven-day signed download URL for a book the reader owns.
 *
 * The entitlement check happens inside the database (`issue_download`), running
 * with the reader's own credentials. The service role is used only to look up
 * the current file id and to sign the URL; it never decides access.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const origin = new URL(request.url).origin;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/dashboard/library?error=not_configured`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/signin?next=/dashboard/library`);
  }

  if (!serviceRoleConfigured()) {
    return NextResponse.redirect(`${origin}/dashboard/library?error=storage_not_configured`);
  }

  const admin = createAdminClient();
  const { data: files } = await admin
    .from("book_files")
    .select("id")
    .eq("book_id", bookId)
    .eq("is_current", true)
    .in("kind", ["ebook", "pdf"])
    .order("created_at", { ascending: false })
    .limit(1);

  const fileId = files?.[0]?.id;
  if (!fileId) {
    return NextResponse.redirect(`${origin}/dashboard/library?error=no_file`);
  }

  const { data: issued, error } = await supabase.rpc("issue_download", {
    p_book_file_id: fileId,
  });

  if (error || !issued?.[0]) {
    return NextResponse.redirect(`${origin}/dashboard/library?error=not_entitled`);
  }

  const { bucket, path } = issued[0] as { bucket: string; path: string };
  const { data: signed, error: signError } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60 * 24 * 7, { download: true });

  if (signError || !signed?.signedUrl) {
    return NextResponse.redirect(`${origin}/dashboard/library?error=sign_failed`);
  }

  return NextResponse.redirect(signed.signedUrl);
}
