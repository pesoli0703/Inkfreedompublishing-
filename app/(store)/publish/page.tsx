import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Publish & Sell Your eBooks",
  description:
    "Self-publish on INKFREEDOMPUBLISHING: create an account, upload your eBook, set your price and submit for approval. No application fee, no publishing contract.",
};

const steps = [
  {
    number: "01",
    title: "Create an account",
    body: "Register with your email address and open your author workspace immediately. No application, no interview, nobody deciding whether you are allowed to write.",
    detail: ["Email and password", "Workspace opens straight away"],
  },
  {
    number: "02",
    title: "Upload your eBook",
    body: "Add your title, description, cover image and the book itself as a PDF or EPUB. Files are stored privately and only ever served to a reader after a verified purchase.",
    detail: ["Cover image", "PDF or EPUB manuscript"],
  },
  {
    number: "03",
    title: "Set your price",
    body: "Choose your selling price in naira. We convert it for readers in other currencies using the daily rate table, and you can see every converted price before you publish.",
    detail: ["You set one NGN price", "Other currencies converted for you"],
  },
  {
    number: "04",
    title: "Submit for approval",
    body: "Our admin team reviews the book. Once approved it appears in the public bookstore, and readers can buy it — this check protects readers, and it protects you.",
    detail: ["Reviewed by an administrator", "Live in the bookstore once approved"],
  },
];

const faqs = [
  {
    q: "Do I pay to publish?",
    a: "No. There is no application fee and no publishing fee. We take 10% of each sale and you keep 90%, before the payment gateway's own fees are charged separately.",
  },
  {
    q: "Do I sign a publishing contract?",
    a: "No publishing contract and no rights transfer. You keep the copyright to your work. We hold only a non-exclusive licence to sell the editions you upload, while they are listed here — you can withdraw a title at any time and publish it anywhere else.",
  },
  {
    q: "Who approves my book?",
    a: "An administrator checks every submission before it goes on sale. That review covers the basics — that the files are readable, the listing is complete and the book is yours to sell. You are not being judged on whether your writing deserves to exist.",
  },
  {
    q: "How soon is my book live?",
    a: "As soon as an administrator approves it. There is no production queue, no typesetting and no print run to wait for — it is your file, uploaded and listed.",
  },
  {
    q: "What do I earn?",
    a: "90% of the sale price on every copy sold, held in your author balance and paid out to your bank account. The figure is recorded per order line, so nothing is rounded in our favour.",
  },
];

