"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Order } from "@/types";

export function OrdersPageClient() {
  const router = useRouter();
  const { isLoading: isUserLoading, user } = useCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

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
          setMessage(error instanceof Error ? error.message : "Could not load orders.");
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

  if (isUserLoading || (!user && !isUserLoading)) {
    return <OrdersLoadingState label="Checking your session" />;
  }

  if (isOrdersLoading) {
    return <OrdersLoadingState label="Loading your orders" />;
  }

  if (message) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-slate-950">Orders could not load</h1>
          <p className="text-sm text-red-700">{message}</p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <section className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">No orders yet</h1>
              <p className="text-sm leading-6 text-slate-500">
                Your cash-on-delivery orders from LocalMarket vendors will appear here.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
              href="/"
            >
              Start shopping
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-market-700">Buyer account</p>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Orders</h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Track your LocalMarket COD orders and check their vendor status.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
          href="/"
        >
          Continue shopping
        </Link>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderHistoryCard key={order.id} order={order} />
        ))}
      </div>
    </section>
  );
}

function OrderHistoryCard({ order }: { order: Order }) {
  const itemCount = getOrderItemCount(order);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span className="text-xs font-medium text-slate-500">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Order {shortOrderId(order.id)}</h2>
              <p className="break-all text-xs text-slate-500">{order.id}</p>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-xl font-bold text-slate-950">{formatTnd(order.total)}</p>
          </div>
        </div>

        <div className="grid gap-3 border-y border-slate-200 py-4 text-sm sm:grid-cols-3">
          <OrderFact label="Vendor" value={order.vendor.storeName} />
          <OrderFact label="Items" value={itemCount === 1 ? "1 item" : `${itemCount} items`} />
          <OrderFact label="Payment" value="Cash on delivery" />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            You will pay when you receive your order.
          </p>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
            href={`/orders/${order.id}`}
          >
            View details
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function OrderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function OrdersLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
      </CardContent>
    </Card>
  );
}

function getOrderItemCount(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
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
