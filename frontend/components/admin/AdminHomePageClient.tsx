"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { formatDateTime, getErrorMessage, shortId } from "@/components/admin/adminUtils";
import { OrderStatusBadge } from "@/components/orders/OrderStatus";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Category, Order, VendorApplication } from "@/types";

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
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadOverview() {
      setIsLoading(true);
      setMessage(null);

      try {
        const [nextApplications, nextVendors, nextOrders, nextCategories] =
          await Promise.all([
            api.admin.vendors.applications(),
            api.admin.vendors.list(),
            api.admin.orders.list(),
            api.admin.categories.list(),
          ]);

        if (isActive) {
          setApplications(nextApplications);
          setVendors(nextVendors);
          setOrders(nextOrders);
          setCategories(nextCategories);
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

  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === "PENDING").length,
    [applications],
  );
  const openOrders = useMemo(
    () =>
      orders.filter(
        (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
      ).length,
    [orders],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-market-700">Admin dashboard</p>
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Operations overview
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Review seller applications, supervise COD orders, and maintain category
            structure.
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard isLoading={isLoading} label="Vendor applications" value={`${pendingApplications}`} />
        <MetricCard isLoading={isLoading} label="Active vendors" value={`${vendors.filter((vendor) => vendor.status === "APPROVED" && vendor.isActive).length}`} />
        <MetricCard isLoading={isLoading} label="Open orders" value={`${openOrders}`} />
        <MetricCard isLoading={isLoading} label="Categories" value={`${categories.length}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Recent applications</h3>
                <p className="text-sm text-slate-500">Pending and rejected seller requests.</p>
              </div>
              <Link className="text-sm font-semibold text-market-700" href="/admin/vendors">
                Manage
              </Link>
            </div>
            {isLoading ? (
              <EmptyPanel text="Loading applications." />
            ) : applications.length === 0 ? (
              <EmptyPanel text="No vendor applications need attention." />
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 4).map((application) => (
                  <div
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                    key={application.id}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{application.storeName}</p>
                      <p className="text-xs text-slate-500">
                        {application.user.email} / {formatDateTime(application.createdAt)}
                      </p>
                    </div>
                    <VendorStatusBadge status={application.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Recent orders</h3>
                <p className="text-sm text-slate-500">Latest marketplace COD orders.</p>
              </div>
              <Link className="text-sm font-semibold text-market-700" href="/admin/orders">
                Manage
              </Link>
            </div>
            {isLoading ? (
              <EmptyPanel text="Loading orders." />
            ) : orders.length === 0 ? (
              <EmptyPanel text="No orders yet." />
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 4).map((order) => (
                  <div
                    className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                    key={order.id}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-xs text-slate-500">
                          {formatDateTime(order.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-950">
                        Order {shortId(order.id)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {order.vendor.storeName} / {formatTnd(order.total)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  isLoading,
  label,
  value,
}: {
  isLoading: boolean;
  label: string;
  value: string;
}) {
  return (
    <Card className="bg-white/95">
      <CardContent className="space-y-1.5">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold leading-none text-slate-950">
          {isLoading ? "--" : value}
        </p>
      </CardContent>
    </Card>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
      {text}
    </p>
  );
}

function VendorStatusBadge({ status }: { status: VendorApplication["status"] }) {
  if (status === "APPROVED") {
    return <Badge tone="success">Approved</Badge>;
  }

  if (status === "PENDING") {
    return <Badge tone="warning">Pending</Badge>;
  }

  if (status === "REJECTED") {
    return (
      <Badge className="bg-red-50 text-red-700" tone="neutral">
        Rejected
      </Badge>
    );
  }

  return <Badge tone="neutral">Suspended</Badge>;
}
