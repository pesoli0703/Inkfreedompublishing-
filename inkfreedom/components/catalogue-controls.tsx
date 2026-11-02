"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";

export function CatalogueSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    router.push(`/books?${next.toString()}`);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(inputRef.current?.value ?? "");
      }}
      className="relative w-full"
      role="search"
    >
      <label htmlFor="catalogue-search" className="sr-only">
        Search the catalogue
      </label>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted"
      >
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
          <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
      <input
        ref={inputRef}
        id="catalogue-search"
        type="search"
        defaultValue={initialQuery}
        placeholder="Search titles, authors, subjects"
        className="field h-12 rounded-full pl-11 pr-24"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-ink px-4 py-2 text-[0.75rem] font-medium text-paper transition-colors hover:bg-ember"
      >
        Search
      </button>
    </form>
  );
}

export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const params = useSearchParams();

  return (
    <label className="flex items-center gap-2">
      <span className="label whitespace-nowrap text-ink-muted">Sort</span>
      <select
        className="field h-9 w-auto rounded-full py-0 pr-9 text-[0.78rem]"
        value={value}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set("sort", event.target.value);
          router.push(`/books?${next.toString()}`);
        }}
      >
        <option value="newest">Newest</option>
        <option value="title">Title A–Z</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
      </select>
    </label>
  );
}
