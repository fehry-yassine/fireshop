"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { formatDateTime, getErrorMessage } from "@/components/admin/adminUtils";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { AdminProductListItem, Order, Product, VendorApplication } from "@/types";

type FocusTone = "active" | "neutral";
type FocusKey = "vendorReview" | "openOrders" | "returnsWatch" | "recheckVendors";

const LOW_STOCK_THRESHOLD = 5;
const LOW_STOCK_VISIBLE_LIMIT = 4;
const DASHBOARD_PRODUCTS_LIMIT = 100;

export function AdminHomePageClient() {
  return (
    <AdminAccessGate>
      <AdminDashboardFrame>
        <AdminOverview />
      </AdminDashboardFrame>
    </AdminAccessGate>
  );
}

function AdminOverview() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadOverview() {
      setIsLoading(true);
      setMessage(null);

      try {
        const [nextApplications, nextOrders, nextProducts] =
          await Promise.all([
            api.admin.vendors.applications(),
            api.admin.orders.list(),
            api.admin.products.list({ limit: DASHBOARD_PRODUCTS_LIMIT }),
          ]);

        if (isActive) {
          setApplications(nextApplications);
          setOrders(nextOrders);
          setProducts(nextProducts.items);
        }
      } catch (error) {
        if (isActive) {
          setMessage(getErrorMessage(error, "Could not load admin dashboard."));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      isActive = false;
    };
  }, []);

  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.status !== "DELIVERED" &&
          order.status !== "CANCELLED" &&
          order.status !== "RETURNED",
      ).length,
    [orders],
  );
  const deliveredOrders = useMemo(
    () => orders.filter((order) => order.status === "DELIVERED").length,
    [orders],
  );
  const cancelledOrders = useMemo(
    () => orders.filter((order) => order.status === "CANCELLED").length,
    [orders],
  );
  const deliveredRevenue = useMemo(
    () =>
      orders
        .filter((order) => order.status === "DELIVERED")
        .reduce((sum, order) => sum + Number(order.total), 0),
    [orders],
  );
  const returnedOrders = useMemo(
    () => orders.filter((order) => order.status === "RETURNED").length,
    [orders],
  );
  const totalRevenue = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total), 0),
    [orders],
  );
  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === "PENDING").length,
    [applications],
  );
  const rejectedApplications = useMemo(
    () => applications.filter((application) => application.status === "REJECTED").length,
    [applications],
  );
  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const lowStockProducts = useMemo(
    () =>
      products
        .filter((product) => product.stock <= LOW_STOCK_THRESHOLD)
        .sort((first, second) => {
          if (first.stock !== second.stock) {
            return first.stock - second.stock;
          }

          return Date.parse(second.updatedAt) - Date.parse(first.updatedAt);
        })
        .slice(0, LOW_STOCK_VISIBLE_LIMIT),
    [products],
  );
  const deliveredPercent = getPercent(deliveredOrders, orders.length);
  const openPercent = getPercent(openOrders, orders.length);
  const returnedPercent = getPercent(returnedOrders, orders.length);
  const cancelledPercent = getPercent(cancelledOrders, orders.length);
  const activeFocus = getActiveFocus({
    openOrders,
    pendingApplications,
    rejectedApplications,
    returnedOrders,
  });

  return (
    <div className="admin-page-shell">
      <div className="admin-page-header">
        <div className="space-y-2">
          <p className="admin-page-eyebrow">Admin dashboard</p>
          <h2 className="admin-page-title">
            Operations overview
          </h2>
          <p className="admin-page-description">
            Review seller applications, supervise COD orders, and maintain marketplace operations.
          </p>
        </div>
        <Link
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-market-700 px-4 text-sm font-bold text-white shadow-sm shadow-market-700/20 transition-colors hover:bg-market-800"
          href="/admin/vendors"
        >
          Review vendors
        </Link>
      </div>

      {message ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {message}
        </p>
      ) : null}

      <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          isLoading={isLoading}
          label="Vendor applications"
          note={pendingApplications > 0 ? `${formatCount(pendingApplications)} pending review` : "No pending review"}
          value={formatCount(applications.length)}
        />
        <MetricCard
          isLoading={isLoading}
          label="Open orders"
          note="In progress"
          value={formatCount(openOrders)}
        />
        <MetricCard
          isLoading={isLoading}
          label="Delivered revenue"
          note={`${formatCount(deliveredOrders)} delivered`}
          value={formatTnd(deliveredRevenue)}
        />
        <MetricCard
          highlight
          isLoading={isLoading}
          label="Total revenue"
          note={`${formatCount(orders.length)} order${orders.length === 1 ? "" : "s"}`}
          value={formatTnd(totalRevenue)}
        />
      </div>

      <OperationsFocus
        activeFocus={activeFocus}
        isLoading={isLoading}
        openOrders={openOrders}
        pendingApplications={pendingApplications}
        rejectedApplications={rejectedApplications}
        returnedOrders={returnedOrders}
      />

      <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RecentOrdersCard isLoading={isLoading} orders={recentOrders} />
        <LowStockAlertsCard isLoading={isLoading} products={lowStockProducts} />
      </div>

      <div className="grid items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <OrderTrackingCard
          deliveredPercent={deliveredPercent}
          isLoading={isLoading}
          openOrders={openOrders}
          openPercent={openPercent}
          orderCount={orders.length}
          returnedPercent={returnedPercent}
        />
        <OrdersTrafficCard
          cancelledPercent={cancelledPercent}
          deliveredPercent={deliveredPercent}
          isLoading={isLoading}
          openPercent={openPercent}
          orderCount={orders.length}
          returnedPercent={returnedPercent}
        />
      </div>

      <RecentApplicationsCard applications={applications} isLoading={isLoading} />
    </div>
  );
}

