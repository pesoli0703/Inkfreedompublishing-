import { NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

/**
 * Administrator access to an uploaded eBook, for review.
 *
 * The role is checked on the server before anything is read. The file itself
 * lives in a private bucket, so this is the only way to open it — and the link
 * it issues expires, rather than exposing a permanent public URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;
  const viewer = await getViewer();

  if (!viewer) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  if (viewer.role !== "admin") {
    return NextResponse.json({ error: "Administrator only." }, { status: 403 });
  }
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ error: "File storage is not connected." }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: files } = await admin
    .from("book_files")
    .select("storage_bucket, storage_path, kind")
    .eq("book_id", bookId)
    .eq("is_current", true)
    .in("kind", ["ebook", "pdf"])
    .order("created_at", { ascending: false })
    .limit(1);

  const file = files?.[0];
  if (!file) {
    return NextResponse.json({ error: "No eBook file has been uploaded." }, { status: 404 });
  }

  const { data: signed, error } = await admin.storage
    .from(file.storage_bucket)
    .createSignedUrl(file.storage_path, 60 * 10, { download: true });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not sign the file link." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
