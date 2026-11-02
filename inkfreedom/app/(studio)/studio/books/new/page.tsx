import type { Metadata } from "next";
import { Crumbs, PageHead } from "@/components/dash";
import { EditionForm } from "@/components/studio-edition-form";
import { requireAuthor } from "@/lib/auth";

export const metadata: Metadata = { title: "Upload an edition" };

export default async function NewEditionPage() {
  const viewer = await requireAuthor();

  return (
    <div>
      <Crumbs items={[{ href: "/studio", label: "Studio" }, { href: "/studio/books", label: "Editions" }, { label: "New" }]} />
      <PageHead
        eyebrow="New edition"
        title="Upload an edition"
        description="A PDF or an ePub, a cover, and the words that sell it. You can save a draft and come back."
      />
      <div className="mt-8">
        <EditionForm userId={viewer.user.id} />
      </div>
    </div>
  );
}
