"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  signInAction,
  signUpAction,
  type AuthState,
} from "@/lib/actions/auth";

const initial: AuthState = { error: null };

export function SignInForm({ next = "" }: { next?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Email address" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex items-center justify-between pt-1 text-[0.8rem] text-ink-muted">
        <Link href="/forgot-password" className="hover:text-ink">
          Forgot your password?
        </Link>
        <Link href="/signup" className="font-medium text-ink hover:text-ember">
          Create an account
        </Link>
      </div>
    </form>
  );
}

export function SignUpForm({ defaultRole = "reader" }: { defaultRole?: "reader" | "author" }) {
  const [state, action, pending] = useActionState(signUpAction, initial);

  return (
    <form action={action} className="space-y-4">
      <Field label="Full name" name="full_name" type="text" autoComplete="name" required />

      <fieldset>
        <legend className="label mb-2 text-ink-muted">I am joining as</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: "reader", title: "A reader", blurb: "Buy and read ebooks" },
            { value: "author", title: "An author", blurb: "Publish and sell" },
          ].map((option) => (
            <label
              key={option.value}
              className="group relative cursor-pointer border border-line bg-paper-card p-3 transition-colors has-[:checked]:border-ink has-[:checked]:bg-paper-deep"
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                defaultChecked={defaultRole === option.value}
                className="sr-only"
              />
              <span className="block text-[0.85rem] font-medium text-ink">{option.title}</span>
              <span className="mt-0.5 block text-[0.7rem] text-ink-muted">{option.blurb}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Email address" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="At least 8 characters."
      />

      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.message ? (
        <p className="border border-[#cbd9c1] bg-[#eaf0e4] px-3 py-2.5 text-[0.8rem] leading-relaxed text-[#3f5a33]">
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Creating your account…" : "Create account"}
      </button>

      <p className="pt-1 text-center text-[0.8rem] text-ink-muted">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-ink hover:text-ember">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, initial);

  return (
    <form action={action} className="space-y-4">
      <Field label="Email address" name="email" type="email" autoComplete="email" required />
      {state.error ? <ErrorNote>{state.error}</ErrorNote> : null}
      {state.message ? (
        <p className="border border-line bg-paper-deep px-3 py-2.5 text-[0.8rem] leading-relaxed text-ink-soft">
          {state.message}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="text-center text-[0.8rem] text-ink-muted">
        <Link href="/signin" className="font-medium text-ink hover:text-ember">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  hint,
  defaultValue,
  placeholder,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  hint?: string;
  defaultValue?: string | number;
  placeholder?: string;
  min?: string;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block text-ink-muted">{label}</span>
      <input
        className="field"
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        placeholder={placeholder}
        min={min}
      />
      {hint ? <span className="mt-1.5 block text-[0.72rem] text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="border border-ember/30 bg-ember/8 px-3 py-2.5 text-[0.8rem] leading-relaxed text-ember-deep"
    >
      {children}
    </p>
  );
}
