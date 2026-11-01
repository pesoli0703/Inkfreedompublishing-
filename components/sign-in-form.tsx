"use client";

import { useId, useState } from "react";

/**
 * Sign-in interface only. Authentication is not connected — no Supabase
 * project, no session, no credential handling. The password is never sent
 * anywhere because there is nothing to send it to.
 */
export function SignInForm() {
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [notice, setNotice] = useState<string | null>(null);
  const baseId = useId();

  return (
    <div className="border border-line bg-white p-7 sm:p-9">
      <div className="flex gap-1 border-b border-line pb-4">
        {(
          [
            { id: "signin", label: "Sign in" },
            { id: "create", label: "Create account" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setMode(tab.id);
              setNotice(null);
            }}
            className={`px-4 py-2.5 text-[0.7rem] font-semibold tracking-[0.16em] uppercase transition-colors ${
              mode === tab.id
                ? "bg-navy text-ivory"
                : "text-charcoal-soft hover:text-navy"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(
            "Accounts aren’t connected yet. Authentication (Supabase) has not been set up for this build, so no account was created, no session started and nothing was stored.",
          );
        }}
        className="mt-7"
      >
        <label
          htmlFor={`${baseId}-email`}
          className="text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase"
        >
          Email
        </label>
        <input
          id={`${baseId}-email`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal-soft focus:border-gold-deep focus:bg-white"
        />

        <label
          htmlFor={`${baseId}-password`}
          className="mt-5 block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase"
        >
          Password
        </label>
        <input
          id={`${baseId}-password`}
          type="password"
          required
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="••••••••"
          className="mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal-soft focus:border-gold-deep focus:bg-white"
        />

        <button
          type="submit"
          className="mt-7 w-full bg-navy px-6 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft"
        >
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p
        aria-live="polite"
        className={`mt-4 text-[0.78rem] leading-relaxed ${
          notice ? "text-charcoal" : "text-charcoal-soft"
        }`}
      >
        {notice ??
          "Interface preview only — authentication is not connected in this build."}
      </p>
    </div>
  );
}
