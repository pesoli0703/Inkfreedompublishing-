import Link from "next/link";
import type { Author } from "@/lib/data/types";

export function AuthorCard({ author }: { author: Author }) {
  return (
    <article className="group relative flex h-full flex-col border border-line bg-white/60 p-6 transition-colors duration-300 hover:border-gold/60 hover:bg-white sm:p-7">
      <div className="flex items-start justify-between">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 font-display text-lg text-gold-deep"
        >
          {author.initials}
        </span>
        <span className="eyebrow text-charcoal-soft">{author.based}</span>
      </div>

      <h3 className="mt-6 font-display text-2xl leading-tight text-navy">
        <Link href={`/authors/${author.slug}`} className="after:absolute after:inset-0">
          {author.name}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-charcoal-soft">
        {author.tagline}
      </p>

      <div className="mt-auto pt-6">
        <span className="inline-flex items-center gap-2 text-[0.7rem] font-semibold tracking-[0.16em] text-navy uppercase transition-colors group-hover:text-gold-deep">
          View profile
          <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </article>
  );
}
