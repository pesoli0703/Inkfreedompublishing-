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
      intro="This is a non-exclusive licence to sell your books, not a publishing contract. You keep the copyright, you set the price, and you can withdraw a title whenever you like. Read it with the Terms of Use."
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
          Nothing here is exclusive. You may sell the same book anywhere else, in
          any edition, at any price. No exclusivity period is offered or required.
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

      <Clause title="4. Review before publication">
        <p>
          You publish on your own account — there is no application to be accepted
          for and no editorial gate in front of the upload form. Each book is
          checked by an administrator before it goes on sale: that the files open,
          that the listing is complete, and that the work is yours to sell. A book
          may be approved, returned for changes with a written note, or rejected
          with a reason. Approval is not a guarantee of sales.
        </p>
      </Clause>

      <Clause title="5. Royalties">
        <p>
          There is no fee to publish. The split is 90% to the author and 10% to
          the platform on the listed price of each sale. The split is recorded on every order line and in the
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
