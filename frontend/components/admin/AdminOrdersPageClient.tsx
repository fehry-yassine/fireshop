"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import {
  formatDateTime,
  getErrorMessage,
  getOrderItemCount,
  shortId,
} from "@/components/admin/adminUtils";
import { DashboardDrawer } from "@/components/dashboard/DashboardDrawer";
import {
  formatOrderStatus,
  getOrderStatusEffectNote,
  getOrderStatusMeaning,
  getOrderStatusOptions,
  isFinalOrderStatus,
} from "@/components/orders/OrderStatus";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Order, OrderStatus } from "@/types";

type OrderStatusFilter = OrderStatus | "ALL";

type OrderMessage = {
  orderId?: string;
  text: string;
  tone: "success" | "error";
};

const ORDER_STATUS_FILTERS: OrderStatusFilter[] = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];
const ORDER_TABLE_SCROLL_STYLE = {
  maxHeight: "clamp(520px, calc(100vh - 360px), 720px)",
};
const ORDER_TABLE_HEADER_CELL_CLASS =
  "sticky top-0 z-20 whitespace-nowrap border-b border-slate-200 bg-slate-50 py-2.5";
const ORDER_TABLE_BODY_CELL_CLASS = "py-2.5";
const ORDER_TABLE_COLUMNS = [
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "id",
    label: "ID",
    width: "5.5%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto flex w-full justify-center",
    headerClass: "text-center",
    key: "status",
    label: "Status",
    width: "11.5%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[136px] min-w-0 text-center",
    headerClass: "text-center",
    key: "vendor",
    label: "Vendor",
    width: "13%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[136px] min-w-0 text-center",
    headerClass: "text-center",
    key: "buyer",
    label: "Buyer",
    width: "13%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[120px] min-w-0 text-center",
    headerClass: "text-center",
    key: "phone",
    label: "Phone",
    width: "11%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "items",
    label: "Items",
    width: "6%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "total",
    label: "Total",
    width: "8.5%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "created",
    label: "Created",
    width: "13.5%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto flex w-full justify-center",
    headerClass: "text-center",
    key: "actions",
    label: "Actions",
    width: "18%",
  },
] as const;
const ORDER_TABLE_COLUMN = {
  actions: ORDER_TABLE_COLUMNS[8],
  buyer: ORDER_TABLE_COLUMNS[3],
  created: ORDER_TABLE_COLUMNS[7],
  id: ORDER_TABLE_COLUMNS[0],
  items: ORDER_TABLE_COLUMNS[5],
  phone: ORDER_TABLE_COLUMNS[4],
  status: ORDER_TABLE_COLUMNS[1],
  total: ORDER_TABLE_COLUMNS[6],
  vendor: ORDER_TABLE_COLUMNS[2],
} as const;

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
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");

  const applyOrders = useCallback((nextOrders: Order[]) => {
    setOrders(nextOrders);
    setSelectedStatuses(
      Object.fromEntries(nextOrders.map((order) => [order.id, order.status])),
    );
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await api.admin.orders.list({ limit: 100 });
      applyOrders(response);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not load admin orders."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [applyOrders]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const openOrders = useMemo(
    () => orders.filter((order) => !isFinalOrderStatus(order.status)),
    [orders],
  );

  const orderStats = useMemo(
    () => ({
      cancelled: orders.filter((order) => order.status === "CANCELLED").length,
      delivered: orders.filter((order) => order.status === "DELIVERED").length,
      open: openOrders.length,
      returned: orders.filter((order) => order.status === "RETURNED").length,
    }),
    [openOrders.length, orders],
  );

  const vendorOptions = useMemo(() => {
    const vendors = new Map<string, string>();

    orders.forEach((order) => {
      vendors.set(order.vendor.id, order.vendor.storeName);
    });

    return Array.from(vendors, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) {
        return false;
      }

      if (vendorFilter !== "ALL" && order.vendor.id !== vendorFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        order.id,
        shortId(order.id),
        order.vendor.storeName,
        order.buyer.fullName,
        order.buyer.email,
        order.shipping.fullName,
        order.shipping.phone,
        order.shipping.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [orders, search, statusFilter, vendorFilter]);

  const drawerOrder = useMemo(
    () => orders.find((order) => order.id === drawerOrderId) ?? null,
    [drawerOrderId, orders],
  );

  const hasFilters =
    search.trim().length > 0 || statusFilter !== "ALL" || vendorFilter !== "ALL";

  function updateSelectedStatus(orderId: string, status: OrderStatus) {
    setSelectedStatuses((current) => ({ ...current, [orderId]: status }));
  }

  async function handleStatusChange(orderId: string, nextStatus: OrderStatus) {
    const order = orders.find((item) => item.id === orderId);

    if (!order) {
      setMessage({
        orderId,
        text: "Order is no longer available in the current list.",
        tone: "error",
      });
      return;
    }

    const allowedNextStatuses = getAllowedNextStatuses(order.status);

    if (!allowedNextStatuses.includes(nextStatus)) {
      setMessage({
        orderId,
        text: `Order cannot move from ${formatOrderStatus(order.status)} to ${formatOrderStatus(nextStatus)}.`,
        tone: "error",
      });
      return;
    }

    setActiveOrderId(orderId);
    setMessage(null);

    try {
      const response = await api.admin.orders.updateStatus(orderId, nextStatus);
      setOrders((current) =>
        current.map((item) => (item.id === orderId ? response.order : item)),
      );
      setSelectedStatuses((current) => ({
        ...current,
        [orderId]: response.order.status,
      }));
      setMessage({
        orderId,
        text: `Order moved to ${formatOrderStatus(response.order.status)}.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        orderId,
        text: getErrorMessage(error, "Could not update order status."),
        tone: "error",
      });
    } finally {
      setActiveOrderId(null);
    }
  }

  function cancelOrder(order: Order) {
    if (!canCancelOrder(order)) {
      return;
    }

    const confirmed = window.confirm(
      "Cancel this order? Stock will be restored automatically if needed.",
    );

    if (confirmed) {
      void handleStatusChange(order.id, "CANCELLED");
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setVendorFilter("ALL");
  }

  return (
    <div className="admin-page-shell">
      <div className="admin-page-header">
        <div className="space-y-2">
          <p className="admin-page-eyebrow">Order supervision</p>
          <h2 className="admin-page-title">
            Marketplace orders
          </h2>
          <p className="admin-page-description">
            Monitor COD orders across vendors and update status when needed.
          </p>
        </div>
        <div className="admin-header-badge">
          {openOrders.length} open
        </div>
      </div>

      {message && (!drawerOrder || message.orderId !== drawerOrder.id) ? (
        <InlineMessage message={message} />
      ) : null}

      <OrderKpiCards stats={orderStats} />

      <Card className="admin-surface-card">
        <CardContent className="space-y-2.5 p-3.5 sm:p-4">
          <div className="admin-filter-bar grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_220px_auto_auto] lg:items-center">
            <Input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search order, buyer, phone, vendor"
              type="search"
              value={search}
            />
            <select
              className="h-10 appearance-none rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
              onChange={(event) => setStatusFilter(event.target.value as OrderStatusFilter)}
              value={statusFilter}
            >
              {ORDER_STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All statuses" : formatOrderStatus(status)}
                </option>
              ))}
            </select>
            <select
              className="h-10 appearance-none rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
              onChange={(event) => setVendorFilter(event.target.value)}
              value={vendorFilter}
            >
              <option value="ALL">All vendors</option>
              {vendorOptions.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </option>
              ))}
            </select>
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              {filteredOrders.length} shown
            </p>
            <Button
              className="h-10 border-slate-200 px-3"
              disabled={!hasFilters}
              onClick={clearFilters}
              variant="secondary"
            >
              Clear
            </Button>
          </div>

          {isLoading ? (
            <EmptyPanel
              title="Loading orders"
              text="Please wait while the marketplace order queue loads."
            />
          ) : orders.length === 0 ? (
            <EmptyPanel
              title="No orders found."
              text="Marketplace COD orders will appear here after checkout."
            />
          ) : filteredOrders.length === 0 ? (
            <EmptyPanel
              title="No orders found."
              text="Try clearing filters or changing status."
            />
          ) : (
            <>
              <div
                className="admin-table-shell hidden overflow-auto bg-white md:block"
                style={ORDER_TABLE_SCROLL_STYLE}
              >
                <table className="admin-table min-w-[1180px] table-fixed xl:min-w-full">
                  <colgroup>
                    {ORDER_TABLE_COLUMNS.map((column) => (
                      <col key={column.key} style={{ width: column.width }} />
                    ))}
                  </colgroup>
                  <thead>
                    <tr>
                      {ORDER_TABLE_COLUMNS.map((column) => (
                        <th
                          className={`${ORDER_TABLE_HEADER_CELL_CLASS} ${column.headerClass}`}
                          key={column.key}
                        >
                          <span className={column.contentClass}>
                            {column.label}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, index) => (
                      <AdminOrderTableRow
                        activeOrderId={activeOrderId}
                        displayIndex={index + 1}
                        key={order.id}
                        onCancel={() => cancelOrder(order)}
                        onOpen={() => setDrawerOrderId(order.id)}
                        order={order}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredOrders.map((order) => (
                  <AdminOrderMobileRow
                    activeOrderId={activeOrderId}
                    key={order.id}
                    onCancel={() => cancelOrder(order)}
                    onOpen={() => setDrawerOrderId(order.id)}
                    order={order}
                  />
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DashboardDrawer
        description="View order details, verify customer and vendor data, and apply allowed status changes."
        eyebrow="Order editor"
        footer={
          <OrderDrawerFooter
            activeOrderId={activeOrderId}
            onCancel={drawerOrder ? () => cancelOrder(drawerOrder) : undefined}
            onClose={() => setDrawerOrderId(null)}
            onUpdate={
              drawerOrder
                ? () =>
                    handleStatusChange(
                      drawerOrder.id,
                      selectedStatuses[drawerOrder.id] ?? drawerOrder.status,
                    )
                : undefined
            }
            order={drawerOrder}
            selectedStatus={
              drawerOrder
                ? selectedStatuses[drawerOrder.id] ?? drawerOrder.status
                : undefined
            }
          />
        }
        onClose={() => setDrawerOrderId(null)}
        open={Boolean(drawerOrder)}
        title={drawerOrder ? `Order editor ${shortId(drawerOrder.id)}` : "Order editor"}
        width="xl"
      >
        {drawerOrder ? (
          <AdminOrderDrawer
            message={message?.orderId === drawerOrder.id ? message : null}
            onStatusChange={(status) => updateSelectedStatus(drawerOrder.id, status)}
            order={drawerOrder}
            selectedStatus={selectedStatuses[drawerOrder.id] ?? drawerOrder.status}
          />
        ) : null}
      </DashboardDrawer>
    </div>
  );
}

function AdminOrderTableRow({
  activeOrderId,
  displayIndex,
  onCancel,
  onOpen,
  order,
}: {
  activeOrderId: string | null;
  displayIndex: number;
  onCancel: () => void;
  onOpen: () => void;
  order: Order;
}) {
  return (
    <tr className="align-middle transition hover:bg-slate-50/80">
      <td className={`whitespace-nowrap font-bold text-slate-950 ${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.id.cellClass}`}>
        <span className={ORDER_TABLE_COLUMN.id.contentClass}>
          {displayIndex}
        </span>
      </td>
      <td className={`whitespace-nowrap ${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.status.cellClass}`}>
        <div className={ORDER_TABLE_COLUMN.status.contentClass}>
          <AdminOrderStatusBadge status={order.status} />
        </div>
      </td>
      <td className={`${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.vendor.cellClass}`}>
        <p className={`truncate font-semibold text-slate-800 ${ORDER_TABLE_COLUMN.vendor.contentClass}`}>
          {order.vendor.storeName}
        </p>
      </td>
      <td className={`${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.buyer.cellClass}`}>
        <p className={`truncate font-semibold text-slate-950 ${ORDER_TABLE_COLUMN.buyer.contentClass}`}>
          {order.shipping.fullName}
        </p>
      </td>
      <td className={`whitespace-nowrap text-slate-700 ${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.phone.cellClass}`}>
        <span className={`truncate ${ORDER_TABLE_COLUMN.phone.contentClass}`}>
          {order.shipping.phone}
        </span>
      </td>
      <td className={`whitespace-nowrap font-semibold tabular-nums text-slate-950 ${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.items.cellClass}`}>
        <span className={ORDER_TABLE_COLUMN.items.contentClass}>
          {getOrderItemCount(order)}
        </span>
      </td>
      <td className={`whitespace-nowrap font-bold tabular-nums text-slate-950 ${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.total.cellClass}`}>
        <span className={ORDER_TABLE_COLUMN.total.contentClass}>
          {formatTnd(order.total)}
        </span>
      </td>
      <td className={`whitespace-nowrap text-slate-700 ${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.created.cellClass}`}>
        <span className={ORDER_TABLE_COLUMN.created.contentClass}>
          {formatCompactDateTime(order.createdAt)}
        </span>
      </td>
      <td className={`whitespace-nowrap ${ORDER_TABLE_BODY_CELL_CLASS} ${ORDER_TABLE_COLUMN.actions.cellClass}`}>
        <div className={ORDER_TABLE_COLUMN.actions.contentClass}>
          <OrderRowActions
            activeOrderId={activeOrderId}
            onCancel={onCancel}
            onOpen={onOpen}
            order={order}
          />
        </div>
      </td>
    </tr>
  );
}

function OrderKpiCards({
  stats,
}: {
  stats: {
    cancelled: number;
    delivered: number;
    open: number;
    returned: number;
  };
}) {
  const cards = [
    {
      label: "Open orders",
      toneClass: "border-amber-200 bg-amber-50 text-amber-700",
      value: stats.open,
    },
    {
      label: "Delivered",
      toneClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
      value: stats.delivered,
    },
    {
      label: "Cancelled",
      toneClass: "border-slate-300 bg-slate-100 text-slate-700",
      value: stats.cancelled,
    },
    {
      label: "Returned",
      toneClass: "border-orange-200 bg-orange-50 text-orange-800",
      value: stats.returned,
    },
  ];

  return (
    <div className="admin-kpi-grid">
      {cards.map((card) => (
        <Card className="admin-kpi-card" key={card.label}>
          <CardContent className="admin-kpi-card-content">
            <div>
              <p className="admin-kpi-label">{card.label}</p>
              <p className="admin-kpi-value">{card.value}</p>
            </div>
            <span className={`admin-kpi-dot ${card.toneClass}`} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminOrderMobileRow({
  activeOrderId,
  onCancel,
  onOpen,
  order,
}: {
  activeOrderId: string | null;
  onCancel: () => void;
  onOpen: () => void;
  order: Order;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-950">{shortId(order.id)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{order.vendor.storeName}</p>
        </div>
        <AdminOrderStatusBadge status={order.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <Fact label="Buyer" value={order.shipping.fullName} />
        <Fact label="Phone" value={order.shipping.phone} />
        <Fact label="City" value={order.shipping.city} />
        <Fact label="Items" value={`${getOrderItemCount(order)}`} />
        <Fact label="Total" value={formatTnd(order.total)} />
        <Fact label="Created" value={formatDateTime(order.createdAt)} />
      </div>

      <div className="mt-4">
        <OrderRowActions
          activeOrderId={activeOrderId}
          onCancel={onCancel}
          onOpen={onOpen}
          order={order}
        />
      </div>
    </div>
  );
}

function OrderRowActions({
  activeOrderId,
  onCancel,
  onOpen,
  order,
}: {
  activeOrderId: string | null;
  onCancel: () => void;
  onOpen: () => void;
  order: Order;
}) {
  const isWorking = activeOrderId === order.id;
  const canCancel = canCancelOrder(order);

  return (
    <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
      <Button className="h-8 border-slate-200 px-2.5 text-xs" onClick={onOpen} variant="secondary">
        <EyeIcon />
        View/Edit
      </Button>
      {canCancel ? (
        <Button
          className="h-8 border-amber-200 bg-amber-50 px-2.5 text-xs text-amber-800 hover:border-amber-300 hover:bg-amber-100"
          disabled={isWorking}
          onClick={onCancel}
          variant="secondary"
        >
          <XCircleIcon />
          {isWorking ? "Cancelling" : "Cancel"}
        </Button>
      ) : null}
    </div>
  );
}

function AdminOrderDrawer({
  message,
  onStatusChange,
  order,
  selectedStatus,
}: {
  message: OrderMessage | null;
  onStatusChange: (status: OrderStatus) => void;
  order: Order;
  selectedStatus: OrderStatus;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <AdminOrderStatusBadge status={order.status} />
              <span className="text-xs font-semibold text-slate-500">
                Created {formatDateTime(order.createdAt)}
              </span>
            </div>
            <h3 className="mt-3 text-xl font-black text-slate-950">
              Order {shortId(order.id)}
            </h3>
            <p className="mt-1 break-all text-xs text-slate-500">{order.id}</p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-semibold text-slate-500">Total</p>
            <p className="text-2xl font-black text-slate-950">{formatTnd(order.total)}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {getOrderItemCount(order)} item(s)
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Customer details">
          <Fact label="Name" value={order.shipping.fullName} />
          <Fact label="Phone" value={order.shipping.phone} />
          <Fact label="Buyer account" value={order.buyer.fullName} />
          <Fact label="Email" value={order.buyer.email} />
        </SectionPanel>

        <SectionPanel title="Vendor details">
          <Fact label="Store" value={order.vendor.storeName} />
          <Fact label="Vendor slug" value={order.vendor.slug} />
          <Fact label="Vendor ID" value={order.vendor.id} />
        </SectionPanel>

        <SectionPanel title="Payment">
          <Fact label="Method" value={formatPaymentMethod(order.paymentMethod)} />
          <Fact label="Payment status" value={formatPaymentStatus(order.paymentStatus)} />
          <Fact label="Subtotal" value={formatTnd(order.subtotal)} />
          <Fact label="Delivery fee" value={formatTnd(order.deliveryFee)} />
        </SectionPanel>

        <SectionPanel title="Address">
          <Fact label="Address" value={formatShippingAddress(order)} />
          <Fact label="City" value={order.shipping.city} />
          <Fact label="Governorate" value={order.shipping.governorate ?? "Not provided"} />
          <Fact label="Postal code" value={order.shipping.postalCode ?? "Not provided"} />
        </SectionPanel>
      </div>

      <SectionPanel title="Order items">
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {order.items.map((item) => (
            <div
              className="grid gap-3 p-3 text-sm sm:grid-cols-[48px_minmax(0,1fr)_80px_120px] sm:items-center"
              key={item.id}
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {item.productImage?.url ? (
                  <img
                    alt={item.productImage.altText ?? item.productName}
                    className="h-full w-full object-cover"
                    src={item.productImage.url}
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-400">IMG</span>
                )}
              </div>
              <div className="min-w-0">
                <Link
                  className="font-semibold text-slate-950 hover:text-market-700"
                  href={`/product/${item.productSlug}`}
                >
                  {item.productName}
                </Link>
                <p className="truncate text-xs text-slate-500">{item.productSlug}</p>
              </div>
              <p className="font-semibold text-slate-950">Qty {item.quantity}</p>
              <p className="font-semibold text-slate-950 sm:text-right">
                {formatTnd(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Order note">
        <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
          {order.notes || "No order note provided."}
        </p>
      </SectionPanel>

      <OrderStatusEditor
        onStatusChange={onStatusChange}
        order={order}
        selectedStatus={selectedStatus}
      />

      <OrderPreservationNote />

      {message ? <InlineMessage message={message} /> : null}
    </div>
  );
}

function OrderStatusEditor({
  onStatusChange,
  order,
  selectedStatus,
}: {
  onStatusChange: (status: OrderStatus) => void;
  order: Order;
  selectedStatus: OrderStatus;
}) {
  const nextStatusOptions = getAllowedNextStatuses(order.status);
  const selectedNextStatus = nextStatusOptions.includes(selectedStatus)
    ? selectedStatus
    : null;
  const helpStatus = selectedNextStatus ?? order.status;
  const effectNote = getOrderStatusEffectNote(helpStatus);
  const isLocked = nextStatusOptions.length === 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">Status update</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Select one of the backend-allowed next statuses for this order.
          </p>
        </div>
        {isLocked ? (
          <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            Final status
          </span>
        ) : null}
      </div>

      {isLocked ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700">
          This order is final and cannot be changed.
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {nextStatusOptions.map((status) => {
            const isSelected = selectedNextStatus === status;

            return (
              <button
                className={
                  isSelected
                    ? "rounded-lg border border-market-700 bg-market-700 px-3 py-2 text-sm font-bold text-white shadow-sm shadow-market-700/20"
                    : "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                }
                key={status}
                onClick={() => onStatusChange(status)}
                type="button"
              >
                {formatOrderStatus(status)}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
        <p className="text-sm font-semibold text-slate-800">
          {getOperationalStatusHelp(helpStatus)}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {getOrderStatusMeaning(helpStatus)}
        </p>
        {effectNote ? (
          <p className="mt-2 text-xs font-bold text-slate-700">{effectNote}</p>
        ) : null}
      </div>
    </section>
  );
}

function OrderDrawerFooter({
  activeOrderId,
  onCancel,
  onClose,
  onUpdate,
  order,
  selectedStatus,
}: {
  activeOrderId: string | null;
  onCancel?: () => void;
  onClose: () => void;
  onUpdate?: () => void;
  order: Order | null;
  selectedStatus?: OrderStatus;
}) {
  const isWorking = order ? activeOrderId === order.id : false;
  const canCancel = order ? canCancelOrder(order) : false;
  const canUpdate = Boolean(
    order &&
      selectedStatus &&
      getAllowedNextStatuses(order.status).includes(selectedStatus),
  );

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button className="h-9 border-slate-200 px-3" onClick={onClose} variant="secondary">
        Close
      </Button>
      {order && canCancel && onCancel ? (
        <Button
          className="h-9 border-amber-200 bg-amber-50 px-3 text-amber-800 hover:border-amber-300 hover:bg-amber-100"
          disabled={isWorking}
          onClick={onCancel}
          variant="secondary"
        >
          <XCircleIcon />
          {isWorking ? "Cancelling" : "Cancel"}
        </Button>
      ) : null}
      <Button disabled={!canUpdate || isWorking} onClick={onUpdate}>
        {isWorking ? "Updating" : "Update status"}
      </Button>
    </div>
  );
}

function AdminOrderStatusBadge({ status }: { status: OrderStatus }) {
  const className = {
    PENDING: "border-amber-200 bg-amber-50 text-amber-800",
    CONFIRMED: "border-sky-200 bg-sky-50 text-sky-800",
    SHIPPED: "border-indigo-200 bg-indigo-50 text-indigo-800",
    DELIVERED: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-slate-300 bg-slate-100 text-slate-700",
    RETURNED: "border-orange-200 bg-orange-50 text-orange-800",
  }[status];

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold leading-none ${className}`}>
      {formatOrderStatus(status)}
    </span>
  );
}

function SectionPanel({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyPanel({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <p className="text-lg font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function formatCompactDateTime(value: string | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const datePart = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);

  return `${datePart} · ${timePart}`;
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

function OrderPreservationNote() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
      Orders are preserved for vendor reporting, stock history, and marketplace
      audit. Use Cancel or status updates instead of deleting.
    </div>
  );
}

function getAllowedNextStatuses(status: OrderStatus) {
  return getOrderStatusOptions(status).filter((option) => option !== status);
}

function canCancelOrder(order: Order) {
  return getAllowedNextStatuses(order.status).includes("CANCELLED");
}

function formatPaymentMethod(method: Order["paymentMethod"]) {
  if (method === "CASH_ON_DELIVERY") {
    return "Cash on delivery";
  }

  return method;
}

function formatPaymentStatus(status: Order["paymentStatus"]) {
  if (status === "UNPAID") {
    return "Unpaid";
  }

  if (status === "PAID") {
    return "Paid";
  }

  return "Cancelled";
}

function formatShippingAddress(order: Order) {
  return [order.shipping.address, order.shipping.addressLine2]
    .filter(Boolean)
    .join(", ");
}

function getOperationalStatusHelp(status: OrderStatus) {
  const copy: Record<OrderStatus, string> = {
    PENDING: "Pending: buyer submitted the order and it is waiting for confirmation.",
    CONFIRMED: "Confirmed: vendor or admin confirmed the order.",
    SHIPPED: "Shipped: order was sent to delivery.",
    DELIVERED: "Delivered: customer received the order.",
    CANCELLED: "Cancelled: order was cancelled before delivery.",
    RETURNED: "Returned: customer refused or returned the order.",
  };

  return copy[status];
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15 9l-6 6M9 9l6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
