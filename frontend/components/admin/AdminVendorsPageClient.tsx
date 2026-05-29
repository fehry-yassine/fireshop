"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { formatDateTime, getErrorMessage } from "@/components/admin/adminUtils";
import { DashboardDrawer } from "@/components/dashboard/DashboardDrawer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { VendorApplication, VendorStatus } from "@/types";

type VendorTab = VendorStatus | "ALL";
type SortOption = "newest" | "oldest" | "storeName";
type ConfirmAction = "reject" | "suspend";

type ActionMessage = {
  text: string;
  tone: "success" | "error";
  vendorId?: string;
};

const VENDOR_TABS: Array<{ label: string; value: VendorTab }> = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "All", value: "ALL" },
];
const VENDOR_TABLE_SCROLL_STYLE = {
  maxHeight: "clamp(520px, calc(100vh - 360px), 720px)",
};
const VENDOR_TABLE_HEADER_CELL_CLASS =
  "sticky top-0 z-20 whitespace-nowrap border-b border-slate-200 bg-slate-50 py-2.5";
const VENDOR_TABLE_BODY_CELL_CLASS = "py-2.5";
const VENDOR_TABLE_COLUMNS = [
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "id",
    label: "ID",
    width: "6.5%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[190px] min-w-0 text-left",
    headerClass: "text-center",
    key: "store",
    label: "Store",
    width: "18%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[140px] min-w-0 text-center",
    headerClass: "text-center",
    key: "owner",
    label: "Owner",
    width: "13.5%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[210px] min-w-0 text-left",
    headerClass: "text-center",
    key: "contact",
    label: "Contact",
    width: "19%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto flex w-full justify-center",
    headerClass: "text-center",
    key: "status",
    label: "Status",
    width: "11%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "applied",
    label: "Applied",
    width: "12%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto flex w-full justify-center",
    headerClass: "text-center",
    key: "actions",
    label: "Actions",
    width: "20%",
  },
] as const;
const VENDOR_TABLE_COLUMN = {
  actions: VENDOR_TABLE_COLUMNS[6],
  applied: VENDOR_TABLE_COLUMNS[5],
  contact: VENDOR_TABLE_COLUMNS[3],
  id: VENDOR_TABLE_COLUMNS[0],
  owner: VENDOR_TABLE_COLUMNS[2],
  status: VENDOR_TABLE_COLUMNS[4],
  store: VENDOR_TABLE_COLUMNS[1],
} as const;

export function AdminVendorsPageClient() {
  return (
    <AdminAccessGate>
      <AdminDashboardFrame>
        <AdminVendorsContent />
      </AdminDashboardFrame>
    </AdminAccessGate>
  );
}

