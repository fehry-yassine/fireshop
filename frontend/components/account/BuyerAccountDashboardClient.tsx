"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { BuyerAccountSidebar } from "@/components/account/BuyerAccountSidebar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Order, OrderStatus, PublicUser } from "@/types";

type AccountStats = {
  cancelled: number;
  delivered: number;
  inProgress: number;
  total: number;
};

const IN_PROGRESS_STATUSES: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED"];
const CANCELLED_STATUSES: OrderStatus[] = ["CANCELLED", "RETURNED"];

export function BuyerAccountDashboardClient() {
  const router = useRouter();
  const { isLoading: isUserLoading, setUser, user } = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    let isActive = true;

    async function loadOrders() {
      setIsOrdersLoading(true);
      setMessage(null);

      try {
        const response = await api.orders.list();

        if (isActive) {
          setOrders(response);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (isActive) {
          setMessage(error instanceof Error ? error.message : "Impossible de charger votre compte.");
        }
      } finally {
        if (isActive) {
          setIsOrdersLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, [isUserLoading, router, user]);

  const stats = useMemo(() => getAccountStats(orders), [orders]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      router.push("/");
      router.refresh();
    }
  }

  if (isUserLoading || (!user && !isUserLoading)) {
    return <AccountLoadingState label="Vérification de votre session" />;
  }

  if (isOrdersLoading) {
    return <AccountLoadingState label="Chargement de votre espace acheteur" />;
  }

  const currentUser = user;

  if (!currentUser) {
    return <AccountLoadingState label="Vérification de votre session" />;
  }

  if (message) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-slate-950">Impossible de charger votre compte</h1>
          <p className="text-sm text-red-700">{message}</p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <BuyerAccountSidebar
        activeItem="account"
        isLoggingOut={isLoggingOut}
        onLogout={handleLogout}
        user={currentUser}
      />

      <div className="min-w-0 space-y-5">
        <AccountHeader />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <ProfileCard user={currentUser} />
          <AccountStatsCards stats={stats} />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <QuickActionsCard />
          <FutureModulesCard />
        </div>
      </div>
    </section>
  );
}

function AccountHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-market-700">Compte acheteur</p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          Tableau de bord acheteur
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Gérez votre profil, vos commandes COD et votre espace client FireShop.
        </p>
      </div>
      <Link
        className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
        href="/"
      >
        Continuer les achats
      </Link>
    </div>
  );
}

function ProfileCard({ user }: { user: PublicUser }) {
  return (
    <Card className="border-slate-200/90 shadow-sm shadow-slate-200/70">
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-market-50 text-lg font-extrabold text-market-800 ring-1 ring-market-100">
            {getUserInitials(user)}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-market-700">Profil client</p>
            <h2 className="truncate text-xl font-extrabold text-slate-950">
              {getDisplayName(user)}
            </h2>
            <p className="truncate text-sm text-slate-500">{user.email}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileFact label="Nom complet" value={getDisplayName(user)} />
          <ProfileFact label="Email" value={user.email} />
          <ProfileFact label="Téléphone" value={user.phone?.trim() || "Non renseigné"} />
          <ProfileFact label="Rôle" value={formatRole(user.role)} />
          <ProfileFact label="Statut" value={user.isActive === false ? "Inactif" : "Actif"} />
          <ProfileFact label="Membre depuis" value={formatMemberSince(user.createdAt)} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function AccountStatsCards({ stats }: { stats: AccountStats }) {
  const cards: Array<{
    accent: "market" | "amber" | "emerald" | "red";
    icon: StatsIconName;
    label: string;
    value: number;
  }> = [
    { accent: "market", icon: "bag", label: "Total commandes", value: stats.total },
    { accent: "amber", icon: "clock", label: "En attente / En cours", value: stats.inProgress },
    { accent: "emerald", icon: "check", label: "Livrées", value: stats.delivered },
    { accent: "red", icon: "x", label: "Annulées", value: stats.cancelled },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => (
        <div
          className="flex min-h-28 items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
          key={card.label}
        >
          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-xl ring-1",
              card.accent === "market" && "bg-market-50 text-market-700 ring-market-100",
              card.accent === "amber" && "bg-amber-50 text-amber-700 ring-amber-100",
              card.accent === "emerald" && "bg-emerald-50 text-emerald-700 ring-emerald-100",
              card.accent === "red" && "bg-red-50 text-red-700 ring-red-100",
            )}
          >
            <StatsGlyph name={card.icon} />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-950">{card.value}</p>
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickActionsCard() {
  const actions = [
    {
      description: "Consulter le statut vendeur de vos commandes COD.",
      href: "/orders",
      label: "Mes commandes",
    },
    {
      description: "Reprendre les produits sélectionnés avant validation.",
      href: "/cart",
      label: "Voir mon panier",
    },
    {
      description: "Explorer les rayons et les offres FireShop.",
      href: "/",
      label: "Continuer les achats",
    },
  ];

  return (
    <Card className="border-slate-200/90 shadow-sm shadow-slate-200/70">
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Actions rapides</h2>
          <p className="text-sm leading-6 text-slate-500">
            Les raccourcis utiles pour le parcours acheteur PFE.
          </p>
        </div>
        <div className="space-y-2">
          {actions.map((action) => (
            <Link
              className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:border-market-200 hover:bg-market-50 hover:shadow-[0_12px_24px_rgba(255,106,45,0.12)]"
              href={action.href}
              key={action.href}
            >
              <p className="text-sm font-bold text-slate-950">{action.label}</p>
              <p className="mt-1 text-sm leading-5 text-slate-500">{action.description}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FutureModulesCard() {
  const modules = [
    "Mes adresses",
    "Mes paiements",
    "Mes favoris",
    "Mes avis",
  ];

  return (
    <Card className="border-slate-200/90 shadow-sm shadow-slate-200/70">
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Modules futurs</h2>
          <p className="text-sm leading-6 text-slate-500">
            Ces espaces sont prévus pour la version marché et restent clairement désactivés.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {modules.map((module) => (
            <div
              className="flex min-h-20 items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3"
              key={module}
            >
              <span className="text-sm font-bold text-slate-700">{module}</span>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                Bientôt
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AccountLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Veuillez patienter.</p>
      </CardContent>
    </Card>
  );
}

function getAccountStats(orders: Order[]): AccountStats {
  return {
    cancelled: orders.filter((order) => CANCELLED_STATUSES.includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "DELIVERED").length,
    inProgress: orders.filter((order) => IN_PROGRESS_STATUSES.includes(order.status)).length,
    total: orders.length,
  };
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

function formatMemberSince(value?: string) {
  if (!value) {
    return "Non renseigné";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Non renseigné";
  }

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
  }).format(date);
}

function formatRole(role: PublicUser["role"]) {
  if (role === "BUYER") {
    return "Acheteur";
  }

  if (role === "VENDOR") {
    return "Vendeur";
  }

  return "Administrateur";
}

type StatsIconName = "bag" | "check" | "clock" | "x";

function StatsGlyph({ name }: { name: StatsIconName }) {
  if (name === "check") {
    return <CheckIcon />;
  }

  if (name === "clock") {
    return <ClockIcon />;
  }

  if (name === "x") {
    return <XIcon />;
  }

  return <BagIcon />;
}

function BaseIcon({
  children,
  className = "h-5 w-5",
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

function CheckIcon() {
  return (
    <BaseIcon>
      <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </BaseIcon>
  );
}

function ClockIcon() {
  return (
    <BaseIcon>
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function XIcon() {
  return (
    <BaseIcon>
      <path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </BaseIcon>
  );
}
