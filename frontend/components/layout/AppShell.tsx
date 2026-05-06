"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isBackoffice =
    pathname.startsWith("/admin") || pathname.startsWith("/vendor");

  if (isBackoffice) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#030712]">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
