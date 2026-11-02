import type { Metadata } from "next";
import { Clause, LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data INKFREEDOMPUBLISHING collects, why, and how long it is kept.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="2 November 2026"
      intro="This policy describes the personal data the platform actually stores, where it is held, and the choices you have."
    >
      <Clause title="1. Data we hold">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account: name, email address, password hash (held by Supabase Authentication — we never see the password), role and account status.</li>
          <li>Contact and delivery: phone number where you supply it, and a shipping address if you buy a print edition.</li>
          <li>Orders: what you bought, the currency and amount, and the payment reference issued by the gateway.</li>
          <li>Downloads: which file was requested and when. We do not store the signed link itself after it is issued.</li>
          <li>Author applicants: pen name, biography, country, photograph and the details you choose to submit for review.</li>
          <li>Support: the messages you send through the ticket system.</li>
        </ul>
      </Clause>

      <Clause title="2. Payment data">
        <p>
          Card details never reach our servers. Checkout is completed on the
          payment provider’s hosted flow, and only the reference, amount, currency
          and verification status are stored on our side.
        </p>
      </Clause>

      <Clause title="3. Why we hold it">
        <p>
          To create and secure your account, to deliver purchases, to compute
          author earnings and payouts, to answer support requests, to meet
          accounting and tax obligations, and to detect fraud and abuse.
        </p>
      </Clause>

      <Clause title="4. Who processes it">
        <p>
          Supabase provides authentication, database and file storage. Vercel
          serves the website. The payment provider (Flutterwave) processes
          payments. Each processor handles only the data needed for its function.
        </p>
      </Clause>

      <Clause title="5. Retention">
        <p>
          Order and payment records are kept for as long as accounting and tax
          rules require. Account data is kept while the account is open. Download
          events are kept for abuse investigation. Support tickets are kept for two
          years after the last reply.
        </p>
      </Clause>

      <Clause title="6. Your rights">
        <p>
          Under the Nigeria Data Protection Act 2023 you can ask for a copy of your
          data, ask for corrections, object to certain processing, and ask for
          deletion where there is no overriding legal obligation to retain it.
          Requests go through the <a className="underline" href="/contact">contact page</a>.
          We answer within the periods required by that Act.
        </p>
      </Clause>

      <Clause title="7. Cookies">
        <p>
          The site sets cookies required to keep you signed in and to protect
          forms. It does not set advertising cookies.
        </p>
      </Clause>
    </LegalPage>
  );
}
