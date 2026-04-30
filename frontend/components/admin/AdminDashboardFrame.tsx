"use client";

import type { ReactNode } from "react";
import { BackofficeFrame } from "@/components/dashboard/BackofficeFrame";

type AdminDashboardFrameProps = {
  children: ReactNode;
};

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
];

export function AdminDashboardFrame({ children }: AdminDashboardFrameProps) {
  return (
    <BackofficeFrame
      brand="fireshop"
      links={adminLinks}
      panelLabel="Admin Panel"
      panelSubtitle="Marketplace Operations"
      panelTitle="FireShop"
      supportText="Moderate vendors, monitor orders, and keep catalog data clean."
      topBadgeLabel="Admin Workspace"
      topTitle="Admin Dashboard"
    >
      {children}
    </BackofficeFrame>
  );
}
