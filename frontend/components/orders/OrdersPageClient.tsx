"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { BuyerAccountSidebar } from "@/components/account/BuyerAccountSidebar";
import {
  OrderStatusBadge,
  formatOrderStatus,
} from "@/components/orders/OrderStatus";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import { formatDisplayOrderReference } from "@/lib/orderDisplay";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Order, OrderStatus } from "@/types";

type OrderFilter = "ALL" | "PENDING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const ORDER_FILTERS: Array<{ id: OrderFilter; label: string }> = [
  { id: "ALL", label: "Toutes" },
  { id: "PENDING", label: "En attente" },
  { id: "SHIPPED", label: "Expédiées" },
  { id: "DELIVERED", label: "Livrées" },
  { id: "CANCELLED", label: "Annulées" },
];

const FILTER_STATUS_MAP: Record<Exclude<OrderFilter, "ALL">, OrderStatus[]> = {
  PENDING: ["PENDING", "CONFIRMED"],
  SHIPPED: ["SHIPPED"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED", "RETURNED"],
};

export function OrdersPageClient() {
  const router = useRouter();
  const { isLoading: isUserLoading, setUser, user } = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
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
          setMessage(error instanceof Error ? error.message : "Impossible de charger les commandes.");
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

  const stats = useMemo(() => getOrderStats(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterOrders(orders, activeFilter, searchQuery),
    [activeFilter, orders, searchQuery],
  );

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

  function resetFilters() {
    setActiveFilter("ALL");
    setSearchQuery("");
  }

  if (isUserLoading || (!user && !isUserLoading)) {
    return <OrdersLoadingState label="Vérification de votre session" />;
  }

  if (isOrdersLoading) {
    return <OrdersLoadingState label="Chargement de vos commandes" />;
  }

  const currentUser = user;

  if (!currentUser) {
    return <OrdersLoadingState label="Vérification de votre session" />;
  }

  if (message) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-slate-950">Impossible de charger les commandes</h1>
          <p className="text-sm text-red-700">{message}</p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <BuyerAccountSidebar
        activeItem="orders"
        isLoggingOut={isLoggingOut}
        onLogout={handleLogout}
        user={currentUser}
      />

      <div className="min-w-0 space-y-5">
        <OrdersDashboardHeader />
        <OrderStatsCards stats={stats} />

        {orders.length === 0 ? (
          <EmptyOrdersState />
        ) : (
          <>
            <OrdersToolbar
              activeFilter={activeFilter}
              filterCounts={getFilterCounts(orders)}
              onFilterChange={setActiveFilter}
              onQueryChange={setSearchQuery}
              searchQuery={searchQuery}
            />

            {filteredOrders.length > 0 ? (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <OrderDashboardCard key={order.id} order={order} />
                ))}
              </div>
            ) : (
              <NoOrderResultsState onReset={resetFilters} />
            )}
          </>
        )}
      </div>
    </section>
  );
}

function OrdersDashboardHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-market-700">Compte acheteur</p>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          Historique des commandes
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Suivez vos commandes COD FireShop et leur statut vendeur.
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

