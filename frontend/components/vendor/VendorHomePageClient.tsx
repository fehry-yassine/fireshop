"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { VendorAccessGate } from "@/components/vendor/VendorAccessGate";
import { VendorDashboardFrame } from "@/components/vendor/VendorDashboardFrame";
import { Card, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Order, VendorDashboardStats } from "@/types";

export function VendorHomePageClient() {
  return (
    <VendorAccessGate>
      {({ user, vendor }) => (
        <VendorDashboardFrame user={user} vendor={vendor}>
          <VendorOverview />
        </VendorDashboardFrame>
      )}
    </VendorAccessGate>
  );
}

function VendorOverview() {
  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);
      setMessage(null);

      try {
        const response = await api.vendors.dashboard();

        if (isActive) {
          setStats(response);
        }
      } catch (error) {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "Impossible de charger le tableau de bord vendeur.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  const recentOrders = stats?.recentOrders ?? [];
  const openOrders = stats?.openOrders ?? 0;
  const deliveredOrders = stats?.deliveredOrders ?? 0;
  const returnedOrders = stats?.returnedOrders ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;
  const deliveredRevenue = stats?.revenue ?? stats?.totalRevenue ?? 0;
  const expectedRevenue = stats?.expectedRevenue;
  const revenueNote =
    typeof expectedRevenue === "number"
      ? `Attendu : ${formatTnd(expectedRevenue)}`
      : `${totalOrders} commande${totalOrders === 1 ? "" : "s"}`;

  return (
    <div className="w-full space-y-5">
      <FirstStepsGuide />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Commandes aujourd'hui" value={isLoading ? "--" : `${stats?.ordersToday ?? 0}`} />
        <MetricCard label="Commandes cette semaine" value={isLoading ? "--" : `${stats?.ordersThisWeek ?? 0}`} />
        <MetricCard
          label="Commandes ce mois-ci"
          value={isLoading ? "--" : `${stats?.ordersThisMonth ?? 0}`}
          note={`${deliveredOrders} livrées`}
        />
        <MetricCard
          highlight
          label="Revenu total"
          value={isLoading ? "--" : formatTnd(deliveredRevenue)}
          note={isLoading ? undefined : revenueNote}
        />
      </div>

      <Card className="vendor-card !rounded-[14px]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="vendor-title text-[1.55rem] font-bold leading-tight sm:text-[1.7rem]">Suivi des commandes</h3>
            <div className="vendor-muted flex flex-wrap items-center gap-4 text-sm font-semibold">
              <span>Livrées {totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0}%</span>
              <span>Retournées {totalOrders ? Math.round((returnedOrders / totalOrders) * 100) : 0}%</span>
            </div>
          </div>
          <div className="vendor-progress-callout flex h-[54px] items-center justify-center rounded-full px-5 text-center text-[1.15rem] font-bold leading-none sm:text-[1.2rem]">
            {isLoading ? "Chargement…" : totalOrders === 0 ? "Aucune donnée disponible" : `${openOrders} commande${openOrders === 1 ? "" : "s"} en cours`}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="vendor-card !rounded-[14px] min-h-[360px]">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="vendor-title text-[1.3rem] font-bold leading-tight sm:text-[1.4rem]">Commandes récentes</h3>
                <p className="vendor-muted text-sm">Dernières commandes COD de votre boutique.</p>
              </div>
              <Link className="vendor-accent-text text-sm font-semibold" href="/vendor/orders">
                Voir tout
              </Link>
            </div>

            {isLoading ? (
              <p className="vendor-empty-state rounded-lg px-3 py-4 text-sm">
                Chargement des commandes récentes.
              </p>
            ) : message ? (
              <p className="vendor-alert-error rounded-lg px-3 py-4 text-sm">
                {message}
              </p>
            ) : recentOrders.length === 0 ? (
              <p className="vendor-empty-state rounded-lg px-3 py-4 text-sm">
                Aucune commande reçue pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <RecentOrderRow key={order.id} order={order} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="vendor-card !rounded-[14px] min-h-[360px]">
          <CardContent className="space-y-4 p-6">
            <h3 className="vendor-title text-[1.3rem] font-bold leading-tight sm:text-[1.4rem]">Répartition des commandes</h3>
            <div className="vendor-panel-inset flex min-h-[270px] items-center justify-center rounded-[14px] border p-5">
              <div className="vendor-donut relative h-40 w-40 rounded-full border-[24px] sm:h-44 sm:w-44 sm:border-[26px]">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="vendor-muted text-sm">Total</p>
                  <p className="vendor-title text-[2rem] font-bold leading-none sm:text-[2.1rem]">{totalOrders}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm font-semibold">
              <p className="vendor-soft-pill rounded-lg px-2 py-2">
                {totalOrders ? Math.round((openOrders / totalOrders) * 100) : 0}% En cours
              </p>
              <p className="vendor-chip rounded-lg px-2 py-2">
                {totalOrders ? Math.round((deliveredOrders / totalOrders) * 100) : 0}% Livrées
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FirstStepsGuide() {
  return (
    <Card className="vendor-card !rounded-[14px]">
      <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <h3 className="vendor-title text-[1.4rem] font-bold leading-tight sm:text-[1.5rem]">
            Commencez à vendre sur FireShop
          </h3>
          <p className="vendor-muted max-w-2xl text-sm leading-6">
            Ajoutez votre premier produit, envoyez-le en validation, puis recevez vos premières
            commandes COD après approbation.
          </p>
          <p className="vendor-muted max-w-2xl text-xs leading-5">
            Les produits publiés par un vendeur passent par une validation admin avant d&apos;être
            visibles aux acheteurs.
          </p>
        </div>
        <Link
          className="vendor-primary-action inline-flex h-11 shrink-0 items-center justify-center rounded-lg px-5 text-sm font-bold transition-colors"
          href="/vendor/products"
        >
          Ajouter mon premier produit
        </Link>
      </CardContent>
    </Card>
  );
}

function MetricCard({
  highlight,
  label,
  note,
  value,
}: {
  highlight?: boolean;
  label: string;
  note?: string;
  value: string;
}) {
  return (
    <Card
      className={
        highlight
          ? "vendor-revenue-card !rounded-[14px] h-[150px]"
          : "vendor-metric-card !rounded-[14px] h-[150px]"
      }
    >
      <CardContent className="flex h-full flex-col justify-center p-7">
        <p className={highlight ? "text-[15px] font-medium text-white/85" : "vendor-muted text-[15px] font-medium"}>{label}</p>
        <p
          className={
            highlight
              ? "mt-5 min-w-0 text-[28px] font-bold leading-none tracking-tight text-white sm:text-[32px]"
              : "vendor-title mt-5 min-w-0 text-[28px] font-bold leading-none tracking-tight sm:text-[30px]"
          }
        >
          {value}
        </p>
        {note ? <p className={highlight ? "mt-3 text-[14px] text-white/85" : "vendor-muted mt-3 text-[14px]"}>{note}</p> : null}
      </CardContent>
    </Card>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  return (
    <div className="vendor-row-card flex flex-col gap-3 rounded-[14px] border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="vendor-muted text-xs">{formatDateTime(order.createdAt)}</span>
        </div>
        <p className="vendor-title text-base font-semibold">Order {shortOrderId(order.id)}</p>
        <p className="vendor-muted text-sm">{order.shipping.fullName}</p>
      </div>
      <p className="vendor-title text-lg font-bold">{formatTnd(order.total)}</p>
    </div>
  );
}

function shortOrderId(id: string) {
  return `#${id.slice(0, 8)}`;
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

