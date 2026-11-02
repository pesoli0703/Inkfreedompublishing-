import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "When INKFREEDOMPUBLISHING refunds an order and how long it takes.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Refund Policy"
      updated="2 November 2026"
      intro="Digital editions cannot be returned once a file has been downloaded. This policy explains the exceptions we apply and how a refund is processed when it is due."
    >
      <Clause title="1. The statutory position">
        <p>
          Because a purchase delivers a file immediately, the seven-day withdrawal
          window described in the{" "}
          <a className="underline" href="/withdrawal-policy">Withdrawal Policy</a>{" "}
          ends when a download is first requested. That is the usual position for
          digital content supplied immediately with your agreement.
        </p>
      </Clause>

      <Clause title="2. When we refund anyway">
        <ul className="list-disc space-y-1 pl-5">
          <li>You were charged twice for the same order.</li>
          <li>You were charged and no entitlement appeared in your library.</li>
          <li>The file is corrupt, is not the edition you bought, or cannot be opened.</li>
          <li>The payment amount or currency does not match the order.</li>
          <li>The title was withdrawn because of a copyright complaint upheld against it.</li>
        </ul>
      </Clause>

      <Clause title="3. How to ask">
        <p>
          Open a support ticket with the order number. We may ask for the
          download record and, where a file is corrupt, a brief description of the
          problem so the author can fix it.
        </p>
      </Clause>

      <Clause title="4. How a refund is paid">
        <p>
          Refunds are returned to the original payment method. They are recorded
          against the original order and the author and platform shares are
          reversed in the ledger — the author does not keep their share of a
          refunded sale. Gateway charges are only refunded where the gateway
          refunds them; they are never deducted silently from an author’s balance.
        </p>
        <p>
          Where a full refund is recorded, the digital entitlement is revoked. A
          partial refund leaves access in place.
        </p>
      </Clause>

      <Clause title="5. Timing">
        <p>
          We review a refund request within five working days. The money reaching
          your account depends on your bank or card issuer, typically three to ten
          working days after the refund is issued.
        </p>
      </Clause>

      <Clause title="6. Print editions">
        <p>
          Print orders that arrive damaged or are not delivered are replaced or
          refunded once the carrier’s report is received. Print orders are not
          currently offered while fulfilment arrangements are finalised.
        </p>
      </Clause>
    </LegalPage>
  );
}