function MetricCard({
  highlight,
  isLoading,
  label,
  note,
  value,
}: {
  highlight?: boolean;
  isLoading: boolean;
  label: string;
  note?: string;
  value: string;
}) {
  return (
    <Card
      className={
        highlight
          ? "relative h-full overflow-hidden rounded-2xl border-orange-200 bg-white shadow-sm shadow-orange-100/70 before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-market-700"
          : "relative h-full overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm shadow-slate-200/70"
      }
    >
      <CardContent className="flex min-h-[154px] flex-col p-5">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="flex flex-1 items-center py-3">
          <p className={highlight ? "text-3xl font-black leading-none text-market-800 sm:text-4xl" : "text-3xl font-black leading-none text-slate-950 sm:text-4xl"}>
            {isLoading ? "--" : value}
          </p>
        </div>
        {note ? (
          <p className={highlight ? "text-sm font-semibold text-orange-800/80" : "text-sm font-semibold text-slate-500"}>
            {isLoading ? "--" : note}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OperationsFocus({
  activeFocus,
  isLoading,
  openOrders,
  pendingApplications,
  rejectedApplications,
  returnedOrders,
}: {
  activeFocus: FocusKey | null;
  isLoading: boolean;
  openOrders: number;
  pendingApplications: number;
  rejectedApplications: number;
  returnedOrders: number;
}) {
  return (
    <Card className="admin-surface-card">
      <CardContent className="grid gap-3.5 p-4 sm:p-[1.125rem] lg:grid-cols-[250px_minmax(0,1fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-wide text-market-700">
            Operations focus
          </p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-600">
            Start with the queues that can slow marketplace flow.
          </p>
          <p className="mt-2 text-xs font-bold text-slate-500">
            First priority: {isLoading ? "Loading queues" : getFocusLabel(activeFocus)}
          </p>
        </div>
        <div className="grid items-stretch gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <FocusItem
            href="/admin/vendors"
            label="Vendor review"
            tone={activeFocus === "vendorReview" ? "active" : "neutral"}
            value={isLoading ? "--" : formatCount(pendingApplications)}
            text={pendingApplications > 0 ? "Applications waiting" : "Queue clear"}
          />
          <FocusItem
            href="/admin/orders"
            label="Open orders"
            tone={activeFocus === "openOrders" ? "active" : "neutral"}
            value={isLoading ? "--" : formatCount(openOrders)}
            text={openOrders > 0 ? "COD queue active" : "No active queue"}
          />
          <FocusItem
            href="/admin/orders"
            label="Returns watch"
            tone={activeFocus === "returnsWatch" ? "active" : "neutral"}
            value={isLoading ? "--" : formatCount(returnedOrders)}
            text={returnedOrders > 0 ? "Returned orders" : "No returns"}
          />
          <FocusItem
            href="/admin/vendors"
            label="Recheck vendors"
            tone={activeFocus === "recheckVendors" ? "active" : "neutral"}
            value={isLoading ? "--" : formatCount(rejectedApplications)}
            text={rejectedApplications > 0 ? "Rejected applications" : "No rechecks"}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardCardHeader({
  actionLabel,
  href,
  subtitle,
  title,
}: {
  actionLabel?: string;
  href?: string;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
      </div>
      {href && actionLabel ? (
        <DashboardCardLink href={href}>{actionLabel}</DashboardCardLink>
      ) : null}
    </div>
  );
}

function DashboardCardLink({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  return (
    <Link
      className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-2.5 text-sm font-bold text-market-700 transition hover:bg-orange-50"
      href={href}
    >
      {children}
    </Link>
  );
}

function OrderTrackingCard({
  deliveredPercent,
  isLoading,
  openOrders,
  openPercent,
  orderCount,
  returnedPercent,
}: {
  deliveredPercent: number;
  isLoading: boolean;
  openOrders: number;
  openPercent: number;
  orderCount: number;
  returnedPercent: number;
}) {
  return (
    <Card className="admin-surface-card h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <DashboardCardHeader
            subtitle="Current COD movement across the marketplace queue."
            title="Order tracking"
          />
          <div className="grid grid-cols-2 gap-2 text-sm font-bold text-slate-700 sm:min-w-52">
            <TrackingPill label="Delivered" value={`${deliveredPercent}%`} />
            <TrackingPill label="Returned" value={`${returnedPercent}%`} />
          </div>
        </div>
        <div className="mt-auto rounded-xl border border-orange-100 bg-orange-50/40 px-4 py-2.5 text-center">
          <div className="mx-auto max-w-2xl">
            <p className="text-lg font-black text-slate-950 sm:text-xl">
              {isLoading
                ? "Loading..."
                : orderCount === 0
                  ? "COD queue: no orders yet"
                  : `COD queue: ${formatCount(openOrders)} open orders`}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              Active marketplace handoffs that still need supervision.
            </p>
            <OrderProgressBar
              deliveredPercent={deliveredPercent}
              openPercent={openPercent}
              returnedPercent={returnedPercent}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OrdersTrafficCard({
  cancelledPercent,
  deliveredPercent,
  isLoading,
  openPercent,
  orderCount,
  returnedPercent,
}: {
  cancelledPercent: number;
  deliveredPercent: number;
  isLoading: boolean;
  openPercent: number;
  orderCount: number;
  returnedPercent: number;
}) {
  return (
    <Card className="admin-surface-card h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <DashboardCardHeader
          actionLabel="View all"
          href="/admin/orders"
          subtitle="Status mix across the order queue."
          title="Orders traffic"
        />
        <div className="flex min-h-[142px] items-center justify-center rounded-xl border border-slate-200 bg-slate-50/70">
          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-full shadow-sm shadow-slate-200/80"
            style={{
              background: getOrdersTrafficGradient({
                deliveredPercent,
                openPercent,
                returnedPercent,
                cancelledPercent,
                total: orderCount,
              }),
            }}
          >
            <div className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center rounded-full bg-white text-center shadow-inner shadow-slate-200/80">
              <p className="text-xs font-bold uppercase text-slate-500">Total</p>
              <p className="mt-0.5 text-lg font-black leading-none text-slate-950">
                {isLoading ? "--" : formatCount(orderCount)}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-slate-700">
          <TrafficPill label="Open" value={`${openPercent}%`} strong />
          <TrafficPill label="Delivered" value={`${deliveredPercent}%`} />
          <TrafficPill label="Returned" value={`${returnedPercent}%`} />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentOrdersCard({
  isLoading,
  orders,
}: {
  isLoading: boolean;
  orders: Order[];
}) {
  return (
    <Card className="admin-surface-card h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <DashboardCardHeader
          actionLabel="View all"
          href="/admin/orders"
          subtitle="Latest COD activity across sellers."
          title="Recent orders"
        />
        {isLoading ? (
          <EmptyPanel text="Loading recent orders." />
        ) : orders.length === 0 ? (
          <EmptyPanel title="No recent orders yet." text="New marketplace orders will appear here." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="hidden border-b border-slate-100 bg-slate-50/80 px-3.5 py-2 text-[0.68rem] font-black uppercase tracking-wide text-slate-500 lg:grid lg:grid-cols-[86px_minmax(0,1fr)_minmax(0,0.85fr)_104px_92px_118px] lg:items-center">
              <span>Order</span>
              <span>Buyer</span>
              <span className="text-center">Seller</span>
              <span className="text-center">Status</span>
              <span className="text-right">Total</span>
              <span className="text-right">Created</span>
            </div>
            {orders.map((order) => (
              <div
                className="grid gap-2 border-b border-slate-100 px-3.5 py-2.5 transition last:border-b-0 hover:bg-slate-50/80 lg:grid-cols-[86px_minmax(0,1fr)_minmax(0,0.85fr)_104px_92px_118px] lg:items-center"
                key={order.id}
              >
                <p className="whitespace-nowrap text-xs font-black uppercase text-slate-500">
                  {formatShortId(order.id)}
                </p>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {order.buyer.fullName || order.shipping.fullName}
                  </p>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    {order.shipping.phone}
                  </p>
                </div>
                <p className="truncate text-sm font-semibold text-slate-600 lg:text-center">
                  {order.vendor.storeName}
                </p>
                <div className="lg:justify-self-center">
                  <OrderStatusBadge status={order.status} />
                </div>
                <p className="whitespace-nowrap text-sm font-black text-slate-950 lg:text-right">
                  {formatTnd(order.total)}
                </p>
                <p className="whitespace-nowrap text-xs font-semibold text-slate-500 lg:text-right">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LowStockAlertsCard({
  isLoading,
  products,
}: {
  isLoading: boolean;
  products: AdminProductListItem[];
}) {
  return (
    <Card className="admin-surface-card h-full">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <DashboardCardHeader
          actionLabel="Review products"
          href="/admin/products"
          subtitle={`Products at ${LOW_STOCK_THRESHOLD} units or fewer.`}
          title="Low stock alerts"
        />
        {isLoading ? (
          <EmptyPanel text="Loading stock alerts." />
        ) : products.length === 0 ? (
          <EmptyPanel title="No low stock products." text="Inventory alerts will appear here when stock runs low." />
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {products.map((product) => (
              <div className="px-3.5 py-2.5 transition hover:bg-slate-50/80" key={product.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {product.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                      {product.vendorName}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-orange-200 bg-white px-2.5 py-1 text-xs font-black text-market-800">
                    {formatCount(product.stock)} left
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                  <ProductStatusBadge status={product.status} />
                  <p className="truncate text-right text-xs font-semibold text-slate-500">
                    {product.categoryName}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecentApplicationsCard({
  applications,
  isLoading,
}: {
  applications: VendorApplication[];
  isLoading: boolean;
}) {
  return (
    <Card className="admin-surface-card">
      <CardContent className="flex flex-col gap-3 p-4">
        <DashboardCardHeader
          actionLabel="Manage"
          href="/admin/vendors"
          subtitle="Pending and rejected seller requests."
          title="Recent applications"
        />
        {isLoading ? (
          <EmptyPanel text="Loading applications." />
        ) : applications.length === 0 ? (
          <EmptyPanel
            title="No vendor applications need attention."
            text="New seller requests will appear here when they need review."
          />
        ) : (
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {applications.slice(0, 5).map((application) => (
              <div
                className="flex flex-col gap-2 px-3.5 py-2.5 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between"
                key={application.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-950">{application.storeName}</p>
                  <p className="mt-1 truncate text-xs font-medium text-slate-500">
                    {application.user.fullName} / {application.user.email}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                  <p className="whitespace-nowrap text-xs font-semibold text-slate-500">
                    {formatDateTime(application.createdAt)}
                  </p>
                  <VendorStatusBadge status={application.status} />
                  <Link
                    className="inline-flex h-7 items-center justify-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-market-700 shadow-sm shadow-slate-200/60 transition hover:bg-orange-50"
                    href="/admin/vendors"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ text, title }: { text: string; title?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3.5 text-center">
      {title ? (
        <span className="mx-auto mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-black text-slate-500">
          0
        </span>
      ) : null}
      {title ? <p className="text-sm font-black text-slate-800">{title}</p> : null}
      <p className={title ? "mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500" : "text-sm text-slate-500"}>
        {text}
      </p>
    </div>
  );
}

function TrackingPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center shadow-sm shadow-slate-200/60">
      <p className="text-xs font-black uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}

function FocusItem({
  href,
  label,
  text,
  tone,
  value,
}: {
  href: string;
  label: string;
  text: string;
  tone: FocusTone;
  value: string;
}) {
  return (
    <Link
      className={getFocusItemClass(tone)}
      href={href}
    >
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-black leading-none text-slate-950">{value}</p>
        <p className="text-right text-xs font-semibold text-slate-500 transition group-hover:text-market-700">
          {text}
        </p>
      </div>
    </Link>
  );
}

function OrderProgressBar({
  deliveredPercent,
  openPercent,
  returnedPercent,
}: {
  deliveredPercent: number;
  openPercent: number;
  returnedPercent: number;
}) {
  return (
    <div className="mx-auto mt-2.5 h-px max-w-md overflow-hidden rounded-full bg-white/80 ring-1 ring-orange-100">
      <div className="flex h-full w-full">
        <span className="h-full bg-orange-200" style={{ width: `${deliveredPercent}%` }} />
        <span className="h-full bg-market-700" style={{ width: `${openPercent}%` }} />
        <span className="h-full bg-slate-300" style={{ width: `${returnedPercent}%` }} />
      </div>
    </div>
  );
}

function TrafficPill({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: string;
}) {
  return (
    <p
      className={
        strong
          ? "rounded-lg border border-orange-200 bg-orange-50/60 px-2 py-1.5 text-market-800"
          : "rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-slate-600"
      }
    >
      {value} {label}
    </p>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getPercent(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function getActiveFocus({
  openOrders,
  pendingApplications,
  rejectedApplications,
  returnedOrders,
}: {
  openOrders: number;
  pendingApplications: number;
  rejectedApplications: number;
  returnedOrders: number;
}): FocusKey | null {
  if (openOrders > 0) {
    return "openOrders";
  }

  if (pendingApplications > 0) {
    return "vendorReview";
  }

  if (returnedOrders > 0) {
    return "returnsWatch";
  }

  if (rejectedApplications > 0) {
    return "recheckVendors";
  }

  return null;
}

function getFocusLabel(activeFocus: FocusKey | null) {
  if (activeFocus === "openOrders") {
    return "Open orders";
  }

  if (activeFocus === "vendorReview") {
    return "Vendor review";
  }

  if (activeFocus === "returnsWatch") {
    return "Returns watch";
  }

  if (activeFocus === "recheckVendors") {
    return "Recheck vendors";
  }

  return "All queues calm";
}

function getOrdersTrafficGradient({
  cancelledPercent,
  deliveredPercent,
  openPercent,
  returnedPercent,
  total,
}: {
  cancelledPercent: number;
  deliveredPercent: number;
  openPercent: number;
  returnedPercent: number;
  total: number;
}) {
  if (!total) {
    return "conic-gradient(#e2e8f0 0 100%)";
  }

  const deliveredEnd = deliveredPercent;
  const openEnd = Math.min(100, deliveredEnd + openPercent);
  const returnedEnd = Math.min(100, openEnd + returnedPercent);
  const cancelledEnd = Math.min(100, returnedEnd + cancelledPercent);

  return `conic-gradient(#fdba74 0 ${deliveredEnd}%, #c2410c ${deliveredEnd}% ${openEnd}%, #94a3b8 ${openEnd}% ${returnedEnd}%, #cbd5e1 ${returnedEnd}% ${cancelledEnd}%, #e2e8f0 ${cancelledEnd}% 100%)`;
}

function getFocusItemClass(tone: FocusTone) {
  if (tone === "active") {
    return "group flex min-h-[80px] flex-col justify-between rounded-xl border border-orange-200 bg-orange-50/70 px-3 py-2.5 shadow-sm shadow-orange-100/70 transition hover:border-orange-300 hover:bg-orange-50 hover:shadow-md hover:shadow-orange-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200";
  }

  return "group flex min-h-[80px] flex-col justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm shadow-slate-200/60 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md hover:shadow-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200";
}

function formatShortId(id: string) {
  return `#${id.slice(0, 6).toUpperCase()}`;
}

function formatStatusLabel(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

function OrderStatusBadge({ status }: { status: Order["status"] }) {
  return (
    <Badge className="border-slate-200 bg-slate-50 text-slate-700" tone="neutral">
      {formatStatusLabel(status)}
    </Badge>
  );
}

function ProductStatusBadge({ status }: { status: Product["status"] }) {
  return (
    <Badge className="border-slate-200 bg-white text-slate-600" tone="neutral">
      {formatStatusLabel(status)}
    </Badge>
  );
}

function VendorStatusBadge({ status }: { status: VendorApplication["status"] }) {
  if (status === "APPROVED") {
    return (
      <Badge className="border-slate-200 bg-slate-50 text-slate-600" tone="neutral">
        Approved
      </Badge>
    );
  }

  if (status === "PENDING") {
    return (
      <Badge className="border-slate-200 bg-slate-50 text-slate-700" tone="neutral">
        Pending
      </Badge>
    );
  }

  if (status === "REJECTED") {
    return (
      <Badge className="border-slate-200 bg-white text-slate-600" tone="neutral">
        Rejected
      </Badge>
    );
  }

  return (
    <Badge className="border-slate-200 bg-slate-50 text-slate-600" tone="neutral">
      Suspended
    </Badge>
  );
}
