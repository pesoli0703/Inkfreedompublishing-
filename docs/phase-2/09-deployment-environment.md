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

## Variables now set (target: Preview + Development)

| Name | Purpose | Sensitive |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | no (public) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…`, browser-safe | no (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only admin client (`lib/supabase/admin.ts`) | **yes** |
| `NEXT_PUBLIC_SITE_URL` | canonical origin used when building absolute links | no |

**Production is deliberately untouched.** Phase 1 remains a preview; promoting
these variables to the production target is a separate, explicit decision.

Still unset, and safe to stay unset while `platform_settings.payments_mode =
'disabled'`: the `FLUTTERWAVE_*` keys, `FX_PROVIDER_URL`, `FX_PROVIDER_API_KEY`
and `CRON_SECRET`. See `docs/phase-2/08-flutterwave.md` and `.env.example`.

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
- Scheduled jobs (`/api/cron/*`) are **not** running: the project has no
  `crons` entries and no `CRON_SECRET`. Cron entries only execute on production
  deployments, so this stays on the pre-launch list.
