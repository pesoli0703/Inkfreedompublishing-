import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards the public catalogue against bundled sample data.
 *
 * The site must render only records that exist in Supabase. If a demo dataset
 * is ever reintroduced — or a page starts importing one — these tests fail.
 */

const ROOT = process.cwd();
const SOURCE_DIRS = ["app", "components", "lib"];

const walk = (dir: string): string[] => {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
};

const sourceFiles = SOURCE_DIRS.flatMap((dir) => walk(join(ROOT, dir))).filter(
  (path) => /\.(ts|tsx)$/.test(path),
);

const read = (path: string) => readFileSync(path, "utf8");

describe("public catalogue has no bundled sample data", () => {
  it("does not ship a demo book or author dataset", () => {
    expect(sourceFiles.filter((path) => /lib\/data\/(books|authors)\.[jt]s$/.test(path))).toEqual(
      [],
    );
  });

  it("imports no removed demo modules", () => {
    const offenders = sourceFiles.filter((path) =>
      /from\s+["']@\/lib\/data\/(books|authors|categories)["']/.test(read(path)),
    );
    expect(offenders).toEqual([]);
  });

  it("catalogue pages load from Supabase", () => {
    const pages = [
      "app/books/page.tsx",
      "app/books/[slug]/page.tsx",
      "app/authors/page.tsx",
      "app/authors/[slug]/page.tsx",
      "app/categories/page.tsx",
      "app/sitemap.ts",
    ];

    for (const page of pages) {
      expect(read(join(ROOT, page))).toContain("@/lib/catalogue-live");
    }
  });

  it("no page labels the catalogue as sample or preview content", () => {
    const offenders = sourceFiles.filter((path) =>
      /sample catalogue|preview catalogue|sample data for the preview/i.test(
        read(path),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
