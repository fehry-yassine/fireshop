"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { VendorAccessGate } from "@/components/vendor/VendorAccessGate";
import { VendorDashboardFrame } from "@/components/vendor/VendorDashboardFrame";
import { Card, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Order, Vendor } from "@/types";

export function VendorHomePageClient() {
  return (
    <VendorAccessGate>
      {({ vendor }) => (
        <VendorDashboardFrame vendor={vendor}>
          <VendorOverview vendor={vendor} />
        </VendorDashboardFrame>
      )}
    </VendorAccessGate>
  );
}

function VendorOverview({ vendor }: { vendor: Vendor }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      setIsLoading(true);
      setMessage(null);

      try {
        const response = await api.vendors.orders();

        if (isActive) {
          setOrders(response);
        }
      } catch (error) {
        if (isActive) {
          setMessage(error instanceof Error ? error.message : "Could not load vendor orders.");
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, []);

  const pendingOrders = useMemo(
    () => orders.filter((order) => order.status === "PENDING").length,
    [orders],
  );
  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
      ).length,
    [orders],
  );
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-market-700">Vendor dashboard</p>
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            {vendor.storeName}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Track received COD orders, confirm requests, and move orders through
            preparation and delivery.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
          href="/vendor/orders"
        >
          Manage orders
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Received orders" value={`${orders.length}`} />
        <MetricCard label="Open orders" value={`${openOrders}`} />
        <MetricCard label="Pending confirmation" value={`${pendingOrders}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Recent received orders</h3>
                <p className="text-sm text-slate-500">Newest COD orders for your store.</p>
              </div>
              <Link className="text-sm font-semibold text-market-700" href="/vendor/orders">
                View all
              </Link>
            </div>

            {isLoading ? (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Loading recent orders.
              </p>
            ) : message ? (
              <p className="rounded-lg bg-red-50 px-3 py-4 text-sm text-red-700">
                {message}
              </p>
            ) : recentOrders.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No received orders yet.
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

        <Card>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-bold text-slate-950">Quick links</h3>
            <div className="space-y-2">
              <QuickLink href="/vendor/orders" label="Review received orders" />
              <QuickLink href="/" label="View marketplace" />
            </div>
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              Call the buyer before shipping when address or phone details look unclear.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="bg-white/95">
      <CardContent className="space-y-1.5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold leading-none text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function RecentOrderRow({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/50 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</span>
        </div>
        <p className="font-semibold text-slate-950">Order {shortOrderId(order.id)}</p>
        <p className="text-sm text-slate-500">{order.shipping.fullName}</p>
      </div>
      <p className="font-bold text-slate-950">{formatTnd(order.total)}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="flex h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
      href={href}
    >
      {label}
    </Link>
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

  return new Intl.DateTimeFormat("en-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
