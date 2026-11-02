import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="label text-ink-muted">Account recovery</p>
      <h1 className="display-md mt-3 text-ink">Reset your password</h1>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-muted">
        Give us the email address on the account and we will send a link to set a
        new password.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
