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
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/settings", label: "Store Settings", badge: "Soon", disabled: true },
];

export function VendorDashboardFrame({ children, vendor }: VendorDashboardFrameProps) {
  return (
    <BackofficeFrame
      brand="fireshop"
      links={vendorLinks}
      panelLabel="Seller Panel"
      panelSubtitle={vendor.slug}
      panelTitle={vendor.storeName}
      supportText="Manage products, stock, and received COD orders from one focused seller workspace."
      topBadgeLabel="Vendor Workspace"
      topTitle="Vendor Dashboard"
    >
      {children}
    </BackofficeFrame>
  );
}
