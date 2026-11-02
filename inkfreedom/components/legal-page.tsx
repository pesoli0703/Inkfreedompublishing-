import { Eyebrow } from "./ui";

export type LegalSection = { heading: string; body: string[] };

export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <section className="border-b border-line bg-paper-deep">
        <div className="shell py-12 md:py-16">
          <Eyebrow>Legal</Eyebrow>
          <h1 className="display-lg mt-4 text-ink">{title}</h1>
          <p className="mt-3 text-[0.78rem] text-ink-muted">Last updated {updated}</p>
        </div>
      </section>

      <section className="shell-tight py-12 md:py-16">
        <p className="text-[1rem] leading-[1.8] text-ink-soft">{intro}</p>

        <div className="mt-10 space-y-9">
          {sections.map((section, index) => (
            <section key={section.heading} id={`s-${index + 1}`}>
              <h2 className="font-display text-[1.45rem] leading-tight text-ink">
                {index + 1}. {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 24)} className="text-[0.92rem] leading-[1.8] text-ink-soft">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </>
  );
}
