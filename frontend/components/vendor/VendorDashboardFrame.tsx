"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { Vendor, VendorStatus } from "@/types";

type VendorDashboardFrameProps = {
  children: ReactNode;
  vendor: Vendor;
};

const vendorLinks = [
  { href: "/vendor", label: "Overview" },
  { href: "/vendor/orders", label: "Orders" },
];

export function VendorDashboardFrame({ children, vendor }: VendorDashboardFrameProps) {
  const pathname = usePathname();

  return (
    <section className="grid gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="bg-white/95">
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-normal text-market-700">
                Seller panel
              </p>
              <div>
                <h1 className="text-lg font-bold text-slate-950">{vendor.storeName}</h1>
                <p className="break-all text-xs text-slate-500">{vendor.slug}</p>
              </div>
              <VendorStatusBadge status={vendor.status ?? "APPROVED"} />
            </div>

            <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {vendorLinks.map((item) => (
                <Link
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2",
                    pathname === item.href && "bg-market-50 text-market-800",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <p className="text-xs leading-5 text-slate-500">
              Manage received cash-on-delivery orders and keep buyers informed.
            </p>
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0">{children}</div>
    </section>
  );
}

function VendorStatusBadge({ status }: { status: VendorStatus }) {
  if (status === "APPROVED") {
    return <Badge tone="success">Approved</Badge>;
  }

  if (status === "PENDING") {
    return <Badge tone="warning">Pending</Badge>;
  }

  if (status === "REJECTED") {
    return (
      <Badge className="bg-red-50 text-red-700" tone="neutral">
        Rejected
      </Badge>
    );
  }

  return <Badge tone="neutral">Suspended</Badge>;
}
