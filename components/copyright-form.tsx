"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const field =
  "mt-2 w-full border border-line bg-white px-3.5 py-3 text-sm text-charcoal outline-none focus:border-gold-deep";
const label =
  "block text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase";

export function CopyrightForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isSupabaseConfigured) {
    return (
      <p className="border border-line bg-ivory p-5 text-[0.85rem] text-charcoal">
        The notice form is not connected on this deployment. Until it is, contact
        the platform directly with the details listed above.
      </p>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    const form = event.currentTarget;

    try {
      const supabase = createClient();
      const data = new FormData(form);
      const { error: insertError } = await supabase.from("copyright_reports").insert({
        reporter_name: String(data.get("reporter_name") ?? ""),
        reporter_email: String(data.get("reporter_email") ?? ""),
        claimant: String(data.get("claimant") ?? ""),
        claim: String(data.get("claim") ?? ""),
        status: "received",
      });
      if (insertError) throw insertError;
      form.reset();
      setMessage(
        "Notice recorded. A reviewer will look at it and the decision will be logged. Keep this page for reference.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The notice could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={label}>
          Your name
          <input name="reporter_name" required className={field} />
        </label>
        <label className={label}>
          Your email
          <input name="reporter_email" type="email" required className={field} />
        </label>
      </div>
      <label className={label}>
        Rights holder (you or your principal)
        <input name="claimant" required className={field} />
      </label>
      <label className={label}>
        The claim — title, link, the work infringed, and the basis of the claim
        <textarea name="claim" required rows={6} className={field} />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="bg-navy px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.16em] text-ivory uppercase hover:bg-navy-soft disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit notice"}
      </button>
      <p aria-live="polite" className="text-[0.8rem]">
        {error && <span className="text-red-700">{error}</span>}
        {!error && message && <span className="text-charcoal">{message}</span>}
      </p>
    </form>
  );
}
