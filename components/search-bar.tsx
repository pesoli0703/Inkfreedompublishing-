"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

export function SearchBar({
  initialQuery = "",
  tone = "light",
  autoFocus = false,
  className = "",
}: {
  initialQuery?: string;
  tone?: "light" | "dark";
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const inputId = useId();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = value.trim();
    router.push(term ? `/books?q=${encodeURIComponent(term)}` : "/books");
  };

  const dark = tone === "dark";

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      className={`flex w-full items-center gap-2 rounded-[2px] border p-1.5 pl-4 transition-colors ${
        dark
          ? "border-white/20 bg-white/10 focus-within:border-gold"
          : "border-line bg-white focus-within:border-gold"
      } ${className}`}
    >
      <label htmlFor={inputId} className="sr-only">
        Search books and authors
      </label>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        className={`h-4 w-4 shrink-0 ${dark ? "text-gold-soft" : "text-charcoal-soft"}`}
      >
        <circle cx="8.5" cy="8.5" r="5.5" />
        <path d="M12.8 12.8 17 17" strokeLinecap="round" />
      </svg>
      <input
        id={inputId}
        name="q"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by title, author, or theme"
        className={`min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-charcoal-soft ${
          dark ? "text-ivory placeholder:text-ivory/50" : "text-charcoal"
        }`}
      />
      <button
        type="submit"
        className={`shrink-0 rounded-[1px] px-4 py-2.5 text-[0.7rem] font-semibold tracking-[0.16em] uppercase transition-colors sm:px-5 ${
          dark
            ? "bg-gold text-navy hover:bg-gold-soft"
            : "bg-navy text-ivory hover:bg-navy-soft"
        }`}
      >
        Search
      </button>
    </form>
  );
}
