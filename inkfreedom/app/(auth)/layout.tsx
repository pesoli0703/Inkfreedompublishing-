import Link from "next/link";
import { Wordmark } from "@/components/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
      {/* Manifesto panel */}
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="grain-layer opacity-30" aria-hidden="true" />
        <Wordmark tone="paper" />

        <div className="relative max-w-sm">
          <p className="display-lg">
            A press with
            <br />
            <span className="italic-display text-ember">no gatekeepers.</span>
          </p>
          <p className="mt-6 text-[0.92rem] leading-relaxed text-paper/60">
            Writers upload the book they finished. Readers buy it directly. No
            acquisitions committee, no agent, no six-month silence.
          </p>
        </div>

        <div className="relative border-t border-paper/10 pt-6">
          <p className="label text-paper/40">One account, three rooms</p>
          <div className="mt-4 grid gap-2 text-[0.8rem] text-paper/70">
            <p>Reader — buy, keep and re-download your library.</p>
            <p>Author — publish PDF or ePub, track sales and royalties.</p>
            <p>Editor — review listings and settle payouts.</p>
          </div>
        </div>
      </aside>

      <main className="flex flex-col bg-paper">
        <div className="flex items-center justify-between px-6 py-6 lg:px-12">
          <div className="lg:hidden">
            <Wordmark />
          </div>
          <Link
            href="/"
            className="ml-auto text-[0.8rem] text-ink-muted transition-colors hover:text-ink"
          >
            ← Back to the store
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 lg:px-12">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
      </main>
    </div>
  );
}
