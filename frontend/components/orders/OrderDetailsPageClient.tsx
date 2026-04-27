"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  OrderStatusBadge,
  OrderTimeline,
  formatOrderStatus,
} from "@/components/orders/OrderStatus";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Order } from "@/types";

type OrderDetailsPageClientProps = {
  orderId: string;
};

export function OrderDetailsPageClient({ orderId }: OrderDetailsPageClientProps) {
  const router = useRouter();
  const { isLoading: isUserLoading, user } = useCurrentUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isOrderLoading, setIsOrderLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    let isActive = true;

    async function loadOrder() {
      setIsOrderLoading(true);
      setMessage(null);
      setIsNotFound(false);

      try {
        const response = await api.orders.getById(orderId);

        if (isActive) {
          setOrder(response);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (isActive && error instanceof ApiError && error.status === 404) {
          setIsNotFound(true);
          return;
        }

        if (isActive) {
          setMessage(error instanceof Error ? error.message : "Could not load order.");
        }
      } finally {
        if (isActive) {
          setIsOrderLoading(false);
        }
      }
    }

    void loadOrder();

    return () => {
      isActive = false;
    };
  }, [isUserLoading, orderId, router, user]);

  if (isUserLoading || (!user && !isUserLoading)) {
    return <OrderDetailsLoadingState label="Checking your session" />;
  }

  if (isOrderLoading) {
    return <OrderDetailsLoadingState label="Loading order details" />;
  }

  if (isNotFound) {
    return (
      <section className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <Badge tone="neutral">Not found</Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">Order not found</h1>
              <p className="text-sm leading-6 text-slate-500">
                This order does not exist, or it is not linked to your buyer account.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
              href="/orders"
            >
              Back to orders
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (message || !order) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-slate-950">Order could not load</h1>
          <p className="text-sm text-red-700">{message ?? "Please try again."}</p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link className="text-sm font-semibold text-market-700 hover:text-market-800" href="/orders">
            Back to orders
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <Badge tone="success">Cash on delivery</Badge>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
              Order {shortOrderId(order.id)}
            </h1>
            <p className="break-all text-xs text-slate-500">{order.id}</p>
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-950">{formatTnd(order.total)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Status: {formatOrderStatus(order.status)}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  The vendor updates this status as your local COD order moves forward.
                </p>
              </div>
              <OrderTimeline status={order.status} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Order items</h2>
                  <p className="text-sm text-slate-500">
                    {itemCount === 1 ? "1 item" : `${itemCount} items`} from{" "}
                    {order.vendor.storeName}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-950">
                  Created {formatDateTime(order.createdAt)}
                </p>
              </div>

              <div className="divide-y divide-slate-200">
                {order.items.map((item) => (
                  <div className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_120px_90px_120px] sm:items-start" key={item.id}>
                    <div className="min-w-0">
                      <Link
                        className="font-semibold text-slate-950 hover:text-market-700"
                        href={`/product/${item.productSlug}`}
                      >
                        {item.productName}
                      </Link>
                      <p className="break-all text-xs text-slate-500">{item.productSlug}</p>
                    </div>
                    <OrderItemFact label="Unit price" value={formatTnd(item.unitPrice)} />
                    <OrderItemFact label="Qty" value={`${item.quantity}`} />
                    <OrderItemFact label="Subtotal" value={formatTnd(item.subtotal)} alignRight />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-lg font-bold text-slate-950">Delivery</h2>
              <div className="space-y-3 text-sm">
                <DetailRow label="Customer" value={order.shipping.fullName} />
                <DetailRow label="Phone" value={order.shipping.phone} />
                <DetailRow label="Address" value={formatAddress(order)} />
                <DetailRow label="City" value={order.shipping.city} />
                {order.shipping.governorate ? (
                  <DetailRow label="Governorate" value={order.shipping.governorate} />
                ) : null}
                {order.shipping.postalCode ? (
                  <DetailRow label="Postal code" value={order.shipping.postalCode} />
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-lg font-bold text-slate-950">Payment</h2>
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Cash on delivery. You will pay when you receive your order.
              </div>
              <div className="space-y-3 text-sm">
                <DetailRow label="Method" value="Cash on delivery" />
                <DetailRow label="Payment status" value={formatPaymentStatus(order.paymentStatus)} />
                <DetailRow label="Vendor" value={order.vendor.storeName} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4">
              <h2 className="text-lg font-bold text-slate-950">Summary</h2>
              <div className="space-y-3 border-y border-slate-200 py-4 text-sm">
                <DetailRow label="Subtotal" value={formatTnd(order.subtotal)} />
                <DetailRow label="Delivery" value={formatTnd(order.deliveryFee)} />
                <DetailRow label="Items" value={`${itemCount}`} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-base font-bold text-slate-950">Total</span>
                <span className="text-xl font-bold text-slate-950">{formatTnd(order.total)}</span>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function OrderItemFact({
  alignRight = false,
  label,
  value,
}: {
  alignRight?: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className={alignRight ? "sm:text-right" : undefined}>
      <p className="text-xs text-slate-500 sm:hidden">{label}</p>
      <p className="text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function OrderDetailsLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
      </CardContent>
    </Card>
  );
}

function formatAddress(order: Order) {
  return [order.shipping.address, order.shipping.addressLine2].filter(Boolean).join(", ");
}

function formatPaymentStatus(status: Order["paymentStatus"]) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
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
