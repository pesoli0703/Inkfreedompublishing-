"use client";

import { useActionState } from "react";
import { Field, ErrorNote } from "./auth-form";
import { updatePasswordAction, type AuthState } from "@/lib/actions/auth";
import { updateProfileAction, type FormState } from "@/lib/actions/account";

const initial: FormState & AuthState = { error: null };

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfileAction, initial);

  return (
    <form action={action} className="max-w-md space-y-4">
      <Field label="Full name" name="full_name" defaultValue={fullName} required />
      <label className="block">
        <span className="label mb-2 block text-ink-muted">Email address</span>
        <input className="field bg-paper-deep text-ink-muted" value={email} disabled readOnly />
        <span className="mt-1.5 block text-[0.72rem] text-ink-muted">
          Contact the press to change the email on an account.
        </span>
      </label>

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.message ? (
        <p className="border border-[#cbd9c1] bg-[#eaf0e4] px-3 py-2.5 text-[0.8rem] text-[#3f5a33]">
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, initial);

  return (
    <form action={action} className="max-w-md space-y-4">
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
      />
      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.message ? (
        <p className="border border-[#cbd9c1] bg-[#eaf0e4] px-3 py-2.5 text-[0.8rem] text-[#3f5a33]">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-quiet" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
