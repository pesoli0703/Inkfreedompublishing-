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
      "app/(store)/books/page.tsx",
      "app/(store)/books/[slug]/page.tsx",
      "app/(store)/authors/page.tsx",
      "app/(store)/authors/[slug]/page.tsx",
      "app/(store)/categories/page.tsx",
      "app/sitemap.ts",
    ];

    for (const page of pages) {
      expect(read(join(ROOT, page))).toContain("@/lib/catalogue-live");
    }
  });

  it("no page labels the catalogue as sample or preview content", () => {
    const offenders = sourceFiles.filter((path) =>
      /sample catalogue|preview catalogue|sample data for the preview|sample set of titles/i.test(
        read(path),
      ),
    );
    expect(offenders).toEqual([]);
  });

  it("no page claims Supabase or Flutterwave are not connected", () => {
    // Both are connected in production. Payments are switched off by a
    // platform setting, which is not the same thing.
    const offenders = sourceFiles.filter((path) =>
      /supabase pending|flutterwave pending|not connected \(supabase|not connected \(flutterwave/i.test(
        read(path),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
