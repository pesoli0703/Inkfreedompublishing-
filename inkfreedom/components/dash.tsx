import Link from "next/link";
import type { ReactNode } from "react";

export function PageHead({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-6">
      <div>
        <p className="label text-ink-muted">{eyebrow}</p>
        <h1 className="display-md mt-2.5 text-ink">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-[0.85rem] leading-relaxed text-ink-muted">
            {description}
          </p>
        ) : null}
      </div>
      {aside}
    </div>
  );
}

export function Kpi({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "plain" | "ink" | "ember";
}) {
  const tones = {
    plain: "border-line bg-paper-card text-ink",
    ink: "border-ink bg-ink text-paper",
    ember: "border-ember bg-ember text-[#fff6f0]",
  };
  const muted = tone === "plain" ? "text-ink-muted" : "opacity-60";

  return (
    <div className={`border p-5 ${tones[tone]}`}>
      <p className={`label ${muted}`}>{label}</p>
      <p className="mt-3 font-display text-[1.9rem] leading-none tracking-[-0.02em]">{value}</p>
      {hint ? <p className={`mt-2 text-[0.72rem] ${muted}`}>{hint}</p> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  published: "border-[#cbd9c1] bg-[#eaf0e4] text-[#3f5a33]",
  paid: "border-[#cbd9c1] bg-[#eaf0e4] text-[#3f5a33]",
  approved: "border-[#cbd9c1] bg-[#eaf0e4] text-[#3f5a33]",
  active: "border-[#cbd9c1] bg-[#eaf0e4] text-[#3f5a33]",
  pending: "border-[#e6d3ab] bg-[#f7efdc] text-[#8a6321]",
  requested: "border-[#e6d3ab] bg-[#f7efdc] text-[#8a6321]",
  draft: "border-line bg-paper-deep text-ink-soft",
  rejected: "border-ember/25 bg-ember/10 text-ember-deep",
  failed: "border-ember/25 bg-ember/10 text-ember-deep",
  suspended: "border-ember/25 bg-ember/10 text-ember-deep",
  refunded: "border-line bg-paper-deep text-ink-soft",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-medium capitalize ${
        STATUS_STYLES[status] ?? "border-line bg-paper-deep text-ink-soft"
      }`}
    >
      {status}
    </span>
  );
}

export function Panel({
  title,
  aside,
  children,
  className = "",
}: {
  title?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-line bg-paper-card ${className}`}>
      {title ? (
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="font-display text-[1.15rem] text-ink">{title}</h2>
          {aside}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function TableShell({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left">
        <thead>
          <tr className="border-b border-line">
            {head.map((cell) => (
              <th key={cell} className="label px-4 py-3 font-medium text-ink-muted first:pl-5">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-[0.82rem] text-ink-muted">
        {children}
      </td>
    </tr>
  );
}

export function Crumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav className="mb-5 flex items-center gap-2 text-[0.75rem] text-ink-muted">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true">/</span> : null}
          {item.href ? (
            <Link href={item.href} className="hover:text-ink">
              {item.label}
            </Link>
          ) : (
            <span className="text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** A tiny CSS bar chart — no chart library, no client JS. */
export function Sparkbars({
  data,
  height = 56,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));
  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((point) => (
          <div
            key={point.label}
            className="group relative flex-1 rounded-sm bg-ink/85 transition-colors hover:bg-ember"
            style={{ height: `${Math.max(3, (point.value / max) * 100)}%` }}
            title={`${point.label}: ${point.value}`}
          >
            <span className="sr-only">
              {point.label}: {point.value}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[0.62rem] text-ink-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
