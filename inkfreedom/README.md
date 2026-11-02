# Inkfreedom

An independent ebook press, built as a real product: readers buy and keep books, authors
publish PDF and ePub editions directly, and editors run the store from a console.

Three rooms, one account, one database.

| Room | Who it is for | What lives there |
| --- | --- | --- |
| **Storefront** | Readers | Catalogue, book pages, checkout, library, wishlist, orders |
| **Studio** (`/studio`) | Authors | Uploading PDF/ePub + cover, listing status, sales, royalties, payouts |
| **Console** (`/admin`) | Editors | Review queue, titles, authors, accounts, orders, payouts, settings |

---

## What actually works

This is not a mock-up. Every surface below is wired to Supabase with row-level security
enforced in the database.

- **Accounts** — email + password sign-up and sign-in, password reset flow, role-aware
  routing. A reader can open an author studio on their own account; only an editor can
  grant any other role.
- **Publishing** — an author uploads a **PDF or ePub** and **cover artwork** straight from
  the browser to private storage, writes the listing, sets a price in naira, and submits it
  for review. Drafts, resubmissions and editor notes are all supported.
- **Moderation** — the review queue shows the cover, description, file and metadata. An
  editor publishes the listing or returns it with a reason the author sees.
- **Buying** — checkout creates a real order and a real 90/10 royalty split, then grants an
  entitlement. Payment capture is *simulated* until a processor is connected (see below).
- **Library & downloads** — purchased files live in a private bucket with no read policy for
  readers. A download is a two-minute signed URL issued only after the server verifies the
  entitlement.
- **Royalties & payouts** — author balances are derived from paid order items minus
  committed payouts. Authors request payouts; editors approve, mark paid or decline.
- **Storefront** — search, category filters, four sort orders, author pages, wishlist,
  order history, sitemap, robots, metadata and empty states that read like prose.

### The one thing that is not real

**Payments.** No processor is connected. Checkout runs in *simulated* mode: the order,
split, and entitlement are real records, but no money moves and no card details are
collected. The checkout screen says so plainly, and the admin settings hold the switch for
when a processor is added.

Transactional email is also not connected — Supabase handles confirmation and reset mail
through its own sender.

---

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) · **React 19**
- **TypeScript** strict
- **Tailwind CSS v4** with a design-token theme in `app/globals.css`
- **Supabase** — Postgres, Auth, Storage, Row Level Security
- **Self-hosted fonts** — Instrument Serif + Inter via Fontsource (no external requests)

No UI component library, no chart library, no animation library. The covers, the bar
charts and the motion are all first-party.

---

## Design notes

- **Ink and paper.** Near-black `#14130f`, warm paper `#f7f3ea`, one vermilion accent for
  everything that needs attention. Hairline rules instead of shadows; shadows only where a
  book should feel physically lifted.
- **Type does the branding.** Instrument Serif at display sizes with tight tracking, italic
  for emphasis, Inter for interface text, and letterspaced small caps for labels.
- **Covers are generated when absent.** `components/book-cover.tsx` renders a typographic
  cover from the title and category, so the shelf never shows a gap — and real uploaded
  artwork replaces it the moment an author adds one.
- **Motion is CSS.** Scroll-driven reveals (`animation-timeline: view()`), a slow drift on
  the hero covers, and a marquee that pauses on hover. Everything respects
  `prefers-reduced-motion`.
- **Accessibility.** Semantic landmarks, labelled fields, visible focus rings, `aria-live`
  form feedback, 44px+ targets on mobile, and text checked against its background.

---

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project
npm run dev                  # http://localhost:3000
```

### Environment

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server clients |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server clients (or `…ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only: signed downloads, order settlement, admin seeding |
| `NEXT_PUBLIC_SITE_URL` | Metadata, sitemap, auth redirects |
| `FLUTTERWAVE_SECRET_KEY` | Reserved for live checkout (unused in simulated mode) |

The service-role key must never be exposed to the browser. It is only imported by
`lib/supabase/admin.ts`, which is marked `server-only`.

### Database

Migrations live in `supabase/migrations/` and are written to be applied in order:

| File | Contents |
| --- | --- |
| `0001_core.sql` | Types, profiles, authors, books, orders, entitlements, payouts, views, RLS |
| `0002_storage.sql` | `covers` (public) and `ebooks` (private) buckets + object policies |
| `0003_order_policies.sql` | Reader order-insert policies, split constraint, role guard |

All objects are prefixed `ink_` so the press can share a database with other applications
without collisions.

Apply them with the Supabase CLI (`supabase db push`) or by running the SQL files in the
dashboard's SQL editor.

---

## Data model

```
auth.users ──1:1── ink_profiles ──1:1── ink_authors ──1:N── ink_books
                     (role)                                  │
                                                             ├── ink_order_items
ink_orders ──1:N── ink_order_items ───────────────────────────┘
    │                   │
    │                   └── ink_entitlements  (reader + book, unique)
    └── ink_payouts (per author)
```

**Money is stored in kobo** (integers) and formatted with `Intl.NumberFormat("en-NG")`.
The split is computed once, at order creation, and stored on the order item — so changing
the commission later never rewrites history.

---

## Security model

Enforced in Postgres, not only in the UI:

- Profiles are readable by their owner (or an editor). `ink_guard_profile_role` allows only
  reader→author self-promotion.
- Books: published titles are public; drafts are visible to their author and editors.
  Authors **cannot** publish — a trigger raises unless the caller is an admin.
- A reader can insert an order only for themselves, and only in `pending` state. Marking it
  paid and granting entitlements happens server-side with the service role.
- `ink_order_items` has a check constraint that the platform fee plus the author share
  equals the price paid.
- The `ebooks` bucket has **no select policy for readers at all**. The only route to a file
  is `/api/download/[bookId]`, which verifies the entitlement before signing a URL that
  expires in 120 seconds.
- Covers are public by design; uploads are scoped to a folder named after the uploader's
  user id.

---

## Project structure

```
app/
  (store)/            Storefront: home, shelf, book, authors, library, wishlist,
                      orders, account, checkout, publish, about, legal
  (auth)/             Sign in, sign up, password reset
  (studio)/studio/    Author studio: overview, editions, upload, earnings, profile
  (admin)/admin/      Editorial console: review queue, titles, people, orders, payouts
  api/download/       Signed-download route
components/           Design system, covers, cards, portals, forms
lib/
  actions/            Server actions (auth, commerce, author, admin, account)
  supabase/           Browser / server / service-role clients
  queries.ts          Catalogue and reader queries
  studio.ts, admin.ts Portal queries
  format.ts            Money, dates, bytes, slugs
supabase/migrations/  Schema, storage and policy migrations
```

---

## Deployment

Deployed on Vercel. Set the five environment variables above for Production and Preview,
point `NEXT_PUBLIC_SITE_URL` at the deployment domain, and add
`https://<domain>/auth/callback` to your Supabase redirect allow-list.

---

## Roadmap

1. **Payments** — Flutterwave checkout, webhook verification, refunds, escrow-style
   settlement. The order and ledger model already anticipates it.
2. **Email** — transactional receipts, review outcomes, payout notices.
3. **Reader experience** — in-browser ePub reader, reading progress, highlights.
4. **Discovery** — editorial collections, author following, recommendations.
