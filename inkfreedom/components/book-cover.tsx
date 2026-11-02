import Image from "next/image";
import { coverUrl } from "@/lib/storage";

/**
 * Cover art. Real uploaded artwork when it exists, otherwise a typographic
 * cover built from the title and category so the shelf never shows a hole.
 */

const PALETTES: Record<string, { bg: string; ink: string; rule: string }> = {
  Fiction: { bg: "#1d2a25", ink: "#e9e3d3", rule: "#b98b5e" },
  Poetry: { bg: "#8d3b2b", ink: "#f6ead9", rule: "#e6c9a8" },
  Essays: { bg: "#25303f", ink: "#ece7db", rule: "#93a6bd" },
  Memoir: { bg: "#4a3a52", ink: "#f2e9df", rule: "#c9a9b8" },
  Business: { bg: "#20262e", ink: "#eef0ea", rule: "#8fa08c" },
  "Self & Wellbeing": { bg: "#3f4a3c", ink: "#f2eddc", rule: "#b9c4a4" },
  History: { bg: "#5a4429", ink: "#f4ead6", rule: "#d2ab72" },
  Culture: { bg: "#8a5a2b", ink: "#fbf0dd", rule: "#e2b784" },
  Technology: { bg: "#1b2430", ink: "#e8eef2", rule: "#7d98a8" },
  Children: { bg: "#c2733f", ink: "#fff6e8", rule: "#f0cfa6" },
};

export function coverPalette(category: string) {
  return PALETTES[category] ?? { bg: "#242019", ink: "#f4eee1", rule: "#bfa06a" };
}

export function BookCover({
  title,
  author,
  category,
  path,
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 45vw, 240px",
}: {
  title: string;
  author?: string | null;
  category: string;
  path?: string | null;
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const src = coverUrl(path);
  const palette = coverPalette(category);

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden bg-paper-deep ${className}`}
      style={{ containerType: "inline-size" }}
    >
      {src ? (
        <Image
          src={src}
          alt={`Cover of ${title}`}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div
          className="relative flex h-full w-full flex-col justify-between p-[8%]"
          style={{ backgroundColor: palette.bg, color: palette.ink }}
        >
          {/* spine light */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-[7%]"
            style={{
              background: "linear-gradient(90deg, rgba(0,0,0,0.32), rgba(255,255,255,0.05) 70%, transparent)",
            }}
          />
          <div className="relative flex items-start justify-between gap-2">
            <span
              className="font-sans text-[0.5rem] font-medium uppercase tracking-[0.24em] opacity-70"
              style={{ fontSize: "max(0.42rem, 4.2cqw)" }}
            >
              Inkfreedom
            </span>
            <span
              aria-hidden="true"
              className="mt-[0.15em] block h-[1px] w-[22%]"
              style={{ backgroundColor: palette.rule, opacity: 0.8 }}
            />
          </div>

          <div className="relative">
            <h3
              className="font-display uppercase leading-[0.92] tracking-[-0.01em]"
              style={{ fontSize: "max(0.85rem, 13cqw)", textWrap: "balance" }}
            >
              {title}
            </h3>
            <div
              aria-hidden="true"
              className="mt-[6%] h-[1px] w-[36%]"
              style={{ backgroundColor: palette.rule }}
            />
          </div>

          <div className="relative flex items-end justify-between gap-2">
            {author ? (
              <span
                className="font-sans uppercase tracking-[0.16em] opacity-75"
                style={{ fontSize: "max(0.4rem, 3.8cqw)" }}
              >
                {author}
              </span>
            ) : (
              <span />
            )}
            <span
              className="font-sans uppercase tracking-[0.16em] opacity-50"
              style={{ fontSize: "max(0.36rem, 3.2cqw)" }}
            >
              eBook
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
