"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicUser } from "@/types";

type AccountLink = {
  href: string;
  label: string;
};

const accountLinks: Record<PublicUser["role"], AccountLink[]> = {
  BUYER: [{ label: "Mes achats", href: "/orders" }],
  VENDOR: [
    { label: "Dashboard", href: "/vendor" },
    { label: "Mes produits", href: "/vendor/products" },
    { label: "Ventes", href: "/vendor/orders" },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin" },
    { label: "Produits", href: "/admin/products" },
    { label: "Vendeurs", href: "/admin/vendors" },
  ],
};

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 6h15l-1.5 8.5H8L6 3H3" />
      <path d="M9 19.5h.01" />
      <path d="M18 19.5h.01" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function initialsFor(user: PublicUser) {
  const source = user.fullName || user.email;
  return source
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function displayNameFor(user: PublicUser) {
  return user.fullName?.trim() || user.email;
}

function dashboardHrefFor(role: PublicUser["role"]) {
  return role === "ADMIN" ? "/admin" : "/vendor";
}

export function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, setUser, user } = useCurrentUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      setIsAccountOpen(false);
    }

    if (pathname.startsWith("/auth")) {
      router.push("/");
    }

    router.refresh();
  }

  if (!user) {
    return (
      <nav
        aria-label="Account"
        className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm font-bold text-[#CBD5E1] lg:justify-end"
      >
        <Link
          className="rounded-lg px-2.5 py-2 whitespace-nowrap transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
          href="/auth/login"
        >
          Se connecter
        </Link>
        <Link
          className="rounded-lg bg-[#2563FF] px-3.5 py-2.5 whitespace-nowrap text-white shadow-[0_0_24px_rgba(37,99,255,0.35)] transition-colors hover:bg-[#3B82F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
          href="/auth/register"
        >
          Créer un compte
        </Link>
      </nav>
    );
  }

  const isBuyer = user.role === "BUYER";
  const isVendor = user.role === "VENDOR";
  const isAdmin = user.role === "ADMIN";
  const accountName = displayNameFor(user);

  return (
    <nav
      aria-label="Account"
      className="flex min-w-0 max-w-full flex-wrap items-center gap-2 text-sm font-bold text-[#CBD5E1] lg:justify-end"
    >
      {isBuyer ? (
        <Link
          className="inline-flex h-10 items-center rounded-full border border-[#2563FF]/55 bg-[#2563FF]/10 px-4 text-sm font-black text-[#BFDBFE] shadow-[0_0_24px_rgba(37,99,255,0.18)] transition hover:border-[#3B82F6] hover:bg-[#2563FF]/18 hover:text-white"
          href="/vendor"
        >
          Sell with us
        </Link>
      ) : null}

      {isVendor || isAdmin ? (
        <Link
          className="inline-flex h-10 items-center rounded-full border border-[#2563FF]/60 bg-[#2563FF]/15 px-4 text-sm font-black text-white shadow-[0_0_24px_rgba(37,99,255,0.22)] transition hover:bg-[#2563FF]/25"
          href={dashboardHrefFor(user.role)}
        >
          Dashboard
        </Link>
      ) : null}

      {isBuyer || isVendor ? (
        <Link
          aria-label="Panier"
          className="grid h-10 w-10 place-items-center rounded-full border border-white/[0.10] bg-[#0F172A] text-[#CBD5E1] transition hover:border-[#2563FF]/55 hover:bg-[#111827] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
          href="/cart"
          title="Panier"
        >
          <CartIcon />
        </Link>
      ) : null}

      <div className="relative" ref={menuRef}>
        <button
          aria-expanded={isAccountOpen}
          aria-haspopup="menu"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.10] bg-[#0F172A] px-2.5 pr-3 text-[#CBD5E1] transition hover:border-white/15 hover:bg-[#111827] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
          onClick={() => setIsAccountOpen((value) => !value)}
          type="button"
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2563FF] text-[11px] font-black text-white">
            {initialsFor(user) || <UserIcon />}
          </span>
          <span className="whitespace-nowrap">Mon compte</span>
          <span className="text-[10px] text-[#94A3B8]">▾</span>
        </button>

        {isAccountOpen ? (
          <div
            className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-white/[0.10] bg-[#020817] p-3 text-sm shadow-[0_24px_70px_rgba(0,0,0,0.48)]"
            role="menu"
          >
            <div className="border-b border-white/[0.08] pb-3">
              <p className="truncate text-sm font-black text-white">{accountName}</p>
              <p className="mt-1 truncate text-xs font-medium text-[#94A3B8]">
                {user.email}
              </p>
              <p className="mt-2 inline-flex rounded-full border border-[#2563FF]/30 bg-[#2563FF]/10 px-2.5 py-1 text-[11px] font-black text-[#93C5FD]">
                {user.role}
              </p>
            </div>

            <div className="py-2">
              {accountLinks[user.role].map((item) => (
                <Link
                  className={cn(
                    "block rounded-xl px-3 py-2.5 text-[#CBD5E1] transition hover:bg-white/5 hover:text-white",
                    pathname === item.href && "bg-[#2563FF]/15 text-[#93C5FD]",
                  )}
                  href={item.href}
                  key={item.href}
                  onClick={() => setIsAccountOpen(false)}
                  role="menuitem"
                >
                  {item.label}
                </Link>
              ))}
            </div>

            <button
              className="flex h-10 w-full items-center justify-center rounded-xl border border-white/[0.08] bg-[#0F172A] px-3 text-sm font-black text-[#CBD5E1] transition hover:bg-[#111827] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading || isLoggingOut}
              onClick={handleLogout}
              role="menuitem"
              type="button"
            >
              {isLoggingOut ? "Déconnexion..." : "Logout"}
            </button>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
