"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import {
  formatDateTime,
  getErrorMessage,
  getOrderItemCount,
  shortId,
} from "@/components/admin/adminUtils";
import {
  OrderStatusBadge,
  formatOrderStatus,
  getOrderStatusEffectNote,
  getOrderStatusMeaning,
  getOrderStatusOptions,
  isFinalOrderStatus,
} from "@/components/orders/OrderStatus";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Order, OrderStatus } from "@/types";

type OrderMessage = {
  orderId?: string;
  text: string;
  tone: "success" | "error";
};

export function AdminOrdersPageClient() {
  return (
    <AdminAccessGate>
      <AdminDashboardFrame>
        <AdminOrdersContent />
      </AdminDashboardFrame>
    </AdminAccessGate>
  );
}

function AdminOrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, OrderStatus>>({});
  const [message, setMessage] = useState<OrderMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      setIsLoading(true);
      setMessage(null);

      try {
        const response = await api.admin.orders.list();

        if (isActive) {
          applyOrders(response);
        }
      } catch (error) {
        if (isActive) {
          setMessage({
            text: getErrorMessage(error, "Could not load admin orders."),
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
      orders.filter((order) => !isFinalOrderStatus(order.status)),
    [orders],
  );

  function applyOrders(nextOrders: Order[]) {
    setOrders(nextOrders);
    setSelectedStatuses(
      Object.fromEntries(nextOrders.map((order) => [order.id, order.status])),
    );
  }

  async function updateStatus(order: Order) {
    const nextStatus = selectedStatuses[order.id] ?? order.status;
    const allowedStatuses = getOrderStatusOptions(order.status);

    if (!allowedStatuses.includes(nextStatus)) {
      setMessage({
        orderId: order.id,
        text: `Order cannot move from ${formatOrderStatus(order.status)} to ${formatOrderStatus(nextStatus)}.`,
        tone: "error",
      });
      return;
    }

    setActiveOrderId(order.id);
    setMessage(null);

    try {
      const response = await api.admin.orders.updateStatus(order.id, nextStatus);
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
        text: getErrorMessage(error, "Could not update order status."),
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
          <p className="text-sm font-semibold text-market-700">Order supervision</p>
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Marketplace orders
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Monitor COD orders across vendors and update status when needed.
          </p>
        </div>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
          {openOrders.length} open
        </div>
      </div>

      {message && !message.orderId ? <InlineMessage message={message} /> : null}

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm font-semibold text-slate-950">Loading orders</p>
            <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-lg font-bold text-slate-950">No orders yet</p>
            <p className="mt-2 text-sm text-slate-500">
              Marketplace COD orders will appear here after checkout.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <AdminOrderCard
              activeOrderId={activeOrderId}
              key={order.id}
              message={message?.orderId === order.id ? message : null}
              onStatusChange={(status) =>
                setSelectedStatuses((current) => ({ ...current, [order.id]: status }))
              }
              onUpdateStatus={() => updateStatus(order)}
              order={order}
              selectedStatus={selectedStatuses[order.id] ?? order.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminOrderCard({
  activeOrderId,
  message,
  onStatusChange,
  onUpdateStatus,
  order,
  selectedStatus,
}: {
  activeOrderId: string | null;
  message: OrderMessage | null;
  onStatusChange: (status: OrderStatus) => void;
  onUpdateStatus: () => void;
  order: Order;
  selectedStatus: OrderStatus;
}) {
  const isUpdating = activeOrderId === order.id;
  const statusOptions = getOrderStatusOptions(order.status);
  const safeSelectedStatus = statusOptions.includes(selectedStatus)
    ? selectedStatus
    : order.status;
  const statusChanged = safeSelectedStatus !== order.status;
  const effectNote = getOrderStatusEffectNote(safeSelectedStatus);
  const canChangeStatus = statusOptions.length > 1;

  return (
    <Card>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <OrderStatusBadge status={order.status} />
              <span className="text-xs font-medium text-slate-500">
                {formatDateTime(order.createdAt)}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Order {shortId(order.id)}</h3>
              <p className="break-all text-xs text-slate-500">{order.id}</p>
            </div>
          </div>
          <div className="text-left xl:text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-xl font-bold text-slate-950">{formatTnd(order.total)}</p>
          </div>
        </div>

        <div className="grid gap-3 border-y border-slate-200 py-4 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Fact label="Vendor" value={order.vendor.storeName} />
          <Fact label="Buyer" value={order.shipping.fullName} />
          <Fact label="Phone" value={order.shipping.phone} />
          <Fact label="City" value={order.shipping.city} />
          <Fact label="Items" value={`${getOrderItemCount(order)}`} />
          <Fact label="Payment" value="Cash on delivery" />
          <Fact label="Payment status" value={order.paymentStatus} />
          <Fact label="Address" value={order.shipping.address} />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-950">Items</p>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
            {order.items.map((item) => (
              <div
                className="grid gap-2 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_80px_120px] sm:items-center"
                key={item.id}
              >
                <div className="min-w-0">
                  <Link
                    className="font-semibold text-slate-950 hover:text-market-700"
                    href={`/product/${item.productSlug}`}
                  >
                    {item.productName}
                  </Link>
                  <p className="break-all text-xs text-slate-500">{item.productSlug}</p>
                </div>
                <p className="font-semibold text-slate-950">Qty {item.quantity}</p>
                <p className="font-semibold text-slate-950 sm:text-right">
                  {formatTnd(item.subtotal)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor={`status-${order.id}`}>
              Update status
            </label>
            <select
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15 disabled:bg-slate-50 disabled:text-slate-500"
              disabled={!canChangeStatus}
              id={`status-${order.id}`}
              onChange={(event) => onStatusChange(event.target.value as OrderStatus)}
              value={safeSelectedStatus}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatOrderStatus(status)}
                </option>
              ))}
            </select>
            <p className="text-xs font-medium text-slate-500">
              {getOrderStatusMeaning(safeSelectedStatus)}
            </p>
            {effectNote ? (
              <p className="text-xs font-semibold text-slate-700">{effectNote}</p>
            ) : null}
          </div>
          <Button disabled={isUpdating || !statusChanged} onClick={onUpdateStatus}>
            {isUpdating ? "Updating" : "Update"}
          </Button>
        </div>

        {message ? <InlineMessage message={message} /> : null}
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="break-words font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function InlineMessage({ message }: { message: OrderMessage }) {
  return (
    <p
      className={
        message.tone === "success"
          ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          : "rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
      }
    >
      {message.text}
    </p>
  );
}
