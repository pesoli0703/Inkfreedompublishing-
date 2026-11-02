import type { Metadata } from "next";
import { CopyrightForm } from "@/components/copyright-form";
import { LegalPage, Clause } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Copyright & Takedown",
  description: "How to file a copyright notice for a title listed on INKFREEDOMPUBLISHING.",
};

export default function CopyrightPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Copyright & Takedown"
      updated="2 November 2026"
      intro="If a title on this platform infringes your rights, file a notice here. Notices are reviewed by a person and every decision is recorded."
    >
      <Clause title="1. What a notice must contain">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your name, email address and, if you act for someone else, your authority to do so.</li>
          <li>The title and, where possible, the link to the listing.</li>
          <li>The work you say is infringed and the basis of your claim.</li>
          <li>A statement that the information is accurate and that you are the rights holder or authorised to act for them.</li>
        </ul>
      </Clause>

      <Clause title="2. What happens next">
        <p>
          A notice is recorded immediately and reviewed. If the claim is credible
          the title can be unpublished while it is investigated, and the author is
          told why. The notice, the review and the resolution are kept on file.
        </p>
      </Clause>

      <Clause title="3. Counter-notice">
        <p>
          An author whose title is affected may respond through the same form,
          quoting the original notice. A counter-notice does not automatically
          restore a listing; it is reviewed by the same process.
        </p>
      </Clause>

      <Clause title="4. Misuse">
        <p>
          Notices are legal statements. Repeated notices that are clearly
          unfounded may be refused, and the complainant may be restricted from
          filing further notices.
        </p>
      </Clause>

      <div className="border-t border-line pt-8">
        <h2 className="font-display text-xl text-navy">File a notice</h2>
        <div className="mt-4">
          <CopyrightForm />
        </div>
      </div>
    </LegalPage>
  );
}
