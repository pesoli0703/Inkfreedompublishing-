import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Issues a short-lived signed URL for a purchased ebook.
 *
 * The `ebooks` bucket has no read policy for readers, so the only way to reach a
 * file is through here — and only after an entitlement check.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL(`/signin?next=/library`, request.url));
  }

  const admin = createAdminClient();

  const { data: entitlement } = await admin
    .from("ink_entitlements")
    .select("id")
    .eq("reader_id", user.id)
    .eq("book_id", bookId)
    .maybeSingle();

  const { data: profile } = await admin
    .from("ink_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: book } = await admin
    .from("ink_books")
    .select("title, ebook_path, ebook_format, author_id")
    .eq("id", bookId)
    .maybeSingle();

  if (!book?.ebook_path) {
    return NextResponse.json({ error: "This edition has no file attached." }, { status: 404 });
  }

  // Either the reader bought it, or the author owns it, or an administrator is
  // inspecting the file.
  const { data: author } = await admin
    .from("ink_authors")
    .select("profile_id")
    .eq("id", book.author_id)
    .maybeSingle();

  const permitted =
    Boolean(entitlement) ||
    profile?.role === "admin" ||
    (author?.profile_id && author.profile_id === user.id);

  if (!permitted) {
    return NextResponse.json({ error: "You do not have access to this edition." }, { status: 403 });
  }

  const { data: signed, error } = await admin.storage
    .from("ebooks")
    .createSignedUrl(book.ebook_path, 120, {
      download: `${book.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.${book.ebook_format}`,
    });

  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not prepare the download." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
