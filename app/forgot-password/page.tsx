import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a password reset link for your account.",
};

export default function ForgotPasswordPage() {
  return (
    <section className="container-editorial py-12 sm:py-20">
      <div className="mx-auto max-w-lg">
        <p className="eyebrow text-gold-deep">Account recovery</p>
        <h1 className="mt-3 font-display text-4xl text-navy">Reset password</h1>
        <p className="mt-4 mb-8 text-[0.9rem] leading-relaxed text-charcoal-soft">
          Enter the email on your account and we will send a reset link if the
          address is registered.
        </p>
        <Suspense fallback={null}>
          <AuthForm initialMode="forgot" />
        </Suspense>
      </div>
    </section>
  );
}
