# Deployment environment (Vercel ↔ Supabase)

This file records **which environment variables exist, where they are set, and
how to prove a deployment is actually connected**. It contains no secret
values — read them from the Supabase and Vercel dashboards.

## Why the preview said "Not connected"

Until 2026-11-02 the Vercel project `inkfreedompublishing`
(`prj_EYKW41KZcZHKRJlkQSGKrK54FCEN`) had **zero environment variables**
(`GET /v9/projects/:id/env` returned an empty list, and the deployment metadata
showed an `env` array holding only Vercel's own system variables). The Supabase
project itself was fully migrated and healthy — nothing was wrong with the
database, the schema, the RLS policies or the storage buckets.

Because `lib/supabase/config.ts` derives `isSupabaseConfigured` from
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, every
surface that depends on live data took its documented "not connected" branch:
`createServerSupabaseClient()` returned `null`, the auth form rendered the
"Accounts are not connected on this deployment" panel, and author/reader
dashboards refused to pretend.

## Variables now set (Production + Preview + Development)

| Name | Purpose | Sensitive |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | no (public) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…`, browser-safe | no (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only admin client (`lib/supabase/admin.ts`) | **yes** |
| `NEXT_PUBLIC_SITE_URL` | canonical origin used when building absolute links | no |

| `CRON_SECRET` | bearer token the scheduled `/api/cron/*` routes require | **yes** |

Production was activated on the owner's explicit instruction ("activate
everything now"), so `inkfreedompublishing.vercel.app` now runs the Phase 2
build and is connected to the live Supabase project.

Still unset because only you can supply them: the `FLUTTERWAVE_*` keys,
`FX_PROVIDER_URL` and `FX_PROVIDER_API_KEY`. See `docs/phase-2/08-flutterwave.md`
and `.env.example`. `platform_settings.payments_mode` remains `'disabled'`, so
the storefront still declares payments unavailable rather than pretending.

## How to verify a deployment really is connected

1. Vercel → project → Settings → Environment Variables: the four rows above
   must be present for **Preview**.
2. Vercel → Deployments → open the deployment → *Build & Runtime env* should
   list the same names.
3. Open `/signin` on the preview. The panel must show the sign-in form, **not**
   the "Not connected" notice. The notice is rendered only when
   `isSupabaseConfigured` is false.
4. `/author/books` while signed out must redirect to
   `/signin?next=%2Fauthor%2Fbooks`; while signed in as an approved author it
   must list that author's drafts.

## Gotchas

- `NEXT_PUBLIC_*` values are inlined at **build time**. Changing them requires a
  new deployment; they cannot be changed on a running build.
- Vercel's preview protection ("Vercel Authentication") is on for this project,
  so an anonymous visitor to the preview URL is redirected to a Vercel login.
  Share previews with team members, or disable deployment protection for
  previews if authors outside the team must test the upload flow.
- A confirmation email is required to activate a new reader account
  (`mailer_autoconfirm = false`). Supabase's built-in SMTP is rate limited, so
  auth QA should use accounts that already exist or a configured SMTP provider.
- Scheduled jobs run from `vercel.json`. The project is on Vercel Hobby, which
  allows **two** cron jobs and **once per day**, so FX refresh is `0 2 * * *`
  and payment reconciliation is `30 2 * * *`. Cron only executes on production
  deployments. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically
  when that variable exists.
- Supabase email confirmation is currently **off** (`mailer_autoconfirm = true`)
  so that accounts can be created without a working SMTP provider. Re-enable it
  once custom SMTP is configured — until then, sign-ups are not email-verified.
