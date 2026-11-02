import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/dash";
import { AuthorProfileForm } from "@/components/author-profile-form";
import { requireAuthor } from "@/lib/auth";

export const metadata: Metadata = { title: "Public author page" };

export default async function StudioProfilePage() {
  const viewer = await requireAuthor();

  return (
    <div>
      <PageHead
        eyebrow="Public page"
        title="Your author page"
        description="This is what readers see when they tap your name on a book. It is part of the storefront, not the studio."
        aside={
          <Link
            href={`/authors/${viewer.author.slug}`}
            className="btn btn-quiet h-10 px-4 text-[0.78rem]"
          >
            View it live
          </Link>
        }
      />

      <div className="mt-8">
        <AuthorProfileForm author={viewer.author} />
      </div>
    </div>
  );
}
