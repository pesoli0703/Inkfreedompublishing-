"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { sortOptions, type SortKey } from "@/lib/catalogue";

export function SortSelect({ value }: { value: SortKey }) {
  const router = useRouter();
  const params = useSearchParams();

  const onChange = (next: string) => {
    const query = new URLSearchParams(params.toString());
    if (next === "curated") {
      query.delete("sort");
    } else {
      query.set("sort", next);
    }
    const suffix = query.toString();
    router.push(suffix ? `/books?${suffix}` : "/books");
  };

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="sort"
        className="text-[0.65rem] tracking-[0.16em] text-charcoal-soft uppercase"
      >
        Sort
      </label>
      <select
        id="sort"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border border-line bg-white px-3 py-2.5 text-xs tracking-wide text-charcoal outline-none transition-colors focus:border-gold-deep"
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
