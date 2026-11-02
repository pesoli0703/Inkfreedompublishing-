import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <div className="shell py-6">
        <Wordmark />
      </div>
      <main className="shell flex flex-1 flex-col justify-center py-16">
        <p className="label text-ink-muted">404 — Missing page</p>
        <h1 className="display-xl mt-5 max-w-2xl text-ink">
          This page
          <br />
          <span className="italic-display text-ember">never went to print.</span>
        </h1>
        <p className="mt-6 max-w-md text-[0.95rem] leading-relaxed text-ink-muted">
          The link may be old, or the title may have been withdrawn by its author.
          The shelf is still where you left it.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/books" className="btn btn-primary">
            Browse the shelf
          </Link>
          <Link href="/" className="btn btn-quiet">
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
