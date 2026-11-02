import Link from "next/link";
import type { ReactNode } from "react";

export type NavSection = {
  label: string;
  items: { href: string; label: string; badge?: number | string }[];
};

export function DashboardShell({
  eyebrow,
  title,
  description,
  sections,
  aside,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  sections: NavSection[];
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="container-editorial py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-7">
        <div>
          <p className="eyebrow text-gold-deep">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl leading-tight text-navy sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-2xl text-[0.9rem] leading-relaxed text-charcoal-soft">
              {description}
            </p>
          )}
        </div>
        {aside}
      </div>

      <div className="mt-9 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <nav aria-label="Dashboard" className="lg:col-span-3">
          <div className="space-y-7">
            {sections.map((section) => (
              <div key={section.label}>
                <p className="text-[0.62rem] font-semibold tracking-[0.18em] text-charcoal-soft uppercase">
                  {section.label}
                </p>
                <ul className="mt-3 space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-2 border-l-2 border-transparent py-2 pl-3 text-[0.87rem] text-charcoal transition-colors hover:border-gold hover:text-navy"
                      >
                        <span>{item.label}</span>
                        {item.badge !== undefined && item.badge !== 0 && (
                          <span className="bg-ivory-warm px-2 py-0.5 text-[0.68rem] font-semibold text-navy">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  tone = "default",
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  tone?: "default" | "warning" | "quiet";
}) {
  const tones = {
    default: "border-line bg-white",
    warning: "border-gold/50 bg-ivory",
    quiet: "border-line bg-ivory/60",
  } as const;

  return (
    <section className={`border ${tones[tone]} p-6 sm:p-7`}>
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          {title && (
            <h2 className="font-display text-xl text-navy">{title}</h2>
          )}
          {action}
        </div>
      )}
      <div className={title || action ? "mt-5" : ""}>{children}</div>
    </section>
  );
}

export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-line bg-ivory/50 p-7 text-center">
      <p className="font-display text-lg text-navy">{title}</p>
      {children && (
        <div className="mx-auto mt-2 max-w-md text-[0.85rem] leading-relaxed text-charcoal-soft">
          {children}
        </div>
      )}
    </div>
  );
}

export function StatGrid({
  stats,
}: {
  stats: { label: string; value: string; note?: string }[];
}) {
  return (
    <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white p-5">
          <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-charcoal-soft uppercase">
            {stat.label}
          </p>
          <p className="mt-2 font-display text-2xl text-navy">{stat.value}</p>
          {stat.note && (
            <p className="mt-1 text-[0.72rem] text-charcoal-soft">{stat.note}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export function NotConfigured({ what }: { what: string }) {
  return (
    <Panel tone="warning">
      <p className="eyebrow text-charcoal-soft">Not connected</p>
      <p className="mt-3 text-[0.85rem] leading-relaxed text-charcoal">
        {what} is not connected on this deployment. Set the Supabase
        environment variables and this page will read live data. Nothing is
        shown here because showing placeholder numbers would be misleading.
      </p>
    </Panel>
  );
}
