import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/**
 * Publishing is self-service: a signed-in reader becomes an author without an
 * editorial gate. Book approval stays with administrators. These tests stop a
 * review step from creeping back in front of the upload form.
 */
describe("self-service publishing", () => {
  it("onboarding is a single database function that acts on the caller only", () => {
    const sql = read("supabase/migrations/0022_self_publishing.sql");
    expect(sql).toContain("create or replace function public.start_self_publishing");
    expect(sql).toContain("security definer");
    // Must never accept a target user id, and must never grant the admin role.
    expect(sql).not.toMatch(/p_target|p_user_id/);
    expect(sql).not.toMatch(/role\s*=\s*'admin'/i);
    expect(sql).toContain("grant execute on function public.start_self_publishing");
  });

  it("the new book page does not require prior approval", () => {
    const page = read("app/author/books/new/page.tsx");
    expect(page).not.toMatch(/status\s*!==\s*["']approved["']/);
    expect(page).toContain("/author/start");
  });

  it("creating a book no longer refuses unreviewed authors", () => {
    const actions = read("app/author/actions.ts");
    expect(actions).not.toContain("Only approved authors can create books.");
    expect(actions).toContain("startPublishingAction");
  });

  it("the legacy application route forwards to onboarding", () => {
    expect(read("app/author/apply/page.tsx")).toContain('redirect("/author/start")');
  });

  it("the public page promises no fee and no publishing contract", () => {
    const publish = read("app/publish/page.tsx");
    expect(publish).toContain("No application fee");
    expect(publish).toContain("No publishing contract");
    expect(existsSync(join(ROOT, "app/author/start/page.tsx"))).toBe(true);
  });
});
