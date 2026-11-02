import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";

export const metadata: Metadata = {
  title: "About the press",
  description:
    "Inkfreedom is an independent ebook press built on a simple idea: the author is the publisher.",
};

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="shell py-14 md:py-24">
          <Eyebrow>The press</Eyebrow>
          <h1 className="display-lg mt-5 max-w-3xl text-ink">
            An independent press built on one sentence:
            <br />
            <span className="italic-display text-ember">the author is the publisher.</span>
          </h1>
        </div>
      </section>

      <section className="shell grid gap-12 py-16 md:grid-cols-[1fr_1.1fr] md:py-24">
        <div>
          <p className="label text-ink-muted">Why this exists</p>
        </div>
        <div className="space-y-5 text-[1rem] leading-[1.8] text-ink-soft">
          <p>
            Most writers do not need a gatekeeper. They need somewhere to put the file,
            a page that looks like it matters, and a way to be paid when someone decides
            to read it.
          </p>
          <p>
            Inkfreedom is that place. Authors upload a finished PDF or ePub and a cover,
            write their own description, set their own price, and sell directly to
            readers. The press takes 10% to run the store, deliver the files and settle
            payouts. The author keeps the rest and keeps the rights.
          </p>
          <p>
            There is no acquisition committee, because there is nothing to acquire. We
            do not own your work and we do not decide whether it should exist. An editor
            reviews each listing — for a cover, a description and a working file — and
            then it is published.
          </p>
        </div>
      </section>

      <section className="border-y border-line bg-paper-deep">
        <div className="shell grid gap-px py-16 md:grid-cols-3 md:py-20">
          {[
            {
              title: "What we take",
              body: "10% of each sale. That is the entire revenue model — no listing fee, no subscription, no upsell.",
            },
            {
              title: "What we hold",
              body: "Your files, privately, so readers can download them securely and only after buying.",
            },
            {
              title: "What we do not do",
              body: "We do not claim rights, demand exclusivity, or ask you to pay to be published.",
            },
          ].map((item) => (
            <div key={item.title} className="bg-paper-deep pr-6">
              <h2 className="font-display text-[1.5rem] text-ink">{item.title}</h2>
              <p className="mt-2 max-w-xs text-[0.88rem] leading-relaxed text-ink-muted">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="shell py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Contact</Eyebrow>
            <h2 className="display-md mt-3 text-ink">Write to the press</h2>
            <p className="mt-4 max-w-md text-[0.92rem] leading-relaxed text-ink-muted">
              Questions about a purchase, a listing, or a payout. One inbox, read by the
              people who run the store.
            </p>
            <a
              href="mailto:hello@inkfreedom.app"
              className="mt-6 inline-block font-display text-[1.6rem] text-ink underline decoration-line underline-offset-4 hover:text-ember"
            >
              hello@inkfreedom.app
            </a>
          </div>

          <div className="border border-line bg-paper-card p-7">
            <p className="label text-ink-muted">For authors</p>
            <p className="mt-3 font-display text-[1.5rem] leading-tight text-ink">
              Bring the book you already finished.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/publish" className="btn btn-primary">
                Publishing terms
              </Link>
              <Link href="/signup?role=author" className="btn btn-quiet">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
