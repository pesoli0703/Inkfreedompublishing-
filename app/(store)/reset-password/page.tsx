import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Set a new password for your account.",
};

export default function ResetPasswordPage() {
  return (
    <section className="container-editorial py-12 sm:py-20">
      <div className="mx-auto max-w-lg">
        <p className="eyebrow text-gold-deep">Account recovery</p>
        <h1 className="mt-3 font-display text-4xl text-navy">New password</h1>
        <p className="mt-4 mb-8 text-[0.9rem] leading-relaxed text-charcoal-soft">
          Choose a password of at least 8 characters. You will stay signed in on
          this device.
        </p>
        <ResetPasswordForm />
      </div>
    </section>
  );
}
