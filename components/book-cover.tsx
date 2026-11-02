import type { Book } from "@/lib/data/types";
import { authorName } from "@/lib/catalogue";
import { publicAssetUrl } from "@/lib/catalogue-live";

/**
 * A title's cover.
 *
 * Uploaded artwork is shown when the book has one. Otherwise a typographic
 * cover is generated from the book's own details — stable for a given title,
 * and replaced automatically the moment an author uploads a real cover.
 */
export function BookCover({
  book,
  className = "",
  priority = false,
  decorative = false,
}: {
  book: Book;
  className?: string;
  priority?: boolean;
  /** Hides the cover from assistive tech when the surrounding card already
   *  announces the title and author. */
  decorative?: boolean;
}) {
  const { bg, ink, accent, motif } = book.cover;
  const dark = isDark(bg);
  const artwork = publicAssetUrl("book-covers", book.coverPath);

  if (artwork) {
    return (
      <div
        className={`relative isolate aspect-2/3 w-full overflow-hidden rounded-[2px] bg-ivory-deep shadow-[0_1px_1px_rgba(16,28,50,0.08),0_10px_24px_-12px_rgba(16,28,50,0.45)] ${className}`}
        data-priority={priority ? "true" : undefined}
        aria-hidden={decorative || undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={artwork}
          alt={decorative ? "" : `${book.title} by ${authorName(book)}`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`relative isolate aspect-2/3 w-full overflow-hidden rounded-[2px] shadow-[0_1px_1px_rgba(16,28,50,0.08),0_10px_24px_-12px_rgba(16,28,50,0.45)] ${className}`}
      style={{ backgroundColor: bg, color: ink, containerType: "inline-size" }}
      data-priority={priority ? "true" : undefined}
      aria-hidden={decorative || undefined}
    >
      {/* Spine shading */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[7%]"
        style={{
          background: `linear-gradient(90deg, rgba(0,0,0,${dark ? 0.38 : 0.14}), rgba(0,0,0,0) 90%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-[7%] w-px"
        style={{ backgroundColor: accent, opacity: 0.28 }}
      />

      <Motif motif={motif} accent={accent} dark={dark} />

      {/* Cover typography */}
      <div className="relative flex h-full flex-col justify-between px-[11%] py-[9%] pl-[14%]">
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-semibold leading-none tracking-[0.3em] uppercase opacity-70"
            style={{ fontSize: "clamp(0.3rem, 3.5cqw, 0.47rem)" }}
          >
            Inkfreedom
          </span>
          <span
            aria-hidden="true"
            className="h-px flex-1"
            style={{ backgroundColor: accent, opacity: 0.6 }}
          />
        </div>

        <div className="py-1">
          <p
            className="font-display leading-[1.08] font-semibold tracking-[-0.015em] text-balance"
            style={{ color: ink, fontSize: "clamp(0.62rem, 9cqw, 1.7rem)" }}
          >
            {book.title}
          </p>
          {book.subtitle ? (
            <p
              className="mt-[7%] leading-snug tracking-[0.12em] uppercase opacity-70"
              style={{ fontSize: "clamp(0.32rem, 3.7cqw, 0.6rem)" }}
            >
              {book.subtitle}
            </p>
          ) : null}
        </div>

        <div>
          <div
            aria-hidden="true"
            className="mb-[6%] h-px w-8"
            style={{ backgroundColor: accent, opacity: 0.85 }}
          />
          <p
            className="font-medium tracking-[0.1em] uppercase opacity-90"
            style={{ fontSize: "clamp(0.38rem, 4.4cqw, 0.7rem)" }}
          >
            {authorName(book)}
          </p>
        </div>
      </div>

      {/* Paper sheen */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-soft-light"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 62%, rgba(0,0,0,0.35) 100%)",
        }}
      />
    </div>
  );
}

function Motif({
  motif,
  accent,
  dark,
}: {
  motif: Book["cover"]["motif"];
  accent: string;
  dark: boolean;
}) {
  const line = dark ? 0.55 : 0.45;

  if (motif === "arch") {
    return (
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -bottom-[38%] left-1/2 aspect-square w-[112%] -translate-x-1/2 rounded-full border"
          style={{ borderColor: accent, opacity: line }}
        />
        <div
          className="absolute -bottom-[30%] left-1/2 aspect-square w-[86%] -translate-x-1/2 rounded-full border"
          style={{ borderColor: accent, opacity: line * 0.7 }}
        />
      </div>
    );
  }

  if (motif === "rules") {
    return (
      <div aria-hidden="true" className="absolute inset-0">
        {[0.12, 0.19, 0.81, 0.88].map((top, index) => (
          <div
            key={top}
            className="absolute right-[11%] left-[14%] h-px"
            style={{
              top: `${top * 100}%`,
              backgroundColor: accent,
              opacity: index % 2 === 0 ? line : line * 0.55,
            }}
          />
        ))}
        <div
          className="absolute top-1/2 right-[11%] left-[14%] h-px -translate-y-1/2"
          style={{ backgroundColor: accent, opacity: line * 0.4 }}
        />
      </div>
    );
  }

  if (motif === "monogram") {
    return (
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
        <div
          className="aspect-square w-[54%] rounded-full border"
          style={{ borderColor: accent, opacity: line }}
        />
        <div
          className="absolute aspect-square w-[38%] rounded-full"
          style={{ borderColor: accent, border: `1px solid ${accent}`, opacity: line * 0.5 }}
        />
      </div>
    );
  }

  if (motif === "spine") {
    return (
      <div aria-hidden="true" className="absolute inset-0">
        <div
          className="absolute inset-y-0 right-0 w-[26%]"
          style={{ backgroundColor: accent, opacity: dark ? 0.14 : 0.18 }}
        />
        <div
          className="absolute inset-y-0 right-[26%] w-px"
          style={{ backgroundColor: accent, opacity: line }}
        />
        <div
          className="absolute top-[14%] right-[7%] h-px w-[12%]"
          style={{ backgroundColor: accent, opacity: line }}
        />
        <div
          className="absolute bottom-[14%] right-[7%] h-px w-[12%]"
          style={{ backgroundColor: accent, opacity: line }}
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage: `linear-gradient(to right, ${accent}22 1px, transparent 1px), linear-gradient(to bottom, ${accent}22 1px, transparent 1px)`,
        backgroundSize: "14% 9%",
        opacity: dark ? 0.7 : 0.6,
      }}
    />
  );
}

function isDark(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return true;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}
