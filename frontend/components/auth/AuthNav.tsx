"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicUser } from "@/types";

type NavLink = {
  href: string;
  label: string;
};

const visitorLinks: NavLink[] = [
  { label: "Categories", href: "/#categories" },
  { label: "Products", href: "/#products" },
  { label: "Vendors", href: "/vendor" },
];

const roleLinks: Record<PublicUser["role"], NavLink[]> = {
  BUYER: [
    { label: "Cart", href: "/cart" },
    { label: "Orders", href: "/orders" },
    { label: "Sell with us", href: "/vendor" },
    { label: "Account", href: "/auth/account" },
  ],
  VENDOR: [
    { label: "Cart", href: "/cart" },
    { label: "Orders", href: "/orders" },
    { label: "Vendor Dashboard", href: "/vendor" },
    { label: "Account", href: "/auth/account" },
  ],
  ADMIN: [
    { label: "Admin Dashboard", href: "/admin" },
    { label: "Account", href: "/auth/account" },
  ],
};

export function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, setUser, user } = useCurrentUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const links = user ? roleLinks[user.role] : visitorLinks;

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setIsLoggingOut(false);
    }

    if (pathname.startsWith("/auth")) {
      router.push("/");
    }

    router.refresh();
  }

  return (
    <nav
      aria-label="Main navigation"
      className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-700 lg:justify-end"
    >
      {links.map((item) => (
        <Link
          className={cn(
            "rounded-lg px-2.5 py-2 whitespace-nowrap transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2",
            pathname === item.href && "bg-market-50 text-market-800",
          )}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}

      {user ? (
        <Button
          className="h-9 px-3"
          disabled={isLoading || isLoggingOut}
          onClick={handleLogout}
          variant="secondary"
        >
          {isLoggingOut ? "Logging out" : "Logout"}
        </Button>
      ) : (
        <>
          <Link
            className="rounded-lg px-2.5 py-2 whitespace-nowrap transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
            href="/auth/login"
          >
            Sign in
          </Link>
          <Link
            className="rounded-lg bg-slate-950 px-3 py-2 whitespace-nowrap text-white shadow-sm shadow-slate-900/20 transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
            href="/auth/register"
          >
            Create account
          </Link>
        </>
      )}
    </nav>
  );
}
