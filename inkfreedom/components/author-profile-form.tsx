"use client";

import { useActionState } from "react";
import { updateAuthorProfileAction, type FormState } from "@/lib/actions/account";
import { ErrorNote } from "./auth-form";
import type { Author } from "@/lib/types";

export function AuthorProfileForm({ author }: { author: Author }) {
  const [state, action, pending] = useActionState(updateAuthorProfileAction, {
    error: null,
  } as FormState);

  return (
    <form action={action} className="max-w-2xl space-y-5">
      <label className="block">
        <span className="label mb-2 block text-ink-muted">Author name</span>
        <input name="name" defaultValue={author.name} required className="field" />
        <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
          Printed on every book page and on your public profile.
        </span>
      </label>

      <label className="block">
        <span className="label mb-2 block text-ink-muted">Tagline</span>
        <input
          name="tagline"
          defaultValue={author.tagline ?? ""}
          placeholder="Poet and editor, Enugu."
          className="field"
        />
      </label>

      <label className="block">
        <span className="label mb-2 block text-ink-muted">Biography</span>
        <textarea
          name="bio"
          rows={6}
          defaultValue={author.bio ?? ""}
          placeholder="A few sentences in the third person — who you are, what you write, where you are."
          className="field"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-2 block text-ink-muted">Location</span>
          <input name="location" defaultValue={author.location ?? ""} className="field" />
        </label>
        <label className="block">
          <span className="label mb-2 block text-ink-muted">Website</span>
          <input
            name="website"
            type="url"
            defaultValue={author.website ?? ""}
            placeholder="https://"
            className="field"
          />
        </label>
      </div>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.message ? (
        <p className="border border-[#cbd9c1] bg-[#eaf0e4] px-3 py-2.5 text-[0.8rem] text-[#3f5a33]">
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save public page"}
      </button>
    </form>
  );
}
