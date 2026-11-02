import type { NavSection } from "@/components/dashboard-shell";

export const readerNav = (counts?: { orders?: number; wishlist?: number; unread?: number }): NavSection[] => [
  {
    label: "Reading",
    items: [
      { href: "/dashboard", label: "Overview" },
      { href: "/dashboard/library", label: "My library" },
      { href: "/dashboard/wishlist", label: "Wishlist", badge: counts?.wishlist },
    ],
  },
  {
    label: "Orders",
    items: [
      { href: "/dashboard/orders", label: "Orders & payments", badge: counts?.orders },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/dashboard/settings", label: "Settings" },
      { href: "/dashboard/support", label: "Support" },
    ],
  },
  {
    label: "Publishing",
    items: [{ href: "/author/start", label: "Become an author" }],
  },
];

export const authorNav = (counts?: { review?: number; changes?: number }): NavSection[] => [
  {
    label: "Workspace",
    items: [
      { href: "/author", label: "Overview" },
      { href: "/author/books", label: "My books", badge: counts?.review },
      { href: "/author/earnings", label: "Sales & earnings" },
      { href: "/author/settings", label: "Author profile" },
    ],
  },
  {
    label: "Reader",
    items: [
      { href: "/dashboard", label: "Reader dashboard" },
      { href: "/dashboard/library", label: "My library" },
    ],
  },
];

export const adminNav = (counts?: Record<string, number | undefined>): NavSection[] => [
  {
    label: "Overview",
    items: [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/reports", label: "Financial reports" },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/applications", label: "Author applications", badge: counts?.applications },
      { href: "/admin/books", label: "Submissions & books", badge: counts?.submissions },
      { href: "/admin/categories", label: "Categories & featured" },
      { href: "/admin/pricing", label: "Pricing, FX & currencies" },
    ],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/orders", label: "Orders & payments" },
      { href: "/admin/refunds", label: "Refunds & disputes" },
      { href: "/admin/withdrawals", label: "Withdrawals & payouts", badge: counts?.withdrawals },
      { href: "/admin/coupons", label: "Coupons" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/users", label: "Users & roles" },
      { href: "/admin/support", label: "Support", badge: counts?.support },
      { href: "/admin/copyright", label: "Copyright complaints", badge: counts?.copyright },
      { href: "/admin/reviews", label: "Reviews" },
      { href: "/admin/settings", label: "Platform settings" },
    ],
  },
];
