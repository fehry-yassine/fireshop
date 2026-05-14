"use client";

import type { ReactNode } from "react";
import { BackofficeFrame } from "@/components/dashboard/BackofficeFrame";

type AdminDashboardFrameProps = {
  children: ReactNode;
};

const adminLinks = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/homepage-promos", label: "Homepage" },
];

export function AdminDashboardFrame({ children }: AdminDashboardFrameProps) {
  return (
    <BackofficeFrame
      brand="fireshop"
      links={adminLinks}
      logoAlt="FireShop admin workspace"
      logoSrc="/brand/fireshop-admin-logo.png"
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
