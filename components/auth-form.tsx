"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Mode = "signin" | "create" | "forgot";

const field =
  "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal-soft focus:border-gold-deep focus:bg-white";
const label =
  "text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const baseId = useId();
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = useMemo(() => params.get("next") ?? "/dashboard", [params]);

  if (!isSupabaseConfigured) {
    return (
      <div className="border border-line bg-ivory p-7 sm:p-9">
        <p className="eyebrow text-charcoal-soft">Not connected</p>
        <p className="mt-3 text-[0.85rem] leading-relaxed text-charcoal">
          Accounts are not connected on this deployment. Supabase credentials
          have not been set, so no form is shown and nothing can be submitted.
          Request the environment variables to be configured before sign-in is
          offered.
        </p>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);

    try {
      const supabase = createClient();
      const redirectTo =
        typeof window === "undefined"
          ? undefined
          : `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        router.push(nextPath);
        router.refresh();
        return;
      }

      if (mode === "create") {
        if (password.length < 8) {
          throw new Error("Use at least 8 characters for your password.");
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: redirectTo,
          },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push(nextPath);
          router.refresh();
          return;
        }
        setNotice(
          "Account created. Check your inbox for the verification link before signing in.",
        );
        setMode("signin");
        return;
      }

      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo:
            typeof window === "undefined"
              ? undefined
              : `${window.location.origin}/auth/callback?next=/reset-password`,
        });
      if (resetError) throw resetError;
      setNotice(
        "If that address has an account, a reset link is on its way. The link expires after a short time.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

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
              setError(null);
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

      <form onSubmit={submit} className="mt-7">
        {mode === "create" && (
          <>
            <label htmlFor={`${baseId}-name`} className={label}>
              Full name
            </label>
            <input
              id={`${baseId}-name`}
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={field}
              placeholder="Chinelo Okeke"
            />
          </>
        )}

        <label
          htmlFor={`${baseId}-email`}
          className={mode === "create" ? "mt-5 block " + label : label}
        >
          Email
        </label>
        <input
          id={`${baseId}-email`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className={field}
        />

        {mode !== "forgot" && (
          <>
            <label htmlFor={`${baseId}-password`} className={"mt-5 block " + label}>
              Password
            </label>
            <input
              id={`${baseId}-password`}
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              className={field}
            />
            {mode === "create" && (
              <p className="mt-2 text-[0.72rem] text-charcoal-soft">
                At least 8 characters. We never store your password ourselves.
              </p>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-7 w-full bg-navy px-6 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft disabled:opacity-60"
        >
          {busy
            ? "Working…"
            : mode === "signin"
              ? "Sign in"
              : mode === "create"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[0.75rem]">
        {mode === "signin" ? (
          <button
            type="button"
            onClick={() => {
              setMode("forgot");
              setError(null);
              setNotice(null);
            }}
            className="text-charcoal-soft underline-offset-4 hover:text-navy hover:underline"
          >
            Forgot your password?
          </button>
        ) : (
          <Link
            href="/signin"
            className="text-charcoal-soft underline-offset-4 hover:text-navy hover:underline"
          >
            Back to sign in
          </Link>
        )}
        <Link
          href="/policies"
          className="text-charcoal-soft underline-offset-4 hover:text-navy hover:underline"
        >
          Account policies
        </Link>
      </div>

      <p aria-live="polite" className="mt-4 min-h-5 text-[0.78rem] leading-relaxed">
        {error && <span className="text-red-700">{error}</span>}
        {!error && notice && <span className="text-charcoal">{notice}</span>}
      </p>
    </div>
  );
}
