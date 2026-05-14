"use client";

import type { ReactNode } from "react";
import { BackofficeFrame } from "@/components/dashboard/BackofficeFrame";
import type { PublicUser, Vendor } from "@/types";

type VendorDashboardFrameProps = {
  children: ReactNode;
  user: PublicUser;
  vendor: Vendor;
};

const vendorLinks = [
  { href: "/vendor", label: "Dashboard" },
  { href: "/vendor/orders", label: "Orders" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/settings", label: "Store Settings", badge: "Soon", disabled: true },
];

export function VendorDashboardFrame({ children, user, vendor }: VendorDashboardFrameProps) {
  return (
    <BackofficeFrame
      brand="fireshop"
      links={vendorLinks}
      logoAlt="FireShop seller workspace"
      logoSrc="/brand/fireshop-seller-logo.png"
      panelLabel="Seller Panel"
      panelSubtitle={vendor.slug}
      panelTitle={vendor.storeName}
      supportText="Manage products, stock, and received COD orders from one focused seller workspace."
      topBadgeLabel="Vendor Workspace"
      topTitle="Vendor Dashboard"
      user={user}
    >
      {children}
    </BackofficeFrame>
  );
}
