"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isSupabaseConfigured) {
    return (
      <p className="border border-line bg-ivory p-6 text-[0.85rem] text-charcoal">
        Password management is not connected on this deployment.
      </p>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Password updated. Taking you to your dashboard…");
      router.push("/dashboard");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update the password.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-2 w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep focus:bg-white";

  return (
    <form onSubmit={submit} className="border border-line bg-white p-7 sm:p-9">
      <label className="text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
        New password
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={field}
        />
      </label>
      <label className="mt-5 block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase">
        Repeat password
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={field}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-7 w-full bg-navy px-6 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase hover:bg-navy-soft disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save password"}
      </button>
      <p aria-live="polite" className="mt-4 text-[0.78rem]">
        {error && <span className="text-red-700">{error}</span>}
        {!error && message && <span className="text-charcoal">{message}</span>}
      </p>
    </form>
  );
}
