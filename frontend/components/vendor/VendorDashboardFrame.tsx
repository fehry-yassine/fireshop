"use client";

import type { ReactNode } from "react";
import { BackofficeFrame } from "@/components/dashboard/BackofficeFrame";
import type { Vendor } from "@/types";

type VendorDashboardFrameProps = {
  children: ReactNode;
  vendor: Vendor;
};

const vendorLinks = [
  { href: "/vendor", label: "Dashboard" },
  { href: "/vendor/orders", label: "Orders" },
];

export function VendorDashboardFrame({ children, vendor }: VendorDashboardFrameProps) {
  return (
    <BackofficeFrame
      links={vendorLinks}
      panelLabel="Seller Panel"
      panelSubtitle={vendor.slug}
      panelTitle={vendor.storeName}
      supportText="Manage COD orders, keep response times fast, and update order statuses frequently."
      topBadgeLabel="Vendor Workspace"
      topTitle="Vendor Dashboard"
    >
      {children}
    </BackofficeFrame>
  );
}
