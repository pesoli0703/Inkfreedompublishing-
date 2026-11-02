"use client";

import { useId, useState } from "react";

/**
 * Submission form interface. No backend, storage bucket or email service is
 * connected yet, so the form validates locally and states that nothing was sent.
 */
export function SubmissionForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("literary-fiction");
  const [synopsis, setSynopsis] = useState("");
  const [sent, setSent] = useState(false);

  const baseId = useId();
  const field = (name: string) => `${baseId}-${name}`;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setSent(true);
      }}
      className="border border-line bg-white p-6 sm:p-9"
    >
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="font-display text-2xl text-navy">Submissions</h2>
          <p className="mt-2 text-[0.85rem] leading-relaxed text-charcoal-soft">
            Tell us about the book. A synopsis of 200–400 words is enough to
            begin.
          </p>
        </div>
        <span className="eyebrow shrink-0 border border-gold/40 px-2.5 py-1 text-gold-deep">
          Preview
        </span>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <Field label="Author name" htmlFor={field("name")}>
          <input
            id={field("name")}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            className={inputClass}
          />
        </Field>

        <Field label="Email" htmlFor={field("email")}>
          <input
            id={field("email")}
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>

        <Field label="Working title" htmlFor={field("title")}>
          <input
            id={field("title")}
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Working title"
            className={inputClass}
          />
        </Field>

        <Field label="Category" htmlFor={field("category")}>
          <select
            id={field("category")}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={inputClass}
          >
            <option value="literary-fiction">Literary fiction</option>
            <option value="poetry">Poetry</option>
            <option value="essays-criticism">Essays &amp; criticism</option>
            <option value="memoir">Memoir &amp; biography</option>
            <option value="business-leadership">Business &amp; leadership</option>
            <option value="children-young-readers">
              Children &amp; young readers
            </option>
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Synopsis" htmlFor={field("synopsis")}>
            <textarea
              id={field("synopsis")}
              required
              rows={5}
              value={synopsis}
              onChange={(event) => setSynopsis(event.target.value)}
              placeholder="What is the book, who is it for, and why now?"
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      </div>

      <button
        type="submit"
        className="mt-7 w-full bg-navy px-6 py-4 text-[0.72rem] font-semibold tracking-[0.18em] text-ivory uppercase transition-colors hover:bg-navy-soft sm:w-auto"
      >
        Send submission
      </button>

      <p
        aria-live="polite"
        className={`mt-4 text-[0.78rem] leading-relaxed ${
          sent ? "text-charcoal" : "text-charcoal-soft"
        }`}
      >
        {sent
          ? "Submissions aren’t connected yet, so nothing was transmitted or stored. Once the inbox and file storage are live, this form will deliver your proposal to our editorial desk."
          : "Interface preview only. No submission inbox, upload storage or database is connected in this build."}
      </p>
    </form>
  );
}

const inputClass =
  "w-full border border-line bg-ivory/60 px-3.5 py-3 text-sm text-charcoal outline-none transition-colors placeholder:text-charcoal-soft focus:border-gold-deep focus:bg-white";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-[0.66rem] font-semibold tracking-[0.14em] text-charcoal-soft uppercase"
      >
        {label}
      </label>
      <div className="mt-2">{children}</div>
    </div>
  );
}
