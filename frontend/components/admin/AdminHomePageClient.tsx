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
import type { Order, VendorApplication } from "@/types";

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
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadOverview() {
      setIsLoading(true);
      setMessage(null);

      try {
        const [nextApplications, nextOrders] =
          await Promise.all([
            api.admin.vendors.applications(),
            api.admin.orders.list(),
          ]);

        if (isActive) {
          setApplications(nextApplications);
          setOrders(nextOrders);
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
        (order) => order.status !== "DELIVERED" && order.status !== "CANCELLED",
      ).length,
    [orders],
  );
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
  const returnedOrders = 0;

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
          className="inline-flex h-10 items-center justify-center rounded-lg bg-market-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-800"
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard isLoading={isLoading} label="Orders today" value={formatTnd(0)} />
        <MetricCard isLoading={isLoading} label="Orders this week" value={formatTnd(0)} />
        <MetricCard
          isLoading={isLoading}
          label="Orders this month"
          note={`${deliveredOrders} delivered`}
          value={formatTnd(deliveredRevenue)}
        />
        <MetricCard
          highlight
          isLoading={isLoading}
          label="Total revenue"
          note={`${orders.length} order${orders.length === 1 ? "" : "s"}`}
          value={formatTnd(orders.reduce((sum, order) => sum + Number(order.total), 0))}
        />
      </div>

      <Card className="border-slate-200/90">
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-2xl font-bold text-slate-950">Order tracking</h3>
            <div className="flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-600">
              <span>
                Delivered {orders.length ? Math.round((deliveredOrders / orders.length) * 100) : 0}%
              </span>
              <span>
                Returned {orders.length ? Math.round((returnedOrders / orders.length) * 100) : 0}%
              </span>
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
              <h3 className="text-2xl font-bold text-slate-950">Orders traffic</h3>
              <Link className="text-sm font-semibold text-market-700" href="/admin/orders">
                View all
              </Link>
            </div>
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
          ? "border-market-700 bg-gradient-to-br from-market-800 to-market-700 text-white"
          : "bg-white/95"
      }
    >
      <CardContent className="space-y-1.5">
        <p className={highlight ? "text-sm text-market-100" : "text-sm text-slate-500"}>{label}</p>
        <p className={highlight ? "text-4xl font-bold leading-none text-white" : "text-4xl font-bold leading-none text-slate-950"}>
          {isLoading ? "--" : value}
        </p>
        {note ? (
          <p className={highlight ? "text-sm text-market-100" : "text-sm text-slate-500"}>
            {isLoading ? "--" : note}
          </p>
        ) : null}
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
