import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that govern buying, reading and publishing on INKFREEDOMPUBLISHING.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Use"
      updated="2 November 2026"
      intro="These terms cover use of the INKFREEDOMPUBLISHING website, the purchase of books, and participation as an author. They are written to describe what the platform does rather than to make promises it cannot keep."
    >
      <Clause title="1. Who we are">
        <p>
          INKFREEDOMPUBLISHING is an international independent digital publishing
          marketplace operated by PEACE-TECH MULTIBIZ COMMUNICATIONS, a Nigerian
          Business Name. The storefront sells digital editions and — where a title
          offers them — print editions, and it hosts the author dashboard used to
          submit manuscripts.
        </p>
        <p>
          Contact for any matter in these terms is available through the{" "}
          <a className="underline" href="/contact">contact page</a>.
        </p>
      </Clause>

      <Clause title="2. Your account">
        <p>
          You need an account to buy a book, download a purchase or submit work.
          You are responsible for keeping your email address current and your
          password confidential. Accounts are personal; do not share credentials.
        </p>
        <p>
          Reader accounts are created immediately. Author access opens as soon as
          you choose a pen name in your own account — there is no application to
          be approved, and no publishing contract is signed. Every book you
          upload is reviewed by an editor before it is listed. No one can promote
          themselves to administrator through the website.
        </p>
      </Clause>

      <Clause title="3. Prices, currencies and payment">
        <p>
          Authors set a base price in Nigerian Naira (NGN). Prices shown in US
          Dollars, Pounds Sterling and Euros are derived from that base price
          using a stored exchange rate with a recorded source and timestamp, or
          from an administrative override. Where no acceptable rate or override
          exists, the title is not offered in that currency rather than being
          shown at a guessed price.
        </p>
        <p>
          The currency and the amount are fixed when your order is created. A
          payment is only treated as complete after the payment provider’s
          response has been verified on our server; returning to this website
          after a payment screen is not proof that a payment succeeded.
        </p>
      </Clause>

      <Clause title="4. Licences and permitted use">
        <p>
          Buying a digital edition grants you a non-exclusive, non-transferable
          licence to read that edition for personal use. You may not resell,
          redistribute or publish the file, and you may not remove watermarks or
          rights notices.
        </p>
        <p>
          Download links are personal and time-limited. Sharing a signed link
          gives others temporary access to the file.
        </p>
      </Clause>

      <Clause title="5. Availability and changes">
        <p>
          Titles may be withdrawn from sale by their author or by the platform, for
          example where a copyright complaint is upheld. Withdrawn titles remain
          in the library of readers who already bought them unless the purchase is
          refunded.
        </p>
      </Clause>

      <Clause title="6. Acceptable use">
        <p>
          You agree not to attempt to access content you have not purchased, to
          interfere with the security or availability of the service, or to submit
          material you do not have the rights to publish.
        </p>
      </Clause>

      <Clause title="7. Liability">
        <p>
          The service is provided as described on this site. Nothing in these terms
          excludes liability that cannot be excluded under Nigerian law. Where a
          refund is due, the{" "}
          <a className="underline" href="/refunds">Refund Policy</a> sets out how it
          is handled.
        </p>
      </Clause>
    </LegalPage>
  );
}
