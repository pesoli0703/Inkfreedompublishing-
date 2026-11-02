import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer) redirect("/library");

  const { role } = await searchParams;

  return (
    <div>
      <p className="label text-ink-muted">Start here</p>
      <h1 className="display-md mt-3 text-ink">Create your account</h1>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-muted">
        Readers get a permanent library. Authors get a studio, a public page and
        ninety per cent of every sale.
      </p>
      <div className="mt-8">
        <SignUpForm defaultRole={role === "author" ? "author" : "reader"} />
      </div>
    </div>
  );
}
