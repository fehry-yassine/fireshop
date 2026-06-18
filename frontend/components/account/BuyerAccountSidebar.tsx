"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types";

export type BuyerAccountActiveItem = "account" | "orders" | "vendor";

type BuyerAccountSidebarProps = {
  activeItem: BuyerAccountActiveItem;
  isLoggingOut: boolean;
  onLogout: () => void;
  user: PublicUser;
};

type SidebarIconName =
  | "bag"
  | "card"
  | "grid"
  | "heart"
  | "help"
  | "logout"
  | "message"
  | "pin"
  | "seller"
  | "settings";

type SidebarItem = {
  active?: boolean;
  disabled?: boolean;
  href?: string;
  icon: SidebarIconName;
  label: string;
  soon?: boolean;
};

export function BuyerAccountSidebar({
  activeItem,
  isLoggingOut,
  onLogout,
  user,
}: BuyerAccountSidebarProps) {
  const primaryItems: SidebarItem[] = [
    {
      active: activeItem === "account",
      href: "/account",
      icon: "grid",
      label: "Tableau de bord",
    },
    {
      active: activeItem === "orders",
      href: "/orders",
      icon: "bag",
      label: "Mes commandes",
    },
    { disabled: true, icon: "pin", label: "Mes adresses", soon: true },
    { disabled: true, icon: "card", label: "Mes paiements", soon: true },
    { disabled: true, icon: "heart", label: "Mes favoris", soon: true },
    { disabled: true, icon: "message", label: "Mes avis", soon: true },
  ];
  const secondaryItems: SidebarItem[] = [
    { disabled: true, icon: "settings", label: "Paramètres du compte", soon: true },
    { disabled: true, icon: "help", label: "Centre d'aide", soon: true },
    {
      active: activeItem === "vendor",
      href: "/vendor",
      icon: "seller",
      label: "Devenir vendeur",
    },
  ];

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card className="overflow-hidden border-slate-200/90 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <CardContent className="space-y-4 p-4">
          <Link
            className={cn(
              "flex items-center gap-3 rounded-xl border-b border-slate-100 pb-4 outline-none transition focus-visible:ring-2 focus-visible:ring-market-600/25",
              activeItem === "account" && "text-market-800",
            )}
            href="/account"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-market-50 text-sm font-extrabold text-market-800 ring-1 ring-market-100">
              {getUserInitials(user)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-950">
                {getDisplayName(user)}
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Voir mon profil
              </span>
            </span>
          </Link>

          <nav className="space-y-1" aria-label="Navigation du compte acheteur">
            {primaryItems.map((item) => (
              <SidebarNavItem item={item} key={item.label} />
            ))}
          </nav>

          <nav className="space-y-1 border-t border-slate-100 pt-3" aria-label="Aide et paramètres">
            {secondaryItems.map((item) => (
              <SidebarNavItem item={item} key={item.label} />
            ))}
          </nav>

          <div className="border-t border-slate-100 pt-3">
            <button
              className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoggingOut}
              onClick={onLogout}
              type="button"
            >
              <SidebarGlyph name="logout" />
              {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function SidebarNavItem({ item }: { item: SidebarItem }) {
  const className = cn(
    "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition",
    item.active
      ? "bg-market-50 text-market-700 ring-1 ring-market-100"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
    item.disabled && "cursor-default opacity-75 hover:bg-transparent hover:text-slate-600",
  );
  const content = (
    <>
      <SidebarGlyph name={item.icon} />
      <span className="min-w-0 flex-1 whitespace-nowrap">{item.label}</span>
      {item.soon ? (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
          Bientôt
        </span>
      ) : null}
    </>
  );

  if (item.href && !item.disabled) {
    return (
      <Link className={className} href={item.href}>
        {content}
      </Link>
    );
  }

  return (
    <span aria-disabled="true" className={className}>
      {content}
    </span>
  );
}

function getDisplayName(user: PublicUser) {
  return user.fullName?.trim() || "Compte acheteur";
}

function getUserInitials(user: PublicUser) {
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

function SidebarGlyph({ name }: { name: SidebarIconName }) {
  if (name === "logout") {
    return <LogoutIcon />;
  }

  if (name === "bag") {
    return <BagIcon />;
  }

  if (name === "grid") {
    return <GridIcon />;
  }

  if (name === "settings") {
    return <SettingsIcon />;
  }

  if (name === "help") {
    return <HelpIcon />;
  }

  if (name === "pin") {
    return <PinIcon />;
  }

  if (name === "card") {
    return <CardIcon />;
  }

  if (name === "seller") {
    return <SellerIcon />;
  }

  if (name === "heart") {
    return <HeartIcon />;
  }

  return <MessageIcon />;
}

function BaseIcon({
  children,
  className = "h-5 w-5 shrink-0",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  );
}

function BagIcon() {
  return (
    <BaseIcon>
      <path d="M7 8h10l1 11H6L7 8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M9 8a3 3 0 0 1 6 0" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function CardIcon() {
  return (
    <BaseIcon>
      <path d="M4 7h16v10H4V7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M4 10h16M7 14h3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function GridIcon() {
  return (
    <BaseIcon>
      <path d="M5 5h5v5H5V5ZM14 5h5v5h-5V5ZM5 14h5v5H5v-5ZM14 14h5v5h-5v-5Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </BaseIcon>
  );
}

function HeartIcon() {
  return (
    <BaseIcon>
      <path d="M12 19s-7-4.4-7-9.2A3.8 3.8 0 0 1 12 7a3.8 3.8 0 0 1 7 2.8C19 14.6 12 19 12 19Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function HelpIcon() {
  return (
    <BaseIcon>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9.8 9a2.2 2.2 0 1 1 3.8 1.5c-.9.8-1.6 1.3-1.6 2.5M12 16.5h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function LogoutIcon() {
  return (
    <BaseIcon>
      <path d="M10 6H6v12h4M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function MessageIcon() {
  return (
    <BaseIcon>
      <path d="M5 6h14v10H9l-4 3V6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function PinIcon() {
  return (
    <BaseIcon>
      <path d="M12 21s6-5.3 6-11a6 6 0 0 0-12 0c0 5.7 6 11 6 11Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" stroke="currentColor" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function SettingsIcon() {
  return (
    <BaseIcon>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2-1.2L14 3h-4l-.5 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2 1.2L10 21h4l.5-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" />
    </BaseIcon>
  );
}

function SellerIcon() {
  return (
    <BaseIcon>
      <path d="M5 10h14l-1 9H6l-1-9Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M8 10V7.5A4 4 0 0 1 12 3.5a4 4 0 0 1 4 4V10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M9 14h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}
