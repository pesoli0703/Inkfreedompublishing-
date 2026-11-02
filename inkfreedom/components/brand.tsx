import Link from "next/link";

export function Wordmark({
  className = "",
  tone = "ink",
  size = "md",
}: {
  className?: string;
  tone?: "ink" | "paper";
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: "text-[1.35rem]",
    md: "text-[1.6rem]",
    lg: "text-[2rem]",
  };

  return (
    <Link
      href="/"
      aria-label="Inkfreedom home"
      className={`group inline-flex items-baseline gap-[0.15em] font-display tracking-[-0.03em] ${sizes[size]} ${
        tone === "paper" ? "text-paper" : "text-ink"
      } ${className}`}
    >
      <span className="inline-block">Inkfreedom</span>
      <span
        aria-hidden="true"
        className="mb-[0.12em] inline-block h-[0.22em] w-[0.22em] rounded-full bg-ember transition-transform duration-500 group-hover:scale-150"
      />
    </Link>
  );
}

export function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-9 w-9 place-items-center rounded-full bg-ink text-paper ${className}`}
    >
      <span className="font-display text-[1.05rem] leading-none">I</span>
    </span>
  );
}
