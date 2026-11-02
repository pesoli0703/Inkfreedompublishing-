import Link from "next/link";
import { DashboardShell, Empty, Panel } from "@/components/dashboard-shell";
import { AdminForm, adminField } from "@/components/admin-form";
import { setFeaturedAction, upsertCategoryAction } from "@/app/admin/actions";
import { adminNav } from "@/lib/nav";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminCategoriesPage() {
  await requireAdmin("/admin/categories");
  const supabase = await createServerSupabaseClient();

  const [{ data: categories }, { data: books }, { data: authors }] = supabase
    ? await Promise.all([
        supabase.from("categories").select("id, slug, name, blurb, is_active, display_order").order("display_order"),
        supabase
          .from("books")
          .select("id, title, slug, status, is_featured, featured_rank")
          .in("status", ["approved", "published", "unpublished"])
          .order("title"),
        supabase.from("author_profiles").select("id, pen_name, slug, is_featured").eq("status", "approved").order("pen_name"),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  return (
    <DashboardShell
      eyebrow="Catalogue"
      title="Categories & featured"
      description="Categories organise the catalogue. Featuring is editorial and is applied by hand — it never rewrites sales or rankings."
      sections={adminNav()}
    >
      <div className="space-y-6">
        <Panel title="Categories">
          <ul className="divide-y divide-line">
            {(categories ?? []).map((category) => (
              <li key={category.id} className="py-4">
                <p className="text-[0.9rem] text-navy">
                  {category.name}{" "}
                  <span className="font-mono text-[0.72rem] text-charcoal-soft">{category.slug}</span>
                  {!category.is_active && <span className="ml-2 text-[0.68rem] text-charcoal-soft">(hidden)</span>}
                </p>
                <div className="mt-2 max-w-2xl">
                  <AdminForm action={upsertCategoryAction} submitLabel="Save" variant="quiet">
                    <input type="hidden" name="id" value={category.id} />
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input name="name" defaultValue={category.name} className={adminField} />
                      <input name="display_order" type="number" defaultValue={category.display_order} className={adminField} />
                      <label className="flex items-center gap-2 text-[0.78rem] text-charcoal">
                        <input type="checkbox" name="is_active" defaultChecked={category.is_active ?? false} /> Visible
                      </label>
                    </div>
                    <input name="blurb" defaultValue={category.blurb ?? ""} placeholder="Short description" className={adminField} />
                  </AdminForm>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 text-[0.66rem] font-semibold uppercase tracking-[0.14em] text-charcoal-soft">
              Add a category
            </p>
            <AdminForm action={upsertCategoryAction} submitLabel="Create category">
              <div className="grid gap-3 sm:grid-cols-3">
                <input name="name" required placeholder="Name" className={adminField} />
                <input name="slug" placeholder="slug (optional)" className={adminField} />
                <input name="display_order" type="number" defaultValue={99} className={adminField} />
              </div>
              <input name="blurb" placeholder="Short description" className={adminField} />
              <label className="flex items-center gap-2 text-[0.78rem] text-charcoal">
                <input type="checkbox" name="is_active" defaultChecked /> Visible
              </label>
            </AdminForm>
          </div>
        </Panel>

        <Panel title="Featured books">
          {(!books || books.length === 0) ? (
            <Empty title="No approved books yet" />
          ) : (
            <ul className="divide-y divide-line">
              {books.map((book) => (
                <li key={book.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-[0.88rem] text-navy">{book.title}</p>
                    <p className="text-[0.7rem] text-charcoal-soft">
                      {book.status}
                      {book.is_featured ? ` · featured at rank ${book.featured_rank ?? "—"}` : ""}
                    </p>
                  </div>
                  <div className="flex items-end gap-2">
                    <AdminForm
                      action={setFeaturedAction}
                      submitLabel={book.is_featured ? "Remove" : "Feature"}
                      variant="quiet"
                    >
                      <input type="hidden" name="kind" value="book" />
                      <input type="hidden" name="id" value={book.id} />
                      <input type="hidden" name="featured" value={book.is_featured ? "false" : "true"} />
                      <input name="rank" type="number" min="1" placeholder="Rank" className={adminField + " w-24"} />
                    </AdminForm>
                    <Link href={`/books/${book.slug}`} className="pb-2 text-[0.68rem] uppercase tracking-[0.12em] text-charcoal-soft hover:text-navy">
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Featured authors">
          {(!authors || authors.length === 0) ? (
            <Empty title="No approved authors yet" />
          ) : (
            <ul className="divide-y divide-line">
              {authors.map((author) => (
                <li key={author.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <Link href={`/authors/${author.slug}`} className="text-[0.88rem] text-navy hover:underline">
                    {author.pen_name}
                  </Link>
                  <AdminForm
                    action={setFeaturedAction}
                    submitLabel={author.is_featured ? "Unfeature" : "Feature"}
                    variant="quiet"
                  >
                    <input type="hidden" name="kind" value="author" />
                    <input type="hidden" name="id" value={author.id} />
                    <input type="hidden" name="featured" value={author.is_featured ? "false" : "true"} />
                  </AdminForm>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </DashboardShell>
  );
}
