"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type AdminDashboardFrameProps = {
  children: ReactNode;
};

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/categories", label: "Categories" },
];

export function AdminDashboardFrame({ children }: AdminDashboardFrameProps) {
  const pathname = usePathname();

  return (
    <section className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-normal text-market-700">
                Admin panel
              </p>
              <div>
                <h1 className="text-lg font-bold text-slate-950">LocalMarket</h1>
                <p className="text-xs text-slate-500">Marketplace operations</p>
              </div>
            </div>

            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {adminLinks.map((item) => (
                <Link
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950",
                    pathname === item.href && "bg-slate-100 text-slate-950",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <p className="text-xs leading-5 text-slate-500">
              Review sellers, supervise COD orders, and keep marketplace categories clean.
            </p>
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0">{children}</div>
    </section>
  );
}
