"use client";

import { useId, useState } from "react";

/**
 * Interface only. No newsletter provider is connected yet, so the form is
 * intercepted and says so plainly — no email address is transmitted or stored.
 */
export function NewsletterForm({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "notice">("idle");
  const inputId = useId();
  const noteId = useId();
  const dark = tone === "dark";

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("notice");
  };

  return (
    <div>
      <form
        onSubmit={submit}
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
        aria-describedby={noteId}
      >
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setStatus("idle");
          }}
          placeholder="you@example.com"
          className={`min-w-0 flex-1 border px-4 py-3.5 text-sm outline-none transition-colors ${
            dark
              ? "border-white/25 bg-white/5 text-ivory placeholder:text-ivory/55 focus:border-gold"
              : "border-line bg-white text-charcoal placeholder:text-charcoal-soft focus:border-gold-deep"
          }`}
        />
        <button
          type="submit"
          className={`px-6 py-3.5 text-[0.7rem] font-semibold tracking-[0.18em] uppercase transition-colors ${
            dark
              ? "bg-gold text-navy hover:bg-gold-soft"
              : "bg-navy text-ivory hover:bg-navy-soft"
          }`}
        >
          Subscribe
        </button>
      </form>

      <p
        id={noteId}
        aria-live="polite"
        className={`mt-3 text-xs leading-relaxed ${
          dark ? "text-ivory/55" : "text-charcoal-soft"
        }`}
      >
        {status === "notice"
          ? "Newsletter delivery isn’t connected yet, so nothing was sent or stored. This form is a design preview."
          : "Interface preview only — no mailing provider is connected, so submissions are not stored."}
      </p>
    </div>
  );
}
