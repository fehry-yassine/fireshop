"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BackofficeLink = {
  href: string;
  label: string;
};

type BackofficeFrameProps = {
  children: ReactNode;
  links: BackofficeLink[];
  panelLabel: string;
  panelTitle: string;
  panelSubtitle: string;
  topTitle: string;
  topBadgeLabel: string;
  supportText: string;
};

export function BackofficeFrame({
  children,
  links,
  panelLabel,
  panelTitle,
  panelSubtitle,
  topTitle,
  topBadgeLabel,
  supportText,
}: BackofficeFrameProps) {
  const pathname = usePathname();

  return (
    <section className="min-h-screen bg-surface-100">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="bg-gradient-to-b from-market-900 via-market-800 to-market-700 p-4 text-white">
          <div className="flex h-full flex-col">
            <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-normal text-market-100">
                {panelLabel}
              </p>
              <p className="mt-1 text-xl font-bold">{panelTitle}</p>
              <p className="text-sm text-market-100">{panelSubtitle}</p>
            </div>

            <nav className="mt-5 space-y-2">
              {links.map((item) => (
                <Link
                  className={cn(
                    "flex h-12 items-center rounded-lg px-4 text-sm font-semibold text-market-50 transition-colors hover:bg-white/10",
                    pathname === item.href && "bg-white text-market-800",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto rounded-lg bg-black/15 p-4 text-sm text-market-50">
              {supportText}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h1 className="text-xl font-bold text-slate-900">{topTitle}</h1>
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-market-200 bg-market-50 px-3 py-2 text-sm font-semibold text-market-800">
                  {topBadgeLabel}
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-market-700 text-sm font-bold text-white">
                  LM
                </div>
              </div>
            </div>
          </header>

          <main className="space-y-5 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </section>
  );
}
