"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAuthorAction, type ActionState } from "@/app/author/register/actions";
import { SubmitButton } from "@/components/form-feedback";

const field =
  "mt-2 w-full border border-line bg-white px-3.5 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal-soft focus:border-gold-deep";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

const COUNTRIES = [
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
];

export function AuthorRegisterForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    registerAuthorAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Your name
          <input name="full_name" autoComplete="name" className={field} placeholder="Chinelo Okeke" />
        </label>
        <label className={label}>
          Pen name
          <input name="pen_name" required minLength={2} className={field} placeholder="C. Okeke" />
        </label>
      </div>

      <label className={label}>
        Email
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={field}
          placeholder="you@example.com"
        />
      </label>

      <label className={label}>
        Password
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={field}
          placeholder="At least 8 characters"
        />
      </label>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Country
          <select name="country_code" defaultValue="NG" className={field}>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Based in
          <input name="based_in" className={field} placeholder="Lagos" />
        </label>
      </div>

      {state && (
        <p
          className={`border px-4 py-3 text-[0.82rem] leading-relaxed ${
            state.ok
              ? "border-green-700/30 bg-green-50 text-green-900"
              : "border-red-700/30 bg-red-50 text-red-900"
          }`}
        >
          {state.message}
        </p>
      )}

      <SubmitButton
        label="Create author account"
        pendingLabel="Creating your workspace…"
      />

      <p className="text-[0.75rem] leading-relaxed text-charcoal-soft">
        No application, no publishing contract, no rights transfer — you grant a
        non-exclusive licence to sell, and keep the copyright. You keep 90% of
        every sale. Already registered?{" "}
        <Link href="/author/signin" className="text-navy underline">
          Sign in
        </Link>
        .
      </p>
    </form>
  );
}
