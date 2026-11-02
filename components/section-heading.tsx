import Link from "next/link";
import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  tone = "light",
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: { href: string; label: string };
  tone?: "light" | "dark";
  align?: "left" | "center";
}) {
  const dark = tone === "dark";

  return (
    <div
      className={`flex flex-col gap-5 ${
        align === "center"
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between"
      }`}
    >
      <div className={align === "center" ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow ? (
          <p className={`eyebrow ${dark ? "text-gold-soft" : "text-gold-deep"}`}>
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={`mt-3 font-display text-3xl leading-[1.1] sm:text-4xl lg:text-[2.75rem] ${
            dark ? "text-ivory" : "text-navy"
          }`}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={`mt-4 max-w-xl text-[0.95rem] leading-relaxed ${
              dark ? "text-ivory/65" : "text-charcoal-soft"
            }`}
          >
            {description}
          </p>
        ) : null}
      </div>

      {action ? (
        <Link
          href={action.href}
          className={`group inline-flex shrink-0 items-center gap-2 self-start border-b pb-1 text-[0.72rem] font-semibold tracking-[0.18em] uppercase transition-colors sm:self-auto ${
            dark
              ? "border-white/25 text-ivory hover:border-gold hover:text-gold-soft"
              : "border-navy/25 text-navy hover:border-gold-deep hover:text-gold-deep"
          }`}
        >
          {action.label}
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      ) : null}
    </div>
  );
}
