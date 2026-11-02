import Link from "next/link";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 9.4C12.7 6.9 8.2 6.1 3.6 6.6v18.1c4.5-.5 9 .3 12.4 2.7" />
      <path d="M16 9.4c3.3-2.5 7.8-3.3 12.4-2.8v18.1c-4.5-.5-9 .3-12.4 2.7" />
      <path d="M16 9.4v17.9" opacity={0.45} />
      <path d="M7.6 12.2h4.6M7.6 15.6h4.6M19.8 12.2h4.6M19.8 15.6h4.6" opacity={0.5} />
    </svg>
  );
}

export function Wordmark({
  tone = "navy",
  showTagline = true,
  className = "",
}: {
  tone?: "navy" | "ivory";
  showTagline?: boolean;
  className?: string;
}) {
  const ink = tone === "ivory" ? "text-ivory" : "text-navy";
  const accent = tone === "ivory" ? "text-gold-soft" : "text-gold-deep";

  return (
    <Link
      href="/"
      aria-label="INKFREEDOMPUBLISHING — home"
      className={`group inline-flex items-center gap-2.5 sm:gap-3 ${className}`}
    >
      <BrandMark
        className={`h-8 w-8 shrink-0 transition-transform duration-500 group-hover:-rotate-3 sm:h-9 sm:w-9 ${accent}`}
      />
      <span className="flex flex-col leading-none">
        <span
          className={`font-display text-[0.95rem] font-semibold tracking-[0.16em] sm:text-[1.05rem] ${ink}`}
        >
          INKFREEDOM
        </span>
        {showTagline ? (
          <span
            className={`mt-1 text-[0.5rem] font-semibold tracking-[0.42em] sm:text-[0.55rem] ${accent}`}
          >
            PUBLISHING
          </span>
        ) : null}
      </span>
    </Link>
  );
}
