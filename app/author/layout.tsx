import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Author dashboard",
  robots: { index: false, follow: false },
};

export default async function AuthorLayout({ children }: { children: ReactNode }) {
  await requireViewer("/author");
  return <>{children}</>;
}