function OrderStatsCards({ stats }: { stats: OrderStats }) {
  const cards: Array<{
    accent: "market" | "amber" | "emerald" | "red";
    icon: StatsIconName;
    label: string;
    value: number;
  }> = [
    { accent: "market", icon: "bag", label: "Total commandes", value: stats.total },
    { accent: "amber", icon: "clock", label: "En cours", value: stats.inProgress },
    { accent: "emerald", icon: "check", label: "Livrées", value: stats.delivered },
    { accent: "red", icon: "x", label: "Annulées", value: stats.cancelled },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
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
            <p className="text-xl font-extrabold text-slate-950">{card.value}</p>
            <p className="text-xs font-medium text-slate-500">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OrdersToolbar({
  activeFilter,
  filterCounts,
  onFilterChange,
  onQueryChange,
  searchQuery,
}: {
  activeFilter: OrderFilter;
  filterCounts: Record<OrderFilter, number>;
  onFilterChange: (filter: OrderFilter) => void;
  onQueryChange: (query: string) => void;
  searchQuery: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/60">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 xl:pb-0">
          {ORDER_FILTERS.map((filter) => {
            const isActive = filter.id === activeFilter;

            return (
              <button
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition",
                  isActive
                    ? "bg-market-50 text-market-700 ring-1 ring-market-200"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
                key={filter.id}
                onClick={() => onFilterChange(filter.id)}
                type="button"
              >
                {filter.label}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs",
                    isActive ? "bg-white text-market-700" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {filterCounts[filter.id]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative block min-w-0 sm:w-72">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <SearchIcon />
            </span>
            <input
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-market-500 focus:ring-2 focus:ring-market-600/15"
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Rechercher une commande..."
              type="search"
              value={searchQuery}
            />
          </label>
          <span className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <FilterIcon />
            Filtrer
          </span>
        </div>
      </div>
    </div>
  );
}

function OrderDashboardCard({ order }: { order: Order }) {
  const itemCount = getOrderItemCount(order);
  const itemCountLabel = itemCount === 1 ? "1 article" : `${itemCount} articles`;
  const displayReference = formatDisplayOrderReference(order.id);
  const firstItem = order.items[0] ?? null;

  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
      <CardContent className="grid gap-4 p-4 xl:grid-cols-[72px_minmax(0,1.1fr)_minmax(280px,0.95fr)_170px] xl:items-center">
        <OrderMarker status={order.status} />

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span className="text-xs font-medium text-slate-500">
              {formatDateTime(order.createdAt)}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-wide text-slate-950">
              Commande {displayReference}
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {itemCountLabel} • {order.vendor.storeName} • Paiement à la livraison
            </p>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            Vous paierez à la réception de votre commande.
          </p>
        </div>

        <OrderProductPreview item={firstItem} order={order} />

        <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-3 xl:block xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0 xl:text-left">
          <div>
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-extrabold text-market-700">{formatTnd(order.total)}</p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700 xl:mt-3 xl:w-full"
            href={`/orders/${order.id}`}
          >
            Voir détails
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderProductPreview({
  item,
  order,
}: {
  item: Order["items"][number] | null;
  order: Order;
}) {
  const [hasImageError, setHasImageError] = useState(false);

  if (!item) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
        Aucun article disponible pour cette commande.
      </div>
    );
  }

  const imageUrl = hasImageError ? null : item.productImage?.url;
  const otherLine = getOtherItemsLabel(order.items.length);

  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5">
      <Link
        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white p-1.5 shadow-inner"
        href={`/product/${item.productSlug}`}
      >
        {imageUrl ? (
          <img
            alt={item.productImage?.altText ?? item.productName}
            className="h-full w-full object-contain"
            onError={() => setHasImageError(true)}
            src={imageUrl}
          />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-md bg-gradient-to-br from-market-50 to-slate-100 text-xs font-bold text-market-800">
            {productInitials(item.productName)}
          </span>
        )}
      </Link>

      <div className="min-w-0 flex-1 self-center">
        <Link
          className="line-clamp-2 text-sm font-bold text-slate-950 hover:text-market-700"
          href={`/product/${item.productSlug}`}
        >
          {item.productName}
        </Link>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Quantité : {item.quantity}
        </p>
        <p className="mt-1 text-sm font-bold text-market-700">{formatTnd(item.unitPrice)}</p>
        {otherLine ? (
          <p className="mt-1 text-xs font-semibold text-market-700">{otherLine}</p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyOrdersState() {
  return (
    <Card>
      <CardContent className="space-y-5 py-10 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-950">
            Vous n'avez pas encore passé de commande.
          </h2>
          <p className="text-sm leading-6 text-slate-500">
            Ajoutez des produits à votre panier puis validez une commande COD.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
          href="/"
        >
          Découvrir les produits
        </Link>
      </CardContent>
    </Card>
  );
}

function NoOrderResultsState({ onReset }: { onReset: () => void }) {
  return (
    <Card>
      <CardContent className="space-y-4 py-10 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-950">Aucune commande trouvée.</h2>
          <p className="text-sm leading-6 text-slate-500">
            Essayez de modifier votre recherche ou le filtre sélectionné.
          </p>
        </div>
        <Button onClick={onReset} variant="secondary">
          Réinitialiser les filtres
        </Button>
      </CardContent>
    </Card>
  );
}

function OrdersLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Veuillez patienter.</p>
      </CardContent>
    </Card>
  );
}

type OrderStats = {
  cancelled: number;
  delivered: number;
  inProgress: number;
  total: number;
};

function getOrderStats(orders: Order[]): OrderStats {
  return {
    cancelled: orders.filter((order) => ["CANCELLED", "RETURNED"].includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "DELIVERED").length,
    inProgress: orders.filter((order) =>
      ["PENDING", "CONFIRMED", "SHIPPED"].includes(order.status),
    ).length,
    total: orders.length,
  };
}

function getFilterCounts(orders: Order[]) {
  return ORDER_FILTERS.reduce<Record<OrderFilter, number>>(
    (counts, filter) => {
      counts[filter.id] = orders.filter((order) => matchesOrderFilter(order, filter.id)).length;
      return counts;
    },
    {
      ALL: 0,
      CANCELLED: 0,
      DELIVERED: 0,
      PENDING: 0,
      SHIPPED: 0,
    },
  );
}

function filterOrders(orders: Order[], filter: OrderFilter, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  return orders.filter((order) => {
    if (!matchesOrderFilter(order, filter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchableText = [
      formatDisplayOrderReference(order.id),
      formatOrderStatus(order.status),
      order.vendor.storeName,
      ...order.items.map((item) => item.productName),
    ]
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

function matchesOrderFilter(order: Order, filter: OrderFilter) {
  if (filter === "ALL") {
    return true;
  }

  return FILTER_STATUS_MAP[filter as Exclude<OrderFilter, "ALL">].includes(order.status);
}

function getOrderItemCount(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function getOtherItemsLabel(itemCount: number) {
  const otherItems = itemCount - 1;

  if (otherItems <= 0) {
    return null;
  }

  return otherItems === 1 ? "+ 1 autre article" : `+ ${otherItems} autres articles`;
}

function productInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function OrderMarker({ status }: { status: OrderStatus }) {
  const tone =
    status === "DELIVERED"
      ? "emerald"
      : status === "CANCELLED" || status === "RETURNED"
        ? "red"
        : status === "SHIPPED"
          ? "blue"
          : "market";

  return (
    <div
      className={cn(
        "hidden h-16 w-16 place-items-center rounded-xl ring-1 md:grid",
        tone === "market" && "bg-market-50 text-market-700 ring-market-100",
        tone === "blue" && "bg-blue-50 text-blue-700 ring-blue-100",
        tone === "emerald" && "bg-emerald-50 text-emerald-700 ring-emerald-100",
        tone === "red" && "bg-red-50 text-red-700 ring-red-100",
      )}
    >
      <PackageIcon />
    </div>
  );
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

function FilterIcon() {
  return (
    <BaseIcon className="h-4 w-4">
      <path d="M5 6h14M8 12h8M10 18h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function PackageIcon() {
  return (
    <BaseIcon className="h-7 w-7">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m4.5 8 7.5 4 7.5-4M12 12v8.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </BaseIcon>
  );
}

function SearchIcon() {
  return (
    <BaseIcon className="h-4 w-4">
      <path d="m16.5 16.5 3 3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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
