import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Publish your ebook",
  description:
    "Upload a PDF or ePub, add a cover, set your price. Inkfreedom pays authors 90% of every sale, with no listing fee and no exclusivity.",
};

const STEPS = [
  {
    number: "01",
    title: "Create an author account",
    body: "One form. Your studio is open immediately — no application, no waiting to be chosen.",
  },
  {
    number: "02",
    title: "Upload the book and the cover",
    body: "Attach the PDF or ePub you already finished, then the cover artwork as JPG, PNG or WebP. Files stay private until someone buys.",
  },
  {
    number: "03",
    title: "Write the listing and set a price",
    body: "Title, description, category, page count. Your price, in naira. You can change both at any time.",
  },
  {
    number: "04",
    title: "We review, then you go live",
    body: "An editor checks the listing — cover, description, file — and publishes it to the shelf. You are told either way.",
  },
];

const TERMS = [
  { label: "Royalty", value: "90% of every sale, credited per order" },
  { label: "Listing fee", value: "None, now or later" },
  { label: "Exclusivity", value: "None — sell the same book elsewhere" },
  { label: "Formats", value: "PDF and ePub, up to 150 MB" },
  { label: "Payouts", value: "Requested from the studio once cleared" },
  { label: "Rights", value: "Yours. You license, you never assign" },
];

export default async function PublishPage() {
  const viewer = await getViewer();
  const cta = viewer
    ? viewer.profile.role === "author" || viewer.profile.role === "admin"
      ? { href: "/studio/books/new", label: "Upload a new edition" }
      : { href: "/account", label: "Add an author studio to my account" }
    : { href: "/signup?role=author", label: "Create an author account" };

  return (
    <>
      <section className="border-b border-line">
        <div className="shell py-14 md:py-24">
          <Eyebrow tone="ember">For writers</Eyebrow>
          <h1 className="display-xl mt-5 max-w-4xl text-ink">
            Publish the book
            <br />
            <span className="italic-display">you already wrote.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[1.05rem] leading-relaxed text-ink-soft">
            Inkfreedom is not a slush pile. Upload the PDF or ePub you have finished,
            set your own price, and keep ninety per cent of every sale. No agent, no
            acquisitions meeting, no six-month silence.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={cta.href} className="btn btn-primary">
              {cta.label}
              <span aria-hidden="true">→</span>
            </Link>
            <Link href="/publish#terms" className="btn btn-quiet">
              Read the terms
            </Link>
          </div>
        </div>
      </section>

      <section className="shell py-16 md:py-24">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="display-lg mt-4 text-ink">Four steps, no gatekeeping</h2>

        <div className="mt-12 grid gap-px bg-line md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.number} className="bg-paper p-6 md:p-7">
              <span className="font-display text-[2.6rem] leading-none text-ember/30">
                {step.number}
              </span>
              <h3 className="mt-4 font-display text-[1.35rem] leading-tight text-ink">
                {step.title}
              </h3>
              <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-muted">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="formats" className="border-y border-line bg-ink text-paper">
        <div className="shell grid gap-12 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="label text-paper/40">Two formats, one studio</p>
            <h2 className="display-lg mt-4">
              ePub for screens.
              <br />
              <span className="italic-display text-ember">PDF for exactness.</span>
            </h2>
            <p className="mt-6 max-w-md text-[0.92rem] leading-relaxed text-paper/60">
              Upload whichever edition you have. Readers are told exactly what they are
              buying, and the file is served from private storage with a signed link
              that expires in two minutes.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: "ePub",
                note: "Reflows on phones and e-readers. Best for prose.",
                mime: "application/epub+zip",
              },
              {
                title: "PDF",
                note: "Fixed layout. Best for illustrated or designed books.",
                mime: "application/pdf",
              },
            ].map((item) => (
              <div key={item.title} className="border border-paper/15 p-6">
                <p className="font-display text-[2rem] leading-none">{item.title}</p>
                <p className="mt-3 text-[0.8rem] leading-relaxed text-paper/60">{item.note}</p>
                <p className="mt-5 font-mono text-[0.65rem] text-paper/35">{item.mime}</p>
              </div>
            ))}
            <div className="border border-paper/15 p-6 sm:col-span-2">
              <p className="label text-paper/40">Cover artwork</p>
              <p className="mt-2 text-[0.85rem] leading-relaxed text-paper/70">
                JPG, PNG or WebP up to 8 MB. Portrait 2:3 recommended — uploaded at
                1600 × 2400 it stays sharp on every shelf and retina screen.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="terms" className="shell py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>The deal</Eyebrow>
            <h2 className="display-lg mt-4 text-ink">Plain terms, in a table</h2>
            <p className="mt-5 max-w-sm text-[0.9rem] leading-relaxed text-ink-muted">
              No hidden clause. This is the whole commercial agreement, and it is the
              same for every author on the press.
            </p>
          </div>

          <dl className="divide-y divide-line border-y border-line">
            {TERMS.map((term) => (
              <div key={term.label} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="label pt-1 text-ink-muted">{term.label}</dt>
                <dd className="text-[0.95rem] text-ink">{term.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 border border-line bg-paper-card p-7">
          <div>
            <p className="font-display text-[1.6rem] leading-tight text-ink">
              Ready when your file is.
            </p>
            <p className="mt-1 text-[0.85rem] text-ink-muted">
              Setting up the studio takes about two minutes.
            </p>
          </div>
          <Link href={cta.href} className="btn btn-ember">
            {cta.label}
          </Link>
        </div>
      </section>
    </>
  );
}
