import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      updated="2 November 2026"
      intro="These terms govern the use of Inkfreedom by readers and authors. They are written to be read. Where they are unclear, write to the press and we will correct them."
      sections={[
        {
          heading: "Accounts",
          body: [
            "You need an account to buy or publish. You are responsible for the accuracy of the details you give and for keeping your password private.",
            "An account may hold one role at a time: reader, author or administrator. A reader can add an author studio to the same account at any time.",
          ],
        },
        {
          heading: "Buying an ebook",
          body: [
            "A purchase grants you a personal, non-transferable licence to read the edition you bought. You may keep the file on your own devices for your own reading.",
            "You may not resell, redistribute, or publish the file. The author retains copyright in the work.",
            "Because digital downloads cannot be returned once accessed, purchases are final except where the file is faulty or was not delivered. Contact the press and we will resolve it.",
          ],
        },
        {
          heading: "Publishing",
          body: [
            "By uploading a title you confirm that you are the author or rights holder, or that you have permission to publish it.",
            "You grant Inkfreedom a non-exclusive licence to store, display and deliver the file to readers who buy it. You keep copyright and may publish the same work anywhere else.",
            "The press may decline or remove a listing that infringes rights, misrepresents its contents, or breaches these terms. Authors are told the reason.",
          ],
        },
        {
          heading: "Royalties",
          body: [
            "Authors receive 90% of each sale, with 10% retained by the press to operate the store and deliver files. The split is recorded per order at the time of sale.",
            "Royalties become available for payout once an order is marked paid. Payouts are requested from the author studio and settled by the press.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Do not attempt to access files you have not purchased, interfere with the service, or upload malicious content.",
            "We may suspend an account that abuses the store, defrauds readers, or infringes another person's rights.",
          ],
        },
        {
          heading: "Changes",
          body: [
            "These terms may be updated. Material changes are announced on this page with a new date, and existing purchases are never affected.",
          ],
        },
      ]}
    />
  );
}
