import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="2 November 2026"
      intro="Inkfreedom collects the least it can in order to run a bookstore: an account, a purchase record, and the files you upload."
      sections={[
        {
          heading: "What we collect",
          body: [
            "Account data: your name, email address and a hashed password. Authentication is handled by Supabase.",
            "Purchase data: which editions you bought, when, and the order reference. This is what makes your library and the author's royalty possible.",
            "Author data: the title, description, cover and ebook file you upload, plus payout requests.",
          ],
        },
        {
          heading: "What we do not collect",
          body: [
            "No card details are stored on our servers. Payment processing, when connected, is handled by the processor and we only receive a reference and a status.",
            "No advertising trackers are embedded in the store.",
          ],
        },
        {
          heading: "How files are stored",
          body: [
            "Cover artwork is public, because it is displayed on the shelf. Ebook files are stored in a private bucket with no public read access.",
            "Downloads are issued as signed links that expire after two minutes, and only after the server confirms a purchase.",
          ],
        },
        {
          heading: "Who can see what",
          body: [
            "Readers see their own library, orders and wishlist. Authors see their own titles, sales and royalties. Administrators can see all records in order to moderate listings and settle payouts.",
            "Database access rules are enforced in the database itself, not only in the interface.",
          ],
        },
        {
          heading: "Your rights",
          body: [
            "You can correct your details or ask for your account to be deleted by writing to hello@inkfreedom.app.",
            "Deleting an account removes your personal data. Purchase records may be retained where needed for accounting.",
          ],
        },
      ]}
    />
  );
}
