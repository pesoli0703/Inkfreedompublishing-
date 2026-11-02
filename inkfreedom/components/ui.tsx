import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({
  children,
  tone = "muted",
  className = "",
}: {
  children: ReactNode;
  tone?: "muted" | "ink" | "paper" | "ember";
  className?: string;
}) {
  const tones = {
    muted: "text-ink-muted",
    ink: "text-ink",
    paper: "text-paper/70",
    ember: "text-ember",
  };
  return <p className={`label ${tones[tone]} ${className}`}>{children}</p>;
}

export function SectionHead({
  eyebrow,
  title,
  aside,
  tone = "ink",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  aside?: ReactNode;
  tone?: "ink" | "paper";
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-6 ${className}`}>
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow tone={tone === "paper" ? "paper" : "muted"}>{eyebrow}</Eyebrow> : null}
        <h2 className={`${tone === "paper" ? "text-paper" : "text-ink"} display-md mt-3`}>
          {title}
        </h2>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function TextLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-sm font-medium text-ink ${className}`}
    >
      <span className="border-b border-ink/25 pb-0.5 transition-colors group-hover:border-ember group-hover:text-ember">
        {children}
      </span>
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ember" | "green" | "amber" | "ink";
}) {
  const tones = {
    neutral: "bg-paper-deep text-ink-soft border-line",
    ember: "bg-ember/10 text-ember-deep border-ember/25",
    green: "bg-[#eaf0e4] text-[#3f5a33] border-[#cbd9c1]",
    amber: "bg-[#f7efdc] text-[#8a6321] border-[#e6d3ab]",
    ink: "bg-ink text-paper border-ink",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-[0.02em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-line bg-paper-card/60 px-6 py-16 text-center">
      <h3 className="display-md text-ink">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">{body}</p>
      {action ? <div className="mt-7 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Stat({
  value,
  label,
  tone = "ink",
}: {
  value: ReactNode;
  label: string;
  tone?: "ink" | "paper";
}) {
  return (
    <div>
      <p
        className={`font-display text-[2rem] leading-none tracking-[-0.02em] ${
          tone === "paper" ? "text-paper" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className={`label mt-2 ${tone === "paper" ? "text-paper/50" : "text-ink-muted"}`}>
        {label}
      </p>
    </div>
  );
}