function AdminVendorsContent() {
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<VendorTab>("PENDING");
  const [hasSetInitialTab, setHasSetInitialTab] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionNote, setActionNote] = useState("");

  const loadVendors = useCallback(async (options?: { clearMessage?: boolean }) => {
    setIsLoading(true);
    if (options?.clearMessage !== false) {
      setMessage(null);
    }

    try {
      const [nextApplications, nextVendors] = await Promise.all([
        api.admin.vendors.applications(),
        api.admin.vendors.list(),
      ]);
      setApplications(nextApplications);
      setVendors(nextVendors);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not load vendors."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const allVendors = useMemo(() => {
    const byId = new Map<string, VendorApplication>();

    vendors.forEach((vendor) => {
      byId.set(vendor.id, vendor);
    });

    applications.forEach((application) => {
      byId.set(application.id, {
        ...(byId.get(application.id) ?? {}),
        ...application,
      });
    });

    return Array.from(byId.values());
  }, [applications, vendors]);

  const counts = useMemo(
    () => ({
      all: allVendors.length,
      approved: countByStatus(allVendors, "APPROVED"),
      pending: countByStatus(allVendors, "PENDING"),
      rejected: countByStatus(allVendors, "REJECTED"),
      suspended: countByStatus(allVendors, "SUSPENDED"),
    }),
    [allVendors],
  );

  useEffect(() => {
    if (isLoading || hasSetInitialTab) {
      return;
    }

    setActiveTab(counts.pending > 0 ? "PENDING" : "ALL");
    setHasSetInitialTab(true);
  }, [counts.pending, hasSetInitialTab, isLoading]);

  const filteredVendors = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return allVendors
      .filter((vendor) => {
        if (activeTab !== "ALL" && vendor.status !== activeTab) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return getVendorSearchText(vendor).includes(normalizedSearch);
      })
      .sort((firstVendor, secondVendor) => sortVendors(firstVendor, secondVendor, sort));
  }, [activeTab, allVendors, searchQuery, sort]);

  const selectedVendor = useMemo(
    () => allVendors.find((vendor) => vendor.id === selectedVendorId) ?? null,
    [allVendors, selectedVendorId],
  );

  const defaultTab = counts.pending > 0 ? "PENDING" : "ALL";
  const hasSearchQuery = Boolean(searchQuery.trim());
  const loadError =
    message?.tone === "error" && !message.vendorId && !isLoading && allVendors.length === 0;
  const hasFilters = hasSearchQuery || activeTab !== defaultTab || sort !== "newest";

  function openDrawer(vendor: VendorApplication, nextAction?: ConfirmAction) {
    setSelectedVendorId(vendor.id);
    setConfirmAction(nextAction ?? null);
    setActionNote("");
  }

  function closeDrawer() {
    setSelectedVendorId(null);
    setConfirmAction(null);
    setActionNote("");
  }

  function clearFilters() {
    setSearchQuery("");
    setSort("newest");
    setActiveTab(defaultTab);
  }

  function applyVendorUpdate(updatedVendor: VendorApplication) {
    setVendors((currentVendors) => upsertVendor(currentVendors, updatedVendor));
    setApplications((currentApplications) => {
      const shouldRemainInApplications =
        updatedVendor.status === "PENDING" || updatedVendor.status === "REJECTED";

      if (!shouldRemainInApplications) {
        return currentApplications.filter((application) => application.id !== updatedVendor.id);
      }

      return upsertVendor(currentApplications, updatedVendor);
    });
  }

  async function approveVendor(vendor: VendorApplication) {
    setActiveVendorId(vendor.id);
    setMessage(null);

    try {
      let updatedVendor: VendorApplication;

      if (vendor.status === "PENDING") {
        const response = await api.admin.vendors.approveApplication(vendor.id);
        updatedVendor = response.vendor;
      } else {
        const response = await api.admin.vendors.update(vendor.id, {
          isActive: true,
          status: "APPROVED",
        });
        updatedVendor = response.vendor;
      }

      applyVendorUpdate(updatedVendor);
      setMessage({
        text:
          vendor.status === "REJECTED"
            ? `${updatedVendor.storeName} re-approved.`
            : `${updatedVendor.storeName} approved.`,
        tone: "success",
        vendorId: updatedVendor.id,
      });
      setConfirmAction(null);
      setActionNote("");
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not approve vendor."),
        tone: "error",
        vendorId: vendor.id,
      });
    } finally {
      setActiveVendorId(null);
    }
  }

  async function rejectVendor(vendor: VendorApplication) {
    const adminNote = actionNote.trim();

    if (!adminNote) {
      setMessage({
        text: "Rejection note is required.",
        tone: "error",
        vendorId: vendor.id,
      });
      return;
    }

    setActiveVendorId(vendor.id);
    setMessage(null);

    try {
      const response = await api.admin.vendors.rejectApplication(vendor.id, { adminNote });
      applyVendorUpdate(response.application);
      setMessage({
        text: `${response.application.storeName} rejected.`,
        tone: "success",
        vendorId: response.application.id,
      });
      setConfirmAction(null);
      setActionNote("");
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not reject vendor application."),
        tone: "error",
        vendorId: vendor.id,
      });
    } finally {
      setActiveVendorId(null);
    }
  }

  async function suspendVendor(vendor: VendorApplication) {
    const adminNote = actionNote.trim();

    if (!adminNote) {
      setMessage({
        text: "Suspension note is required.",
        tone: "error",
        vendorId: vendor.id,
      });
      return;
    }

    setActiveVendorId(vendor.id);
    setMessage(null);

    try {
      const response = await api.admin.vendors.update(vendor.id, {
        adminNote,
        isActive: false,
        status: "SUSPENDED",
      });
      applyVendorUpdate(response.vendor);
      setMessage({
        text: `${response.vendor.storeName} suspended.`,
        tone: "success",
        vendorId: response.vendor.id,
      });
      setConfirmAction(null);
      setActionNote("");
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not suspend vendor."),
        tone: "error",
        vendorId: vendor.id,
      });
    } finally {
      setActiveVendorId(null);
    }
  }

  async function reactivateVendor(vendor: VendorApplication) {
    setActiveVendorId(vendor.id);
    setMessage(null);

    try {
      const response = await api.admin.vendors.update(vendor.id, {
        isActive: true,
        status: "APPROVED",
      });
      applyVendorUpdate(response.vendor);
      setMessage({
        text: `${response.vendor.storeName} reactivated.`,
        tone: "success",
        vendorId: response.vendor.id,
      });
      setConfirmAction(null);
      setActionNote("");
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not reactivate vendor."),
        tone: "error",
        vendorId: vendor.id,
      });
    } finally {
      setActiveVendorId(null);
    }
  }

  return (
    <div className="admin-page-shell">
      <div className="admin-page-header">
        <div className="space-y-2">
          <p className="admin-page-eyebrow">Vendor moderation</p>
          <h2 className="admin-page-title">
            Vendors Management
          </h2>
          <p className="admin-page-description">
            Review seller applications, manage vendor status, and monitor marketplace sellers.
          </p>
        </div>
        <div className="admin-header-badge">
          {counts.pending > 0 ? `${counts.pending} pending` : `${counts.all} vendors`}
        </div>
      </div>

      {message && !selectedVendor && !loadError ? <InlineMessage message={message} /> : null}

      <VendorKpiCards counts={counts} />

      <Card className="admin-surface-card">
        <CardContent className="space-y-2.5 p-3.5 sm:p-4">
          <VendorFilters
            activeTab={activeTab}
            hasFilters={hasFilters}
            onClear={clearFilters}
            onSearchChange={setSearchQuery}
            onSortChange={setSort}
            onStatusChange={setActiveTab}
            searchQuery={searchQuery}
            shownCount={filteredVendors.length}
            sort={sort}
          />

          <VendorTabs activeTab={activeTab} counts={counts} onChange={setActiveTab} />

          <VendorList
            activeVendorId={activeVendorId}
            activeTab={activeTab}
            hasSearchQuery={hasSearchQuery}
            isError={loadError}
            isLoading={isLoading}
            onApprove={approveVendor}
            onReactivate={reactivateVendor}
            onReject={(vendor) => openDrawer(vendor, "reject")}
            onRetry={() => void loadVendors()}
            onSuspend={(vendor) => openDrawer(vendor, "suspend")}
            onView={(vendor) => openDrawer(vendor)}
            vendors={filteredVendors}
          />
        </CardContent>
      </Card>

      <VendorDetailsDrawer
        activeVendorId={activeVendorId}
        confirmAction={confirmAction}
        message={message?.vendorId === selectedVendor?.id ? message : null}
        note={actionNote}
        onApprove={approveVendor}
        onClose={closeDrawer}
        onConfirmAction={confirmAction === "reject" ? rejectVendor : suspendVendor}
        onNoteChange={setActionNote}
        onReactivate={reactivateVendor}
        onReject={() => setConfirmAction("reject")}
        onSuspend={() => setConfirmAction("suspend")}
        onCancelConfirm={() => {
          setConfirmAction(null);
          setActionNote("");
        }}
        vendor={selectedVendor}
      />
    </div>
  );
}