export default function PublishPage() {
  return (
    <>
      <section className="border-b border-line bg-white paper-texture">
        <div className="container-editorial py-12 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-[0.7rem] text-charcoal-soft">
            <Link href="/" className="transition-colors hover:text-navy">
              Home
            </Link>
            <span aria-hidden="true" className="mx-2">
              /
            </span>
            <span className="text-navy">Publish</span>
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="eyebrow text-gold-deep">For independent authors</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.04] text-navy sm:text-5xl lg:text-[3.4rem]">
                Publish and sell
                <span className="block italic text-gold-deep">
                  your eBooks here.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[0.97rem] leading-relaxed text-charcoal-soft">
                You write your book, upload it, set your price and earn from every
                sale. No application fee. No publishing contract. No waiting for
                an editor to accept you.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex bg-navy px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
                >
                  Create an account
                </Link>
                <Link
                  href="/author"
                  className="inline-flex border border-navy/25 px-7 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy hover:bg-navy/5"
                >
                  I already have an account
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 lg:pt-10">
              <div className="border border-gold/40 bg-gold/8 p-6">
                <p className="eyebrow text-gold-deep">You are in control</p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-charcoal">
                  You keep the rights to your work. We take 10% of each sale and
                  you keep 90%. Every book is checked by an administrator before
                  it goes on sale, and you can unpublish a title at any time.
                </p>
                <p className="mt-4 border-t border-gold/30 pt-4 text-[0.78rem] leading-relaxed text-charcoal-soft">
                  Card payments open once the purchase and download journey has
                  been verified end to end. Until then your book can be uploaded,
                  approved and listed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-editorial py-16 sm:py-20">
        <SectionHeading
          eyebrow="The process"
          title="How self-publishing works"
          description="Four steps, no gatekeepers between you and your reader."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {steps.map((step) => (
            <article key={step.number} className="border border-line bg-white p-7 sm:p-9">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-sm tracking-[0.2em] text-gold-deep">
                  {step.number}
                </span>
                <h3 className="font-display text-2xl text-navy">{step.title}</h3>
              </div>
              <p className="mt-4 text-[0.92rem] leading-relaxed text-charcoal-soft">
                {step.body}
              </p>
              <ul className="mt-5 space-y-2 border-t border-line pt-4">
                {step.detail.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[0.8rem] text-charcoal-soft"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-ivory-deep/70">
        <div className="container-editorial py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading
                eyebrow="The money"
                title="You keep 90%"
                description="Clear terms, stated before you upload anything."
              />
            </div>
            <div className="lg:col-span-7">
              <div className="overflow-hidden border border-line bg-ivory">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">
                    Author earnings on a ₦5,000 sale
                  </caption>
                  <tbody>
                    <tr className="border-b border-line">
                      <th scope="row" className="px-5 py-4 font-normal text-charcoal-soft sm:px-7">
                        Reader pays
                      </th>
                      <td className="px-5 py-4 text-right font-display text-lg text-navy sm:px-7">
                        ₦5,000
                      </td>
                    </tr>
                    <tr className="border-b border-line">
                      <th scope="row" className="px-5 py-4 font-normal text-charcoal-soft sm:px-7">
                        You earn (90%)
                      </th>
                      <td className="px-5 py-4 text-right font-display text-lg text-navy sm:px-7">
                        ₦4,500
                      </td>
                    </tr>
                    <tr>
                      <th scope="row" className="px-5 py-4 font-normal text-charcoal-soft sm:px-7">
                        Platform fee (10%)
                      </th>
                      <td className="px-5 py-4 text-right text-charcoal-soft sm:px-7">
                        ₦500
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[0.78rem] leading-relaxed text-charcoal-soft">
                Payment-gateway fees and any refunds are charged separately and
                shown on your statement. You never set converted prices — we
                convert your naira price for readers in other currencies and
                record the rate and the date it was used.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="submit" className="container-editorial scroll-mt-24 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="Start"
              title="Open your author workspace"
              description="Sign in, choose the name that appears on your books, and upload your first title."
            />
            <div id="terms" className="mt-8 scroll-mt-24 border border-line bg-ivory p-5">
              <p className="eyebrow text-charcoal-soft">Author terms</p>
              <p className="mt-2.5 text-[0.8rem] leading-relaxed text-charcoal-soft">
                A non-exclusive licence, not a publishing contract: you keep the
                copyright, we may sell the editions you upload, and you can
                withdraw a title whenever you like. Commission is 90% to you and
                10% to the platform.
              </p>
              <Link
                href="/author-agreement"
                className="mt-3 inline-block text-[0.7rem] font-semibold tracking-[0.14em] text-gold-deep uppercase hover:text-navy"
              >
                Read the author terms →
              </Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="border border-line bg-white p-6 sm:p-9">
              <h2 className="font-display text-2xl text-navy">Ready to publish?</h2>
              <ol className="mt-5 space-y-4 text-[0.9rem] leading-relaxed text-charcoal-soft">
                <li className="flex gap-4">
                  <span className="font-display text-sm tracking-[0.18em] text-gold-deep">01</span>
                  <span>Create an account with your email address.</span>
                </li>
                <li className="flex gap-4">
                  <span className="font-display text-sm tracking-[0.18em] text-gold-deep">02</span>
                  <span>
                    Choose your pen name — your workspace opens immediately.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="font-display text-sm tracking-[0.18em] text-gold-deep">03</span>
                  <span>
                    Add the book: cover, description, PDF or EPUB, and your price.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="font-display text-sm tracking-[0.18em] text-gold-deep">04</span>
                  <span>Submit it. An administrator approves it and it goes live.</span>
                </li>
              </ol>

              <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
                <Link
                  href="/register"
                  className="inline-flex bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
                >
                  Create an account
                </Link>
                <Link
                  href="/author"
                  className="inline-flex border border-navy/25 px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] text-navy uppercase transition-colors hover:border-navy"
                >
                  Become an author
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="container-editorial py-16 sm:py-20">
          <SectionHeading eyebrow="Questions" title="Before you start" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="border-t border-line pt-5">
                <h3 className="font-display text-lg text-navy">{faq.q}</h3>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-charcoal-soft">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
