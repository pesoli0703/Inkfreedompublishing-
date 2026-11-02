import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CATEGORY_SECTIONS, groupCategoriesBySection } from "@/lib/category-sections";
import type { Category } from "@/lib/data/types";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

const migration = read("supabase/migrations/0023_category_taxonomy.sql");

type Shelf = {
  slug: string;
  name: string;
  note: string;
  blurb: string;
  section: string;
  sort_order: number;
};

/** Pull the seeded shelves straight out of the migration. */
function seededShelves(): Shelf[] {
  const rows: Shelf[] = [];
  const pattern =
    /\('([a-z0-9-]+)','([^']+)','([^']+)','([^']+)','([a-z-]+)',(\d+)\)/g;
  for (const match of migration.matchAll(pattern)) {
    rows.push({
      slug: match[1],
      name: match[2],
      note: match[3],
      blurb: match[4],
      section: match[5],
      sort_order: Number(match[6]),
    });
  }
  return rows;
}

const shelves = seededShelves();

const shelf = (overrides: Partial<Category> & { slug: string }): Category => ({
  name: overrides.slug,
  blurb: "A shelf.",
  note: "Shelf",
  section: "fiction",
  count: 0,
  ...overrides,
});

describe("category taxonomy", () => {
  it("seeds a full bookstore, not a handful of shelves", () => {
    expect(shelves.length).toBeGreaterThanOrEqual(50);
    expect(new Set(shelves.map((row) => row.slug)).size).toBe(shelves.length);
  });

  it("keeps the original six shelves so old links keep working", () => {
    const slugs = shelves.map((row) => row.slug);
    for (const original of [
      "literary-fiction",
      "poetry",
      "essays-criticism",
      "memoir",
      "business-leadership",
      "children-young-readers",
    ]) {
      expect(slugs).toContain(original);
    }
  });

  it("files every shelf under a section the storefront knows how to render", () => {
    const known = CATEGORY_SECTIONS.map((section) => section.slug);
    for (const row of shelves) {
      expect(known).toContain(row.section);
    }
    // Every section needs at least one shelf, or its heading renders empty.
    for (const section of known) {
      expect(shelves.some((row) => row.section === section)).toBe(true);
    }
  });

  it("matches the section list in the migration's check constraint", () => {
    for (const section of CATEGORY_SECTIONS) {
      expect(migration).toContain(`'${section.slug}'`);
    }
    const constraint = migration.slice(
      migration.indexOf("categories_section_check check ("),
    );
    const listed = [...constraint.slice(0, constraint.indexOf(");")).matchAll(/'([a-z-]+)'/g)]
      .map((match) => match[1]);
    expect(listed.sort()).toEqual(
      CATEGORY_SECTIONS.map((section) => section.slug).sort(),
    );
  });

  it("uses slugs the database check constraint accepts", () => {
    for (const row of shelves) {
      expect(row.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      // Copy is written by hand: a shelf with no blurb or note is unfinished.
      expect(row.name.length).toBeGreaterThan(1);
      expect(row.note.length).toBeGreaterThan(1);
      expect(row.blurb.length).toBeGreaterThan(20);
    }
  });

  it("bands sort_order per section so a new shelf can be slotted in", () => {
    const starts = shelves.reduce<Record<string, number>>((acc, row) => {
      acc[row.section] = Math.min(acc[row.section] ?? Infinity, row.sort_order);
      return acc;
    }, {});

    const ranges = Object.entries(starts).map(([section, start]) => {
      const orders = shelves
        .filter((row) => row.section === section)
        .map((row) => row.sort_order);
      return { section, start, end: Math.max(...orders) };
    });

    // Sections must not interleave: a reader paging /categories should never
    // see fiction, textbooks, then fiction again.
    const ordered = [...ranges].sort((a, b) => a.start - b.start);
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index].start).toBeGreaterThan(ordered[index - 1].end);
    }
    expect(ordered.map((range) => range.section)).toEqual(
      CATEGORY_SECTIONS.map((section) => section.slug),
    );
  });
});

describe("groupCategoriesBySection", () => {
  it("groups in published section order and drops empty sections", () => {
    const groups = groupCategoriesBySection([
      shelf({ slug: "poetry", section: "poetry-drama" }),
      shelf({ slug: "law", section: "textbooks-academic" }),
      shelf({ slug: "romance", section: "fiction", count: 2 }),
    ]);

    expect(groups.map((group) => group.section.slug)).toEqual([
      "fiction",
      "poetry-drama",
      "textbooks-academic",
    ]);
    expect(groups[0].count).toBe(2);
  });

  it("keeps an unfiled shelf reachable instead of hiding it", () => {
    const groups = groupCategoriesBySection([
      shelf({ slug: "new-shelf", section: "not-a-section" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].section.slug).toBe("more-shelves");
    expect(groups[0].categories[0].slug).toBe("new-shelf");
  });

  it("does not mutate or reorder the shelves inside a section", () => {
    const input = [
      shelf({ slug: "mystery-thriller" }),
      shelf({ slug: "literary-fiction" }),
    ];
    const groups = groupCategoriesBySection(input);
    expect(groups[0].categories.map((item) => item.slug)).toEqual([
      "mystery-thriller",
      "literary-fiction",
    ]);
    expect(input.map((item) => item.slug)).toEqual([
      "mystery-thriller",
      "literary-fiction",
    ]);
  });
});
