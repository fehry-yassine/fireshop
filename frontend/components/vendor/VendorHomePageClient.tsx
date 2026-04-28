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

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
      ).length,
    [orders],
  );
  const recentOrders = orders.slice(0, 3);
  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "DELIVERED").length,
    [orders],
  );
  const deliveredRevenue = useMemo(
    () =>
      orders
        .filter((order) => order.status === "DELIVERED")
        .reduce((sum, order) => sum + Number(order.total), 0),
    [orders],
  );

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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Orders today" value={isLoading ? "--" : formatTnd(0)} />
        <MetricCard label="Orders this week" value={isLoading ? "--" : formatTnd(0)} />
        <MetricCard
          label="Orders this month"
          value={isLoading ? "--" : formatTnd(deliveredRevenue)}
          note={`${deliveredOrders} delivered`}
        />
        <MetricCard
          highlight
          label="Total revenue"
          value={isLoading ? "--" : formatTnd(orders.reduce((sum, order) => sum + Number(order.total), 0))}
          note={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
        />
      </div>

      <Card className="border-slate-200/90">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-bold text-slate-950">Order tracking</h3>
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
              <span>Delivered {orders.length ? Math.round((deliveredOrders / orders.length) * 100) : 0}%</span>
              <span>Returned 0%</span>
            </div>
          </div>
          <div className="rounded-full bg-market-100 px-4 py-4 text-center text-xl font-bold text-market-800">
            {isLoading ? "Loading..." : orders.length === 0 ? "No data available" : `${openOrders} open orders in progress`}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
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
            <h3 className="text-2xl font-bold text-slate-950">Orders traffic</h3>
            <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <div className="relative h-44 w-44 rounded-full border-[28px] border-market-700 border-r-market-300">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <p className="text-sm text-slate-500">Total</p>
                  <p className="text-4xl font-bold text-slate-950">{orders.length}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-sm font-semibold text-slate-700">
              <p className="rounded-lg border border-market-200 bg-market-50 px-2 py-2">
                {orders.length ? Math.round((openOrders / orders.length) * 100) : 0}% Open
              </p>
              <p className="rounded-lg border border-market-200 bg-market-100 px-2 py-2">
                {orders.length ? Math.round((deliveredOrders / orders.length) * 100) : 0}% Delivered
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
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
          ? "border-market-700 bg-gradient-to-br from-market-800 to-market-700 text-white"
          : "bg-white/95"
      }
    >
      <CardContent className="space-y-1.5">
        <p className={highlight ? "text-sm text-market-100" : "text-sm text-slate-500"}>{label}</p>
        <p className={highlight ? "text-4xl font-bold leading-none text-white" : "text-4xl font-bold leading-none text-slate-950"}>
          {value}
        </p>
        {note ? <p className={highlight ? "text-sm text-market-100" : "text-sm text-slate-500"}>{note}</p> : null}
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
