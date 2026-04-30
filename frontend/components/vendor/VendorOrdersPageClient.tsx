"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ORDER_STATUS_OPTIONS,
  OrderStatusBadge,
  formatOrderStatus,
} from "@/components/orders/OrderStatus";
import { VendorAccessGate } from "@/components/vendor/VendorAccessGate";
import { VendorDashboardFrame } from "@/components/vendor/VendorDashboardFrame";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Order, OrderStatus, Vendor } from "@/types";

type StatusMessage = {
  orderId?: string;
  text: string;
  tone: "success" | "error";
};

export function VendorOrdersPageClient() {
  return (
    <VendorAccessGate>
      {({ vendor }) => (
        <VendorDashboardFrame vendor={vendor}>
          <VendorOrdersContent vendor={vendor} />
        </VendorDashboardFrame>
      )}
    </VendorAccessGate>
  );
}

function VendorOrdersContent({ vendor }: { vendor: Vendor }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, OrderStatus>>({});
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      setIsLoading(true);
      setMessage(null);

      try {
        const response = await api.vendors.orders();

        if (isActive) {
          applyOrders(response);
        }
      } catch (error) {
        if (isActive) {
          setMessage({
            text: error instanceof Error ? error.message : "Could not load vendor orders.",
            tone: "error",
          });
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
      ),
    [orders],
  );

  function applyOrders(nextOrders: Order[]) {
    setOrders(nextOrders);
    setSelectedStatuses(
      Object.fromEntries(nextOrders.map((order) => [order.id, order.status])),
    );
  }

  async function updateOrderStatus(order: Order) {
    const nextStatus = selectedStatuses[order.id] ?? order.status;
    setActiveOrderId(order.id);
    setMessage(null);

    try {
      const response = await api.vendors.updateOrderStatus(order.id, nextStatus);

      setOrders((current) =>
        current.map((item) => (item.id === order.id ? response.order : item)),
      );
      setSelectedStatuses((current) => ({
        ...current,
        [order.id]: response.order.status,
      }));
      setMessage({
        orderId: order.id,
        text: `Order moved to ${formatOrderStatus(response.order.status)}.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        orderId: order.id,
        text: getVendorOrderError(error),
        tone: "error",
      });
    } finally {
      setActiveOrderId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[#E64A29]">{vendor.storeName}</p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Received orders
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#98A0B2]">
            Confirm, prepare, ship, or cancel COD orders from buyers.
          </p>
        </div>
        <div className="rounded-xl border border-[#3D2D22] bg-[#261C16] px-3 py-2 text-sm font-semibold text-[#FF9B5D]">
          {openOrders.length} open
        </div>
      </div>

      {isLoading ? (
        <Card className="border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
          <CardContent className="py-10 text-center">
            <p className="text-sm font-semibold text-white">Loading received orders</p>
            <p className="mt-2 text-sm text-[#98A0B2]">Please wait a moment.</p>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
          <CardContent className="space-y-5 py-10 text-center">
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">No received orders yet</h3>
              <p className="text-sm leading-6 text-[#98A0B2]">
                Buyer COD orders for your store will appear here when checkout is complete.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#2A2E39] bg-[#171B23] px-4 text-sm font-semibold text-[#D5D9E1] transition-colors hover:border-[#353A48] hover:bg-[#1D212B]"
              href="/vendor"
            >
              Back to overview
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {message && !message.orderId ? (
            <p
              className={
                message.tone === "success"
                  ? "rounded-lg border border-emerald-900/35 bg-emerald-950/20 px-3 py-2 text-sm font-medium text-emerald-300"
                  : "rounded-lg border border-red-900/35 bg-red-950/20 px-3 py-2 text-sm font-medium text-red-300"
              }
            >
              {message.text}
            </p>
          ) : null}

          {orders.map((order) => (
            <VendorOrderCard
              activeOrderId={activeOrderId}
              key={order.id}
              message={message?.orderId === order.id ? message : null}
              onStatusChange={(status) =>
                setSelectedStatuses((current) => ({ ...current, [order.id]: status }))
              }
              onUpdateStatus={() => updateOrderStatus(order)}
              order={order}
              selectedStatus={selectedStatuses[order.id] ?? order.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VendorOrderCard({
  activeOrderId,
  message,
  onStatusChange,
  onUpdateStatus,
  order,
  selectedStatus,
}: {
  activeOrderId: string | null;
  message: StatusMessage | null;
  onStatusChange: (status: OrderStatus) => void;
  onUpdateStatus: () => void;
  order: Order;
  selectedStatus: OrderStatus;
}) {
  const itemCount = getOrderItemCount(order);
  const isUpdating = activeOrderId === order.id;
  const statusChanged = selectedStatus !== order.status;

  return (
    <Card className="border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span className="text-xs font-medium text-[#8F97A8]">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Order {shortOrderId(order.id)}</h3>
              <p className="break-all text-xs text-[#8F97A8]">{order.id}</p>
            </div>
          </div>

          <div className="text-left xl:text-right">
            <p className="text-sm text-[#8F97A8]">Total</p>
            <p className="text-xl font-bold text-white">{formatTnd(order.total)}</p>
          </div>
        </div>

        <div className="grid gap-3 border-y border-[#262B37] py-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <OrderFact label="Customer" value={order.shipping.fullName} />
          <OrderFact label="Phone" value={order.shipping.phone} />
          <OrderFact label="City" value={order.shipping.city} />
          <OrderFact label="Items" value={itemCount === 1 ? "1 item" : `${itemCount} items`} />
        </div>

        <div className="rounded-xl border border-[#2A2E39] bg-[#171B23] p-3 text-sm">
          <p className="font-semibold text-white">Delivery address</p>
          <p className="mt-1 text-[#9CA4B5]">{formatAddress(order)}</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-white">Order items</p>
          <div className="divide-y divide-[#262B37] rounded-xl border border-[#262B37]">
            {order.items.map((item) => (
              <div
                className="grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_80px_120px] sm:items-center"
                key={item.id}
              >
                <div className="min-w-0">
                  <Link
                    className="font-semibold text-[#E8EBF2] hover:text-[#FF8E4C]"
                    href={`/product/${item.productSlug}`}
                  >
                    {item.productName}
                  </Link>
                  <p className="break-all text-xs text-[#8F97A8]">{item.productSlug}</p>
                </div>
                <p className="font-semibold text-[#E8EBF2]">Qty {item.quantity}</p>
                <p className="font-semibold text-[#E8EBF2] sm:text-right">
                  {formatTnd(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-xl border border-[#262B37] bg-[#171B23] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#C3C9D6]" htmlFor={`status-${order.id}`}>
              Update status
            </label>
            <select
              className="h-10 w-full rounded-lg border border-[#2A2E39] bg-[#11141B] px-3 text-sm font-medium text-[#EEF0F4] outline-none transition focus:border-[#FF6A2D] focus:ring-2 focus:ring-[#FF6A2D]/20"
              id={`status-${order.id}`}
              onChange={(event) => onStatusChange(event.target.value as OrderStatus)}
              value={selectedStatus}
            >
              {ORDER_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatOrderStatus(status)}
                </option>
              ))}
            </select>
          </div>
          <Button
            className="bg-gradient-to-r from-[#FF6A2D] to-[#FF8F40] hover:from-[#FF7A3B] hover:to-[#FF9D56] focus-visible:ring-[#FF6A2D]/30"
            disabled={isUpdating || !statusChanged}
            onClick={onUpdateStatus}
          >
            {isUpdating ? "Updating" : "Update"}
          </Button>
        </div>

        {message ? (
          <p
            className={
              message.tone === "success"
                ? "rounded-lg border border-emerald-900/35 bg-emerald-950/20 px-3 py-2 text-sm font-medium text-emerald-300"
                : "rounded-lg border border-red-900/35 bg-red-950/20 px-3 py-2 text-sm font-medium text-red-300"
            }
          >
            {message.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OrderFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[#8F97A8]">{label}</p>
      <p className="break-words font-semibold text-[#E8EBF2]">{value}</p>
    </div>
  );
}

function getVendorOrderError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not update order status.";
}

function getOrderItemCount(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function formatAddress(order: Order) {
  return [order.shipping.address, order.shipping.addressLine2, order.shipping.city]
    .filter(Boolean)
    .join(", ");
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

