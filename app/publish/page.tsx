import type { Metadata } from "next";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { SubmissionForm } from "@/components/submission-form";

export const metadata: Metadata = {
  title: "Publish With Us",
  description:
    "How publishing works at INKFREEDOMPUBLISHING — submission, editorial review, design, production and sales for independent authors.",
};

const stages = [
  {
    number: "01",
    title: "Submission",
    lead: "You send the book, not just an idea.",
    body: "A synopsis, a short author note and a sample chapter or poem sequence. We accept work in English and in translation where rights are clear. There is no fee to submit.",
    detail: ["Synopsis of 200–400 words", "Sample of 2,000–4,000 words", "Author note, 100 words"],
  },
  {
    number: "02",
    title: "Editorial review",
    lead: "An editor reads it properly.",
    body: "We assess fit with the list, structure and readiness. If a manuscript needs a development pass before publication, we tell you what we think the book needs and quote that work separately.",
    detail: ["Response either way", "Structural notes where useful", "No obligation to publish"],
  },
  {
    number: "03",
    title: "Design & production",
    lead: "The book gets its clothes.",
    body: "Cover design, typesetting, proof rounds and production files are handled in-house. You approve the cover and the final proofs before anything goes to print.",
    detail: ["Cover design", "Typesetting & proofs", "Print and ebook files"],
  },
  {
    number: "04",
    title: "Publication & sales",
    lead: "On the shelf, and paid properly.",
    body: "We list the title on this marketplace in print and digital editions. Royalty terms are agreed in writing before production starts, and payments will run through Flutterwave once that integration goes live.",
    detail: ["Listing on the marketplace", "Royalty schedule in writing", "Payments via Flutterwave (pending)"],
  },
];

const accepted = [
  { category: "Literary fiction", detail: "Novels and story collections, 60,000–110,000 words." },
  { category: "Poetry", detail: "Full collections, 48–96 pages." },
  { category: "Essays & criticism", detail: "Proposals with two sample essays and a contents plan." },
  { category: "Memoir & biography", detail: "Proposals with two sample chapters." },
  { category: "Business & leadership", detail: "Practitioner books with a clear reader and a clear use." },
  { category: "Children & young readers", detail: "Picture books and early readers, with or without artwork." },
];

const faqs = [
  {
    q: "Do I pay to publish?",
    a: "There is no fee to submit. Where a manuscript needs significant development work before publication, that is quoted transparently and agreed before anything begins. Commercial terms will be set out in writing in the author agreement.",
  },
  {
    q: "Do I keep the rights to my book?",
    a: "Rights are licensed per title, not assigned wholesale, and the licence terms are agreed before production starts. The full author agreement will be published on this site before submissions open fully.",
  },
  {
    q: "Is the submission form live?",
    a: "Not yet. This build shows the intended submission interface. The form, file uploads and submissions inbox are not connected, so nothing is transmitted or stored when you submit it here.",
  },
  {
    q: "How long does publication take?",
    a: "Timelines depend on the state of the manuscript and the number of titles in production. Once a book is accepted we agree a production schedule with you in writing.",
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
            <span className="text-navy">Publish with us</span>
          </nav>

          <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <p className="eyebrow text-gold-deep">For independent authors</p>
              <h1 className="mt-4 font-display text-4xl leading-[1.04] text-navy sm:text-5xl lg:text-[3.4rem]">
                How publishing
                <span className="block italic text-gold-deep">works here.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[0.97rem] leading-relaxed text-charcoal-soft">
                Four stages, one editor, and terms agreed before production.
                We are building this process for writers who want a publisher
                rather than a platform.
              </p>
            </div>
            <div className="lg:col-span-5 lg:pt-10">
              <div className="border border-gold/40 bg-gold/8 p-6">
                <p className="eyebrow text-gold-deep">Please note</p>
                <p className="mt-3 text-[0.85rem] leading-relaxed text-charcoal-soft">
                  Submissions, file uploads and author accounts are not connected
                  in this preview build. The form below is a design preview and
                  does not send anything.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-editorial py-16 sm:py-20">
        <SectionHeading eyebrow="The process" title="From manuscript to marketplace" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {stages.map((stage) => (
            <article key={stage.number} className="border border-line bg-white p-7 sm:p-9">
              <div className="flex items-baseline gap-4">
                <span className="font-display text-sm tracking-[0.2em] text-gold-deep">
                  {stage.number}
                </span>
                <h3 className="font-display text-2xl text-navy">{stage.title}</h3>
              </div>
              <p className="mt-3 font-display text-lg text-charcoal">{stage.lead}</p>
              <p className="mt-3 text-[0.9rem] leading-relaxed text-charcoal-soft">
                {stage.body}
              </p>
              <ul className="mt-5 space-y-2 border-t border-line pt-4">
                {stage.detail.map((item) => (
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
          <SectionHeading
            eyebrow="What we are reading"
            title="Currently open to"
            description="We keep the list small so each title gets proper attention."
          />
          <div className="mt-10 overflow-hidden border border-line bg-ivory">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Categories currently open to submissions and their requirements
              </caption>
              <thead className="bg-white">
                <tr>
                  <th scope="col" className="px-5 py-4 text-[0.65rem] tracking-[0.16em] text-charcoal-soft uppercase sm:px-7">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-4 text-[0.65rem] tracking-[0.16em] text-charcoal-soft uppercase sm:px-7">
                    What to send
                  </th>
                </tr>
              </thead>
              <tbody>
                {accepted.map((row) => (
                  <tr key={row.category} className="border-t border-line">
                    <th scope="row" className="px-5 py-4 align-top font-display text-base font-medium text-navy sm:px-7">
                      {row.category}
                    </th>
                    <td className="px-5 py-4 align-top text-charcoal-soft sm:px-7">
                      {row.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="submit" className="container-editorial scroll-mt-24 py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-4">
            <SectionHeading
              eyebrow="Submit"
              title="Start a submission"
              description="A short proposal is enough for a first read. We reply to every submission."
            />
            <div id="terms" className="mt-8 scroll-mt-24 border border-line bg-ivory p-5">
              <p className="eyebrow text-charcoal-soft">Author terms</p>
              <p className="mt-2.5 text-[0.8rem] leading-relaxed text-charcoal-soft">
                Draft only. The author agreement — covering rights, royalties,
                production responsibilities and termination — will be published
                here in full before submissions open.
              </p>
              <Link
                href="/policies#terms"
                className="mt-3 inline-block text-[0.7rem] font-semibold tracking-[0.14em] text-gold-deep uppercase hover:text-navy"
              >
                Read the site policies →
              </Link>
            </div>
          </div>
          <div className="lg:col-span-8">
            <SubmissionForm />
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-white">
        <div className="container-editorial py-16 sm:py-20">
          <SectionHeading eyebrow="Questions" title="Before you send" />
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
