import type { Metadata } from "next";
import Link from "next/link";
import { PageHead } from "@/components/dash";
import { requireViewer } from "@/lib/auth";
import { becomeAuthorAction } from "@/lib/actions/auth";

export const metadata: Metadata = { title: "Become an author" };

export default async function StudioOnboardingPage() {
  const viewer = await requireViewer("/studio");

  if (viewer.profile.role !== "reader") {
    return (
      <div>
        <PageHead eyebrow="Studio" title="Your studio is ready" />
        <p className="mt-6 text-[0.9rem] text-ink-muted">
          <Link href="/studio" className="underline underline-offset-2">
            Go to the overview
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHead
        eyebrow="One step"
        title="Add an author studio"
        description="Your account is currently a reader account. Adding a studio keeps your library and gives you upload, sales and payout tools."
      />

      <ul className="mt-8 space-y-3">
        {[
          "Upload PDF and ePub editions with cover artwork",
          "Set your own price in naira and change it whenever you like",
          "Keep 90% of every sale, tracked order by order",
          "Get a public author page with your catalogue",
          "Request payouts from your available balance",
        ].map((item) => (
          <li key={item} className="flex items-start gap-3 text-[0.9rem] text-ink-soft">
            <span aria-hidden="true" className="mt-[0.4rem] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
            {item}
          </li>
        ))}
      </ul>

      <form action={becomeAuthorAction} className="mt-8">
        <button type="submit" className="btn btn-primary">
          Open my studio
        </button>
      </form>

      <p className="mt-4 text-[0.75rem] text-ink-muted">
        No fee, no application, no exclusivity. Read the{" "}
        <Link href="/publish#terms" className="underline underline-offset-2">
          publishing terms
        </Link>
        .
      </p>
    </div>
  );
}
