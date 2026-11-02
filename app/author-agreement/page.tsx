import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Author Agreement",
  description: "The terms an author agrees to when publishing on INKFREEDOMPUBLISHING.",
};

export default function AuthorAgreementPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Author Agreement"
      updated="2 November 2026"
      intro="This summary describes the arrangement between an author and the platform. It is presented for review before production begins and should be read with the Terms of Use."
    >
      <Clause title="1. What you grant">
        <p>
          You keep the copyright in your work. You grant the platform a
          non-exclusive licence to store, display and sell the editions you list,
          for as long as the title is listed, in the territories and formats you
          choose during onboarding.
        </p>
      </Clause>

      <Clause title="2. Exclusivity">
        <p>
          Titles are non-exclusive by default. Any exclusivity period must be
          agreed in writing before production and will be recorded in the title’s
          metadata.
        </p>
      </Clause>

      <Clause title="3. Your responsibilities">
        <ul className="list-disc space-y-1 pl-5">
          <li>You hold the rights you claim, including for images, fonts and quotations.</li>
          <li>The manuscript is yours to publish and is not under another publisher’s exclusive contract.</li>
          <li>You tell us promptly if a rights position changes.</li>
          <li>Your metadata, biography and cover do not misrepresent you or your credentials.</li>
        </ul>
      </Clause>

      <Clause title="4. Editorial review">
        <p>
          Every submission is read by a person. A submission may be approved,
          returned for changes with a written note, or rejected with a reason.
          Approval is not a guarantee of sales.
        </p>
      </Clause>

      <Clause title="5. Royalties">
        <p>
          The split is 90% to the author and 10% to the platform on the listed
          price of each sale. The split is recorded on every order line and in the
          ledger. Payment-gateway fees are recorded separately against the payment
          and are not deducted from your share.
        </p>
        <p>
          Where a sale is refunded, the corresponding author share is reversed.
        </p>
      </Clause>

      <Clause title="6. Pricing">
        <p>
          You set the NGN base price. Prices in other currencies are generated from
          that base using the platform rate table, or an administrative override
          with a recorded reason. You cannot set converted prices yourself because
          that would allow inconsistent pricing between currencies.
        </p>
      </Clause>

      <Clause title="7. Withdrawals">
        <p>
          Earnings become withdrawable after the reserve hold, with a ₦5,000
          minimum. See the{" "}
          <a className="underline" href="/withdrawal-policy">Withdrawal Policy</a>.
        </p>
      </Clause>

      <Clause title="8. Ending the arrangement">
        <p>
          You may withdraw a title from sale at any time. Readers who already
          bought it keep their access unless their purchase is refunded. Removing a
          title does not cancel royalties already earned.
        </p>
      </Clause>
    </LegalPage>
  );
}