function VendorKpiCards({
  counts,
}: {
  counts: {
    approved: number;
    pending: number;
    rejected: number;
    suspended: number;
  };
}) {
  const cards = [
    {
      label: "Pending applications",
      value: counts.pending,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      label: "Approved vendors",
      value: counts.approved,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    {
      label: "Rejected vendors",
      value: counts.rejected,
      className: "border-rose-200 bg-rose-50 text-rose-700",
    },
    {
      label: "Suspended vendors",
      value: counts.suspended,
      className: "border-slate-300 bg-slate-100 text-slate-700",
    },
  ];

  return (
    <div className="admin-kpi-grid">
      {cards.map((card) => (
        <Card className="admin-kpi-card" key={card.label}>
          <CardContent className="admin-kpi-card-content">
            <div>
              <p className="admin-kpi-label">
                {card.label}
              </p>
              <p className="admin-kpi-value">{card.value}</p>
            </div>
            <span className={cn("admin-kpi-dot", card.className)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VendorFilters({
  activeTab,
  hasFilters,
  onClear,
  onSearchChange,
  onSortChange,
  onStatusChange,
  searchQuery,
  shownCount,
  sort,
}: {
  activeTab: VendorTab;
  hasFilters: boolean;
  onClear: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SortOption) => void;
  onStatusChange: (value: VendorTab) => void;
  searchQuery: string;
  shownCount: number;
  sort: SortOption;
}) {
  return (
    <div className="admin-filter-bar grid gap-3 lg:grid-cols-[minmax(300px,1fr)_160px_145px_auto_auto] lg:items-center">
      <div className="relative">
        <Input
          aria-label="Search vendors"
          className="pl-9"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search store, owner, email, phone, slug"
          value={searchQuery}
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon />
        </span>
      </div>

      <select
        aria-label="Filter vendor status"
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
        onChange={(event) => onStatusChange(event.target.value as VendorTab)}
        value={activeTab}
      >
        <option value="ALL">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="SUSPENDED">Suspended</option>
      </select>

      <select
        aria-label="Sort vendors"
        className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
        onChange={(event) => onSortChange(event.target.value as SortOption)}
        value={sort}
      >
        <option value="newest">Newest</option>
        <option value="oldest">Oldest</option>
        <option value="storeName">Store name</option>
      </select>

      <div className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 px-3 text-sm font-bold text-slate-700">
        {shownCount} shown
      </div>

      <Button
        className="h-10 px-3"
        disabled={!hasFilters}
        onClick={onClear}
        variant="secondary"
      >
        Clear
      </Button>
    </div>
  );
}

function VendorTabs({
  activeTab,
  counts,
  onChange,
}: {
  activeTab: VendorTab;
  counts: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
    suspended: number;
  };
  onChange: (value: VendorTab) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/50">
      {VENDOR_TABS.map((tab) => {
        const count = getTabCount(tab.value, counts);
        const isActive = activeTab === tab.value;

        return (
          <button
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold transition",
              isActive
                ? "bg-slate-950 text-white shadow-sm shadow-slate-300/80"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px]",
                isActive ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function VendorList({
  activeVendorId,
  activeTab,
  hasSearchQuery,
  isError,
  isLoading,
  onApprove,
  onReactivate,
  onReject,
  onRetry,
  onSuspend,
  onView,
  vendors,
}: {
  activeVendorId: string | null;
  activeTab: VendorTab;
  hasSearchQuery: boolean;
  isError: boolean;
  isLoading: boolean;
  onApprove: (vendor: VendorApplication) => void;
  onReactivate: (vendor: VendorApplication) => void;
  onReject: (vendor: VendorApplication) => void;
  onRetry: () => void;
  onSuspend: (vendor: VendorApplication) => void;
  onView: (vendor: VendorApplication) => void;
  vendors: VendorApplication[];
}) {
  if (isLoading) {
    return <LoadingVendorsPanel />;
  }

  if (isError) {
    return <ErrorPanel onRetry={onRetry} />;
  }

  if (vendors.length === 0) {
    const emptyCopy = getEmptyCopy(activeTab, hasSearchQuery);

    return <EmptyPanel text={emptyCopy.text} title={emptyCopy.title} />;
  }

  return (
    <>
      <div
        className="admin-table-shell hidden overflow-auto bg-white lg:block"
        style={VENDOR_TABLE_SCROLL_STYLE}
      >
        <table className="admin-table min-w-[1120px] table-fixed xl:min-w-full">
          <colgroup>
            {VENDOR_TABLE_COLUMNS.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {VENDOR_TABLE_COLUMNS.map((column) => (
                <th
                  className={`${VENDOR_TABLE_HEADER_CELL_CLASS} ${column.headerClass}`}
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
            {vendors.map((vendor, index) => (
              <tr className={cn("transition hover:bg-slate-50/80", rowToneClass(vendor.status))} key={vendor.id}>
                <td className={`whitespace-nowrap font-semibold text-slate-600 ${VENDOR_TABLE_BODY_CELL_CLASS} ${VENDOR_TABLE_COLUMN.id.cellClass}`}>
                  <span className={VENDOR_TABLE_COLUMN.id.contentClass}>
                    {index + 1}
                  </span>
                </td>
                <td className={`${VENDOR_TABLE_BODY_CELL_CLASS} ${VENDOR_TABLE_COLUMN.store.cellClass}`}>
                  <div className={VENDOR_TABLE_COLUMN.store.contentClass}>
                    <p className="truncate font-bold text-slate-950">{vendor.storeName}</p>
                    <p className="truncate text-xs text-slate-500">{vendor.slug}</p>
                  </div>
                </td>
                <td className={`${VENDOR_TABLE_BODY_CELL_CLASS} ${VENDOR_TABLE_COLUMN.owner.cellClass}`}>
                  <p className={`truncate font-semibold text-slate-900 ${VENDOR_TABLE_COLUMN.owner.contentClass}`}>
                    {vendor.user.fullName}
                  </p>
                </td>
                <td className={`${VENDOR_TABLE_BODY_CELL_CLASS} ${VENDOR_TABLE_COLUMN.contact.cellClass}`}>
                  <div className={VENDOR_TABLE_COLUMN.contact.contentClass}>
                    <p className="truncate text-slate-700">{vendor.user.email}</p>
                    <p className="truncate text-xs text-slate-500">
                      {vendor.user.phone ?? "No phone"}
                    </p>
                  </div>
                </td>
                <td className={`${VENDOR_TABLE_BODY_CELL_CLASS} ${VENDOR_TABLE_COLUMN.status.cellClass}`}>
                  <div className={VENDOR_TABLE_COLUMN.status.contentClass}>
                    <VendorStatusBadge status={vendor.status} />
                  </div>
                </td>
                <td className={`whitespace-nowrap text-slate-600 ${VENDOR_TABLE_BODY_CELL_CLASS} ${VENDOR_TABLE_COLUMN.applied.cellClass}`}>
                  <span className={VENDOR_TABLE_COLUMN.applied.contentClass}>
                    {formatShortDate(vendor.createdAt)}
                  </span>
                </td>
                <td className={`${VENDOR_TABLE_BODY_CELL_CLASS} ${VENDOR_TABLE_COLUMN.actions.cellClass}`}>
                  <div className={VENDOR_TABLE_COLUMN.actions.contentClass}>
                    <VendorActionButtons
                      activeVendorId={activeVendorId}
                      align="center"
                      compact
                      onApprove={onApprove}
                      onReactivate={onReactivate}
                      onReject={onReject}
                      onSuspend={onSuspend}
                      onView={onView}
                      vendor={vendor}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {vendors.map((vendor, index) => (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60" key={vendor.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  ID {index + 1}
                </p>
                <h3 className="mt-1 truncate text-base font-black text-slate-950">
                  {vendor.storeName}
                </h3>
                <p className="truncate text-xs text-slate-500">{vendor.slug}</p>
              </div>
              <VendorStatusBadge status={vendor.status} />
            </div>
            <div className="mt-3 grid gap-2 text-sm">
              <Fact label="Owner" value={vendor.user.fullName} />
              <Fact label="Email" value={vendor.user.email} />
              <Fact label="Phone" value={vendor.user.phone ?? "No phone"} />
              <Fact label="Applied" value={formatDateTime(vendor.createdAt)} />
            </div>
            <div className="mt-4">
              <VendorActionButtons
                activeVendorId={activeVendorId}
                onApprove={onApprove}
                onReactivate={onReactivate}
                onReject={onReject}
                onSuspend={onSuspend}
                onView={onView}
                vendor={vendor}
              />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function VendorActionButtons({
  activeVendorId,
  align = "end",
  compact = false,
  hideView = false,
  onApprove,
  onReactivate,
  onReject,
  onSuspend,
  onView,
  vendor,
}: {
  activeVendorId: string | null;
  align?: "center" | "end";
  compact?: boolean;
  hideView?: boolean;
  onApprove: (vendor: VendorApplication) => void;
  onReactivate: (vendor: VendorApplication) => void;
  onReject: (vendor: VendorApplication) => void;
  onSuspend: (vendor: VendorApplication) => void;
  onView: (vendor: VendorApplication) => void;
  vendor: VendorApplication;
}) {
  const isWorking = activeVendorId === vendor.id;

  return (
    <div
      className={cn(
        "flex gap-2",
        align === "center" ? "justify-center" : "justify-end",
        compact ? "flex-nowrap" : "flex-wrap",
      )}
    >
      {!hideView ? (
        <ActionButton compact={compact} label="View" onClick={() => onView(vendor)} tone="neutral" />
      ) : null}

      {vendor.status === "PENDING" ? (
        <>
          <ActionButton
            compact={compact}
            disabled={isWorking}
            label={isWorking ? "Working" : "Approve"}
            onClick={() => onApprove(vendor)}
            tone="approve"
          />
          <ActionButton
            compact={compact}
            disabled={isWorking}
            label="Reject"
            onClick={() => onReject(vendor)}
            tone="danger"
          />
        </>
      ) : null}

      {vendor.status === "APPROVED" ? (
        <ActionButton
          compact={compact}
          disabled={isWorking}
          label="Suspend"
          onClick={() => onSuspend(vendor)}
          tone="warn"
        />
      ) : null}

      {vendor.status === "REJECTED" ? (
        <ActionButton
          compact={compact}
          disabled={isWorking}
          label={isWorking ? "Working" : "Re-approve"}
          onClick={() => onApprove(vendor)}
          tone="approve"
        />
      ) : null}

      {vendor.status === "SUSPENDED" ? (
        <ActionButton
          compact={compact}
          disabled={isWorking}
          label={isWorking ? "Working" : "Reactivate"}
          onClick={() => onReactivate(vendor)}
          tone="approve"
        />
      ) : null}
    </div>
  );
}

function VendorDetailsDrawer({
  activeVendorId,
  confirmAction,
  message,
  note,
  onApprove,
  onCancelConfirm,
  onClose,
  onConfirmAction,
  onNoteChange,
  onReactivate,
  onReject,
  onSuspend,
  vendor,
}: {
  activeVendorId: string | null;
  confirmAction: ConfirmAction | null;
  message: ActionMessage | null;
  note: string;
  onApprove: (vendor: VendorApplication) => void;
  onCancelConfirm: () => void;
  onClose: () => void;
  onConfirmAction: (vendor: VendorApplication) => void;
  onNoteChange: (value: string) => void;
  onReactivate: (vendor: VendorApplication) => void;
  onReject: () => void;
  onSuspend: () => void;
  vendor: VendorApplication | null;
}) {
  const isWorking = Boolean(vendor && activeVendorId === vendor.id);
  const noteIsRequired = confirmAction !== null;

  return (
    <DashboardDrawer
      description={vendor ? `${vendor.storeName} seller profile and moderation history.` : undefined}
      eyebrow="Admin vendors"
      footer={
        vendor ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-slate-950">Current status:</span>{" "}
              {statusLabel(vendor.status)}
            </div>
            {confirmAction ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button disabled={isWorking} onClick={onCancelConfirm} variant="secondary">
                  Cancel
                </Button>
                <Button
                  className={confirmAction === "reject" ? "bg-rose-600 hover:bg-rose-700" : undefined}
                  disabled={isWorking || !note.trim()}
                  onClick={() => onConfirmAction(vendor)}
                >
                  {isWorking
                    ? "Working"
                    : confirmAction === "reject"
                      ? "Reject application"
                      : "Suspend vendor"}
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <Button onClick={onClose} variant="secondary">
                  Close
                </Button>
                <VendorActionButtons
                  activeVendorId={activeVendorId}
                  hideView
                  onApprove={onApprove}
                  onReactivate={onReactivate}
                  onReject={onReject}
                  onSuspend={onSuspend}
                  onView={() => undefined}
                  vendor={vendor}
                />
              </div>
            )}
          </div>
        ) : null
      }
      onClose={onClose}
      open={Boolean(vendor)}
      title={vendor ? drawerTitle(vendor.status) : "Vendor details"}
      width="lg"
    >
      {vendor ? (
        <div className="space-y-4">
          {message ? <InlineMessage message={message} /> : null}

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-market-700">
                  Vendor ID: {vendor.id}
                </p>
                <h3 className="mt-1 truncate text-2xl font-black text-slate-950">
                  {vendor.storeName}
                </h3>
                <p className="mt-1 truncate text-sm font-medium text-slate-500">
                  {vendor.slug}
                </p>
              </div>
              <VendorStatusBadge status={vendor.status} />
            </div>
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
              <Fact label="Applied / created" value={formatDateTime(vendor.createdAt)} />
              <Fact label="Active vendor" value={vendor.isActive ? "Yes" : "No"} />
              <Fact label="Commission" value={formatCommission(vendor.commissionRate)} />
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <InfoSection title="Owner and contact">
              <Fact label="Owner name" value={vendor.user.fullName} />
              <Fact label="Email" value={vendor.user.email} />
              <Fact label="Phone" value={vendor.user.phone ?? "No phone"} />
              <Fact label="Account role" value={vendor.user.role} />
            </InfoSection>

            <InfoSection bodyClassName="space-y-4" title="Store and application">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description
                </p>
                <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                  {vendor.description || "No store description was provided."}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Admin note / rejection reason
                </p>
                <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700">
                  {vendor.adminNote || "No admin note recorded."}
                </p>
              </div>
            </InfoSection>

            <InfoSection title="Marketplace activity">
              <div className="sm:col-span-2">
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm leading-6 text-slate-500">
                  Vendor activity metrics are not available in the current API response.
                </p>
              </div>
              <Fact label="Last updated" value={formatDateTime(vendor.updatedAt)} />
            </InfoSection>
          </div>

          {confirmAction ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4">
              <p className="text-sm font-black text-slate-950">
                {confirmAction === "reject"
                  ? "Reject this vendor application?"
                  : "Suspend this vendor?"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {confirmAction === "reject"
                  ? "The seller will see that the application was not approved."
                  : "Their products should no longer be visible if backend rules already enforce this."}
              </p>
              <label className="mt-3 block text-sm font-semibold text-slate-700" htmlFor="vendor-admin-note">
                Admin note required
              </label>
              <textarea
                className="mt-2 min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                id="vendor-admin-note"
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder={
                  confirmAction === "reject"
                    ? "Explain why this application is not approved."
                    : "Add the reason for suspension."
                }
                value={note}
              />
              {noteIsRequired && !note.trim() ? (
                <p className="mt-2 text-xs font-semibold text-market-700">
                  Add a short note to continue.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </DashboardDrawer>
  );
}

function InfoSection({
  bodyClassName,
  children,
  title,
}: {
  bodyClassName?: string;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60">
      <h3 className="text-sm font-black uppercase tracking-wide text-slate-500">{title}</h3>
      <div className={cn("mt-4 grid gap-3 sm:grid-cols-2", bodyClassName)}>{children}</div>
    </section>
  );
}

function Fact({
  label,
  muted = false,
  value,
}: {
  label: string;
  muted?: boolean;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1 break-words text-sm font-bold", muted ? "text-slate-400" : "text-slate-950")}>
        {value}
      </p>
    </div>
  );
}

function ActionButton({
  compact,
  disabled,
  label,
  onClick,
  tone,
}: {
  compact?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone: "approve" | "danger" | "neutral" | "warn";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg border text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/20 disabled:cursor-not-allowed disabled:opacity-60",
        compact ? "h-8 px-2 text-[11px]" : "h-9 px-3",
        tone === "approve" &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        tone === "danger" &&
          "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
        tone === "neutral" &&
          "border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-200/60 hover:bg-slate-50",
        tone === "warn" &&
          "border-orange-200 bg-orange-50 text-market-700 hover:bg-orange-100",
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function InlineMessage({ message }: { message: ActionMessage }) {
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

function LoadingVendorsPanel() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="grid animate-pulse gap-3 rounded-lg bg-slate-50 p-3 md:grid-cols-[1fr_140px_180px]" key={index}>
            <div className="space-y-2">
              <div className="h-4 w-44 rounded bg-slate-200" />
              <div className="h-3 w-28 rounded bg-slate-200" />
            </div>
            <div className="h-7 rounded bg-slate-200" />
            <div className="h-7 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorPanel({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center">
      <p className="text-sm font-black text-rose-800">Could not load vendors</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-rose-700">
        The vendor moderation workspace could not refresh its data.
      </p>
      <Button className="mt-4 bg-rose-600 hover:bg-rose-700" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}

function EmptyPanel({ text, title }: { text: string; title: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center">
      <p className="text-sm font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function VendorStatusBadge({ status }: { status: VendorStatus }) {
  if (status === "APPROVED") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700" tone="neutral">
        Approved
      </Badge>
    );
  }

  if (status === "PENDING") {
    return (
      <Badge className="border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700" tone="neutral">
        Pending
      </Badge>
    );
  }

  if (status === "REJECTED") {
    return (
      <Badge className="border-rose-200 bg-rose-50 px-2 py-1 text-[11px] text-rose-700" tone="neutral">
        Rejected
      </Badge>
    );
  }

  return (
    <Badge className="border-orange-200 bg-slate-100 px-2 py-1 text-[11px] text-slate-700" tone="neutral">
      Suspended
    </Badge>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function countByStatus(vendors: VendorApplication[], status: VendorStatus) {
  return vendors.filter((vendor) => vendor.status === status).length;
}

function upsertVendor(vendors: VendorApplication[], updatedVendor: VendorApplication) {
  const existingIndex = vendors.findIndex((vendor) => vendor.id === updatedVendor.id);

  if (existingIndex === -1) {
    return [updatedVendor, ...vendors];
  }

  return vendors.map((vendor) => (vendor.id === updatedVendor.id ? updatedVendor : vendor));
}

function drawerTitle(status: VendorStatus) {
  if (status === "PENDING") {
    return "Review vendor application";
  }

  if (status === "APPROVED" || status === "SUSPENDED") {
    return "Manage vendor";
  }

  return "Vendor details";
}

function formatCommission(value: VendorApplication["commissionRate"]) {
  if (value === undefined || value === null || value === "") {
    return "Not available";
  }

  return `${value}%`;
}

function getTabCount(
  tab: VendorTab,
  counts: {
    all: number;
    approved: number;
    pending: number;
    rejected: number;
    suspended: number;
  },
) {
  if (tab === "ALL") {
    return counts.all;
  }

  if (tab === "APPROVED") {
    return counts.approved;
  }

  if (tab === "PENDING") {
    return counts.pending;
  }

  if (tab === "REJECTED") {
    return counts.rejected;
  }

  return counts.suspended;
}

function getEmptyCopy(activeTab: VendorTab, hasSearchQuery: boolean) {
  if (hasSearchQuery) {
    return {
      title: "No search results",
      text: "Try changing filters or clearing search.",
    };
  }

  if (activeTab === "PENDING") {
    return {
      title: "No pending applications",
      text: "New seller applications will appear here when buyers apply to sell on FireShop.",
    };
  }

  if (activeTab === "ALL") {
    return {
      title: "No vendors found",
      text: "There are no vendor records available yet.",
    };
  }

  return {
    title: `No ${statusLabel(activeTab).toLowerCase()} vendors`,
    text: "Try another status tab or clear the current filters.",
  };
}

function getVendorSearchText(vendor: VendorApplication) {
  return [
    vendor.storeName,
    vendor.slug,
    vendor.description,
    vendor.user.fullName,
    vendor.user.email,
    vendor.user.phone,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function rowToneClass(status: VendorStatus) {
  if (status === "REJECTED") {
    return "bg-rose-50/20";
  }

  if (status === "SUSPENDED") {
    return "bg-slate-50/70";
  }

  return undefined;
}

function sortVendors(firstVendor: VendorApplication, secondVendor: VendorApplication, sort: SortOption) {
  if (sort === "storeName") {
    return firstVendor.storeName.localeCompare(secondVendor.storeName);
  }

  const firstDate = new Date(firstVendor.createdAt ?? 0).getTime();
  const secondDate = new Date(secondVendor.createdAt ?? 0).getTime();

  return sort === "oldest" ? firstDate - secondDate : secondDate - firstDate;
}

function formatShortDate(value: string | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-TN", {
    dateStyle: "medium",
  }).format(date);
}

function statusLabel(status: VendorStatus) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}
