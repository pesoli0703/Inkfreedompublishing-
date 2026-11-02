# The three portals

One Next.js application, one Supabase project, one authentication system, three
experiences:

| Portal | Today (path-based) | Later (custom domains) | Who it is for |
| --- | --- | --- | --- |
| Reader bookstore | `/` | `inkfreedompublishing.com` | Anyone buying or reading |
| Author dashboard | `/author` | `authors.inkfreedompublishing.com` | Anyone who wants to publish |
| Admin console | `/admin` | `admin.inkfreedompublishing.com` | Authorised administrators |

No custom domain is required for the current setup. The host mapping is
configuration, not code: when a domain exists, set two or three environment
variables and redeploy. Nothing moves, nothing is rebuilt.

---

## How it is put together

```
app/
  (store)/            reader portal — its own layout with the bookstore header/footer
    page.tsx          homepage
    books/            catalogue, book pages
    authors/          author directory
    categories/       shelf taxonomy
    dashboard/        reader account: library, orders, wishlist, settings, support
    signin, register, publish, about, legal pages…
  author/             author portal — its own layout and navigation
    page.tsx          dashboard (stats, recent books)
    books/            list, new book, edit book
    earnings/         sales, commission, withdrawals
    settings/         author profile
    signin, register  portal entry points
  admin/              admin console — its own layout, navy chrome
    … 17 pages        users, submissions, orders, withdrawals, reports, settings
    signin            administrator sign-in (no registration offered)
  api/                checkout, payments, webhook, downloads, cron
  auth/               callback + signout
lib/
  portals.ts          portal registry, host resolution, rewrite rules
  auth.ts             getViewer / requireAuthorArea / requireAdmin
middleware.ts         session refresh, host rewrites, portal-aware redirects, admin gate
```

Route groups keep the chrome honest: `app/(store)/layout.tsx` renders the
bookstore header and footer, `app/author/layout.tsx` and `app/admin/layout.tsx`
render the portal headers instead. A dashboard never appears wrapped in the
shop, and the shop never appears inside the console.

---

## Security model

Nothing here relies on hiding a button.

1. **Middleware** rejects any request to `/dashboard`, `/author` or `/admin`
   without a session, and sends it to the sign-in screen for *that* portal.
2. **Middleware** additionally checks the `profiles.role` for every `/admin`
   request and redirects non-admins to their own dashboard.
3. **Every** admin page calls `requireAdmin()` on the server. Every author page
   calls `requireAuthorArea()`. Both re-check the role or the author profile
   before any data is read.
4. **Row level security** in Postgres is the real boundary. Even a forged
   request through the anon key cannot read another reader's orders, another
   author's books or the ledger: the policies are written against `auth.uid()`.
5. **Destructive and financial tables** (`ledger_entries`, `audit_log`,
   `payment_events`, `withdrawal_events`) are append-only at the database level.

Administrator accounts are never created from the browser: the admin sign-in
screen has no registration tab, and `requireAdmin` refuses anyone whose role is
not already `admin` in the database.

---

## Switching to custom domains later

1. **Buy one domain** — `inkfreedompublishing.com`. The two author/admin
   subdomains are free records inside it.
2. **Add the domains in Vercel** → project `inkfreedompublishing` → Settings →
   Domains:

   | Domain | DNS record at your registrar |
   | --- | --- |
   | `inkfreedompublishing.com` | `A @ → 76.76.21.21` |
   | `www.inkfreedompublishing.com` | `CNAME www → cname.vercel-dns.com` |
   | `authors.inkfreedompublishing.com` | `CNAME authors → cname.vercel-dns.com` |
   | `admin.inkfreedompublishing.com` | `CNAME admin → cname.vercel-dns.com` |

   SSL is issued automatically once DNS resolves.

3. **Set three environment variables** in Vercel (Production, Preview and
   Development):

   ```
   NEXT_PUBLIC_READER_HOST=inkfreedompublishing.com
   NEXT_PUBLIC_AUTHOR_HOST=authors.inkfreedompublishing.com
   NEXT_PUBLIC_ADMIN_HOST=admin.inkfreedompublishing.com
   ```

   Also update `NEXT_PUBLIC_SITE_URL` to `https://inkfreedompublishing.com`.

4. **Update Supabase** → Authentication → URL configuration:

   - Site URL: `https://inkfreedompublishing.com`
   - Redirect URLs: add `https://inkfreedompublishing.com/**`,
     `https://authors.inkfreedompublishing.com/**`,
     `https://admin.inkfreedompublishing.com/**`

5. **Sessions across subdomains.** The Supabase cookies are host-only today.
   For a single session across the storefront and the author portal, set
   `cookieOptions: { domain: ".inkfreedompublishing.com" }` in
   `lib/supabase/server.ts` and `lib/supabase/client.ts`. Apex and subdomains
   then share one session; the admin console keeps host-only cookies and
   re-authenticates, which is the safer default for an administration console.

6. **Redeploy.** `/` serves the bookstore on the apex, `authors.` serves the
   author portal, `admin.` serves the console. Paths still work on any host, so
   old links and bookmarks keep resolving.

Once the variables are set, `portalRewritePath()` in `lib/portals.ts` rewrites
`authors.inkfreedompublishing.com/books` to the existing `/author/books` route,
and `portalLinks()` turns the portal switcher into absolute URLs.

---

## What is intentionally not done yet

- No second repository, no second database, no duplicated business logic.
- No payment change: checkout, verification, the webhook, settlement,
  commission, earnings and withdrawals are untouched. Payments remain switched
  off until the journey is signed off.
- No destructive migration was needed for the portal split.
