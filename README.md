# INKFREEDOMPUBLISHING

A premium multi-author digital publishing marketplace — built as a real Next.js
application with the App Router, TypeScript and Tailwind CSS.

The brand is a premium independent publishing house: deep navy `#101C32`, warm
ivory `#F8F6F0`, elegant gold `#C5A15B`, white and charcoal, with editorial
serif display type (Fraunces) over a modern sans (Inter).

---

## Status of this build

Phase 1 — foundation, design system, homepage and the full catalogue
experience. This is a **preview build**.

| Surface | Status |
| --- | --- |
| Website, marketplace, catalogue | Built and live |
| Accounts / sign in | **Not connected** — Supabase has not been connected |
| Payments / checkout | **Not connected** — Flutterwave has not been connected |
| Newsletter delivery | **Not connected** |
| Submissions inbox | **Not connected** |

Every one of those surfaces is presented honestly in the UI: the interface
exists so the flow can be reviewed, and each screen states that nothing is sent,
stored or charged.

All books, authors, prices, covers and preview passages are **fictional
placeholder data** created for this build, so the layout can be reviewed before
the real catalogue is supplied. No testimonials, sales figures, awards, press
coverage or author achievements are invented anywhere on the site.

## Tech stack

- **Next.js 16** (App Router, Server Components, Turbopack)
- **TypeScript** (strict)
- **Tailwind CSS v4** with a design-token theme in `app/globals.css`
- **Fontsource** variable fonts, self-hosted (no external font requests)

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

No environment variables are required for this phase. Nothing secret is
committed to the repository.

## Project structure

```
app/
  layout.tsx            Root layout — fonts, metadata, header, footer
  page.tsx              Homepage
  globals.css           Design tokens, base styles, custom utilities
  books/page.tsx        Marketplace: search, category filter, sorting
  books/[slug]/         Book detail: description, preview area, purchase panel
  categories/           Category index
  authors/              Author index and profiles
  about/                About the press + build status
  publish/              How publishing works + submissions interface
  signin/               Account interface (not connected)
  policies/             Draft privacy, terms and returns
components/
  site-header, site-footer, book-cover, book-card, author-card,
  search-bar, sort-select, purchase-panel, newsletter-form,
  submission-form, sign-in-form, section-heading, brand
lib/
  catalogue.ts          Search, filtering, sorting, relations
  format.ts             NGN price formatting
  data/                 books, authors, categories, types (placeholder catalogue)
```

### Design notes

- **Covers are generated, not stock images.** `components/book-cover.tsx` renders
  parametric cover art from a palette and motif stored on each book, so the shelf
  looks like a considered list and no third-party imagery is needed. Real cover
  artwork can replace this component without touching the cards.
- **Typography does the branding.** Fraunces display faces against Inter UI text,
  with hairline gold rules and generous editorial spacing rather than heavy
  chrome.
- **Mobile-first.** Single-column flows, 44px+ tap targets, horizontal filter
  chips, and a full-width mobile navigation panel.
- **Accessible by default.** Semantic landmarks, visible focus rings, labelled
  form fields, `aria-live` status messages, respect for `prefers-reduced-motion`,
  and text colours checked for contrast.

## Catalogue data

The catalogue lives in `lib/data/` as typed fixtures (`books.ts`, `authors.ts`,
`categories.ts`). When real data arrives, these fixtures can be replaced with a
Supabase-backed data layer without changing the page components — the helpers in
`lib/catalogue.ts` are the seam.

Prices are shown in NGN (`₦`) via `Intl.NumberFormat` with the `en-NG` locale.

## Architecture documentation

Phase 2 (database, roles, storage, payments, moderation) is designed in
[`docs/phase-2/`](./docs/phase-2/README.md) — schema, ER diagrams, RLS and
permission matrix, private-storage design, 90/10 commission ledger, Flutterwave
verification plan and the implementation sequence. **No database exists yet**;
that documentation is a proposal awaiting review.

## Roadmap

1. **Phase 1 (this build)** — foundation, homepage, marketplace, book pages,
   author pages, publishing information, policy drafts.
2. **Phase 2** — Supabase: authentication, reader accounts, reading lists,
   author dashboard, catalogue moved into the database.
3. **Phase 3** — Flutterwave: checkout, order records, digital delivery,
   royalty reporting.
4. **Phase 4** — editorial: real catalogue, real author profiles, preview
   reader, newsletter provider, submissions inbox.

## Deployment

Deployed on Vercel. Preview deployments are created per branch; production
deployment is a deliberate, approved step rather than an automatic one.
