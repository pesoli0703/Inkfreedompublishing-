import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth-form";
import { getViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer) {
    redirect(viewer.profile.role === "admin" ? "/admin" : viewer.profile.role === "author" ? "/studio" : "/library");
  }

  const { next } = await searchParams;

  return (
    <div>
      <p className="label text-ink-muted">Welcome back</p>
      <h1 className="display-md mt-3 text-ink">Sign in to Inkfreedom</h1>
      <p className="mt-3 text-[0.9rem] leading-relaxed text-ink-muted">
        Your library, your purchases and your author studio all live behind one account.
      </p>
      <div className="mt-8">
        <SignInForm next={next ?? ""} />
      </div>
    </div>
  );
}
