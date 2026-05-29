"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicUser } from "@/types";

type NavLink = {
  href: string;
  label: string;
};

const roleLabels: Record<PublicUser["role"], string> = {
  ADMIN: "Administrateur",
  BUYER: "Client",
  VENDOR: "Vendeur",
};

const accountLinks: Record<PublicUser["role"], NavLink[]> = {
  BUYER: [
    { label: "Mes commandes", href: "/orders" },
    { label: "Mon panier", href: "/cart" },
  ],
  VENDOR: [
    { label: "Espace vendeur", href: "/vendor" },
    { label: "Produits vendeur", href: "/vendor/products" },
    { label: "Commandes vendeur", href: "/vendor/orders" },
    { label: "Mon panier", href: "/cart" },
  ],
  ADMIN: [
    { label: "Tableau de bord admin", href: "/admin" },
    { label: "Produits", href: "/admin/products" },
    { label: "Vendeurs", href: "/admin/vendors" },
    { label: "Commandes", href: "/admin/orders" },
  ],
};

export function AuthNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, setUser, user } = useCurrentUser();
  const menuRef = useRef<HTMLDivElement>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isAccountMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        menuRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsAccountMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAccountMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAccountMenuOpen]);

  async function handleLogout() {
    setIsLoggingOut(true);
    setIsAccountMenuOpen(false);

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

  if (isLoading && !user) {
    return (
      <div
        aria-hidden="true"
        className="flex shrink-0 items-center justify-end gap-1.5"
      >
        <div className="h-10 w-28 animate-pulse rounded-full bg-market-50 ring-1 ring-market-100" />
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
      </div>
    );
  }

  return (
    <nav
      aria-label="Main navigation"
      className="flex shrink-0 items-center gap-1.5 overflow-x-auto text-sm font-semibold text-slate-700 lg:overflow-visible"
    >
      {user ? (
        <>
          {user.role === "BUYER" ? (
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-market-200 bg-white px-3.5 text-sm font-semibold text-market-900 shadow-[0_7px_18px_rgba(255,106,45,0.11)] transition-all hover:-translate-y-px hover:border-market-300 hover:bg-market-50 hover:shadow-[0_10px_24px_rgba(255,106,45,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
              href="/vendor"
            >
              Sell with us
            </Link>
          ) : (
            <Link
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffb331_0%,#ff6a2d_48%,#ff3d30_100%)] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,85,47,0.28)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#ffc04a_0%,#ff7436_46%,#ff4939_100%)] hover:shadow-[0_12px_26px_rgba(255,85,47,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
              href={user.role === "ADMIN" ? "/admin" : "/vendor"}
            >
              Dashboard
            </Link>
          )}

          {user.role !== "ADMIN" ? (
            <Link
              aria-label="Panier"
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-[0_7px_18px_rgba(15,23,42,0.075)] transition-all hover:-translate-y-px hover:border-market-200 hover:bg-market-50 hover:text-market-900 hover:shadow-[0_10px_22px_rgba(255,106,45,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2",
                pathname === "/cart" && "border-market-300 bg-market-50 text-market-900 shadow-[0_9px_20px_rgba(255,106,45,0.18)]",
              )}
              href="/cart"
              title="Panier"
            >
              <CartIcon />
            </Link>
          ) : null}

          <NotificationBell variant="light" />

          <div className="relative shrink-0" ref={menuRef}>
            <button
              aria-expanded={isAccountMenuOpen}
              aria-haspopup="menu"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1.5 pr-2.5 text-sm font-semibold text-slate-900 shadow-[0_7px_18px_rgba(15,23,42,0.075)] transition-all hover:-translate-y-px hover:border-market-200 hover:bg-market-50 hover:shadow-[0_10px_22px_rgba(255,106,45,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
              onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              type="button"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-b from-market-100 to-market-200 text-xs font-bold text-market-900 shadow-sm shadow-market-100 ring-1 ring-market-200">
                {getInitials(user)}
              </span>
              <span className="hidden whitespace-nowrap xl:inline">Mon compte</span>
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 text-slate-500 transition-transform",
                  isAccountMenuOpen && "rotate-180",
                )}
              />
            </button>

            {isAccountMenuOpen ? (
              <div
                className="absolute right-0 top-full z-40 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-market-100/80 bg-white text-slate-700 shadow-[0_22px_52px_rgba(15,23,42,0.16)] ring-1 ring-white"
                role="menu"
              >
                <div className="border-b border-market-100/70 bg-gradient-to-b from-market-50/70 to-white p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-b from-market-100 to-market-200 text-sm font-bold text-market-900 shadow-sm shadow-market-100 ring-1 ring-market-200">
                      {getInitials(user)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-950">
                        {getDisplayName(user)}
                      </p>
                      <p className="truncate text-xs font-medium text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-market-900 shadow-sm shadow-market-100 ring-1 ring-market-100">
                    {roleLabels[user.role]}
                  </span>
                </div>

                <div className="grid gap-1 p-2">
                  {accountLinks[user.role].map((item) => (
                    <Link
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-market-50 hover:text-market-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25",
                        isActivePath(pathname, item.href) &&
                          "bg-market-50 text-market-900",
                      )}
                      href={item.href}
                      key={item.href}
                      role="menuitem"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-slate-100 bg-slate-50/60 p-2">
                  <Button
                    className="h-10 w-full justify-center rounded-xl border-slate-200 bg-white text-slate-800 shadow-sm hover:border-market-200 hover:bg-market-50 hover:text-market-900"
                    disabled={isLoading || isLoggingOut}
                    onClick={handleLogout}
                    variant="secondary"
                  >
                    {isLoggingOut ? "Deconnexion..." : "Deconnexion"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <Link
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-transparent px-3 text-sm font-semibold text-slate-800 transition-all hover:border-market-100 hover:bg-market-50 hover:text-market-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2 xl:px-3.5"
            href="/auth/login"
          >
            <UserIcon />
            Se connecter
          </Link>
          <Link
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ffb331_0%,#ff6a2d_48%,#ff3d30_100%)] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,85,47,0.28)] transition-all hover:-translate-y-px hover:bg-[linear-gradient(135deg,#ffc04a_0%,#ff7436_46%,#ff4939_100%)] hover:shadow-[0_12px_26px_rgba(255,85,47,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
            href="/auth/register"
          >
            Creer un compte
          </Link>
        </>
      )}
    </nav>
  );
}

function getDisplayName(user: PublicUser) {
  return user.fullName?.trim() || user.email;
}

function getInitials(user: PublicUser) {
  const displayName = getDisplayName(user);
  const words = displayName
    .replace(/@.*/, "")
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0][0]}${words[1][0]}`
      : displayName.slice(0, 2);

  return initials.toUpperCase();
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M5 6h15l-1.5 8.5a2 2 0 0 1-2 1.6H8.2a2 2 0 0 1-2-1.6L4.9 3.8H3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9 20h.01M17 20h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.8"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 12.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2ZM4.8 20.2a7.2 7.2 0 0 1 14.4 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
