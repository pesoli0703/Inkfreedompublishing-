import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Withdrawal Policy",
  description: "Minimum withdrawals, reserve holds and payout timing for authors.",
};

export default function WithdrawalPolicyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Withdrawal Policy"
      updated="2 November 2026"
      intro="This policy explains when author earnings become available, the minimum withdrawal, and how payouts are made."
    >
      <Clause title="1. When earnings appear">
        <p>
          An author’s share is posted to the ledger only after a payment is
          verified on the server. Nothing appears from an abandoned checkout or
          from a payment that failed verification.
        </p>
      </Clause>

      <Clause title="2. Reserve hold">
        <p>
          Sales are held for seven days after the sale before becoming available
          for withdrawal. The hold exists so that a refund or chargeback inside the
          refund window can be reversed without creating a negative balance. The
          hold applies to the funds, not to the sale: the sale itself is recorded
          immediately.
        </p>
      </Clause>

      <Clause title="3. Minimum withdrawal">
        <p>
          The minimum withdrawal is ₦5,000. Requests below that amount are
          rejected by the platform, and the reason is shown in the author
          dashboard.
        </p>
      </Clause>

      <Clause title="4. How payouts are made">
        <p>
          Payouts are currently made manually by bank transfer to the payout
          account on file. There is no automated payout rail connected. When an
          administrator pays, the reference is recorded against the withdrawal and
          the withdrawal is marked paid.
        </p>
        <p>
          Status changes are visible in the author dashboard: requested, under
          review, approved, processing, paid — or rejected or failed with a
          reason.
        </p>
      </Clause>

      <Clause title="5. Currencies">
        <p>
          Author earnings are held and withdrawn in Nigerian Naira. Sales made in
          other currencies are recorded in that currency and converted for
          reporting using the rate stored on the order. Per-currency totals are
          kept separately and are never netted into a single figure.
        </p>
      </Clause>

      <Clause title="6. Corrections">
        <p>
          If a payout is made in error, the platform may record an adjusting entry
          against the author balance. Every adjustment carries a reason and an
          administrator identity in the audit log.
        </p>
      </Clause>
    </LegalPage>
  );
}
