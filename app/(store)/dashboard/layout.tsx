import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reader dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await requireViewer("/dashboard");
  return <>{children}</>;
}
