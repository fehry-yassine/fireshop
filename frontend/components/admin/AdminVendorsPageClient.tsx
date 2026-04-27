"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { formatDateTime, getErrorMessage } from "@/components/admin/adminUtils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import type { VendorApplication, VendorStatus } from "@/types";

type ActionMessage = {
  applicationId?: string;
  text: string;
  tone: "success" | "error";
};

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
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeApplicationId, setActiveApplicationId] = useState<string | null>(null);

  const loadVendors = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);

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

  const pendingCount = useMemo(
    () => applications.filter((application) => application.status === "PENDING").length,
    [applications],
  );

  async function approveApplication(application: VendorApplication) {
    setActiveApplicationId(application.id);
    setMessage(null);

    try {
      await api.admin.vendors.approveApplication(application.id, {
        adminNote: cleanOptional(notes[application.id]),
      });
      setMessage({
        applicationId: application.id,
        text: `${application.storeName} approved.`,
        tone: "success",
      });
      await loadVendors();
    } catch (error) {
      setMessage({
        applicationId: application.id,
        text: getErrorMessage(error, "Could not approve application."),
        tone: "error",
      });
    } finally {
      setActiveApplicationId(null);
    }
  }

  async function rejectApplication(application: VendorApplication) {
    const adminNote = notes[application.id]?.trim();

    if (!adminNote) {
      setMessage({
        applicationId: application.id,
        text: "Rejection note is required.",
        tone: "error",
      });
      return;
    }

    setActiveApplicationId(application.id);
    setMessage(null);

    try {
      await api.admin.vendors.rejectApplication(application.id, { adminNote });
      setMessage({
        applicationId: application.id,
        text: `${application.storeName} rejected.`,
        tone: "success",
      });
      await loadVendors();
    } catch (error) {
      setMessage({
        applicationId: application.id,
        text: getErrorMessage(error, "Could not reject application."),
        tone: "error",
      });
    } finally {
      setActiveApplicationId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-market-700">Vendor moderation</p>
          <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
            Vendors and applications
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Review seller applications and monitor approved marketplace vendors.
          </p>
        </div>
        <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
          {pendingCount} pending
        </div>
      </div>

      {message && !message.applicationId ? <InlineMessage message={message} /> : null}

      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Vendor applications</h3>
            <p className="text-sm text-slate-500">Approve or reject seller requests.</p>
          </div>

          {isLoading ? (
            <EmptyPanel text="Loading applications." />
          ) : applications.length === 0 ? (
            <EmptyPanel text="No vendor applications to review." />
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <ApplicationCard
                  application={application}
                  isActive={activeApplicationId === application.id}
                  key={application.id}
                  message={message?.applicationId === application.id ? message : null}
                  note={notes[application.id] ?? ""}
                  onApprove={() => approveApplication(application)}
                  onNoteChange={(value) =>
                    setNotes((current) => ({ ...current, [application.id]: value }))
                  }
                  onReject={() => rejectApplication(application)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">All vendors</h3>
            <p className="text-sm text-slate-500">Current vendor profiles in the marketplace.</p>
          </div>

          {isLoading ? (
            <EmptyPanel text="Loading vendors." />
          ) : vendors.length === 0 ? (
            <EmptyPanel text="No vendors found." />
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {vendors.map((vendor) => (
                <VendorCard key={vendor.id} vendor={vendor} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ApplicationCard({
  application,
  isActive,
  message,
  note,
  onApprove,
  onNoteChange,
  onReject,
}: {
  application: VendorApplication;
  isActive: boolean;
  message: ActionMessage | null;
  note: string;
  onApprove: () => void;
  onNoteChange: (value: string) => void;
  onReject: () => void;
}) {
  const isPending = application.status === "PENDING";

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <VendorStatusBadge status={application.status} />
            <span className="text-xs text-slate-500">
              Applied {formatDateTime(application.createdAt)}
            </span>
          </div>
          <h4 className="text-lg font-bold text-slate-950">{application.storeName}</h4>
          <p className="break-all text-xs text-slate-500">{application.slug}</p>
        </div>
        <div className="text-sm text-slate-500 lg:text-right">
          <p className="font-semibold text-slate-950">{application.user.fullName}</p>
          <p>{application.user.email}</p>
          {application.user.phone ? <p>{application.user.phone}</p> : null}
        </div>
      </div>

      {application.description ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
          {application.description}
        </p>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-semibold text-slate-700" htmlFor={`note-${application.id}`}>
          Admin note
        </label>
        <Input
          id={`note-${application.id}`}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Optional for approval, required for rejection"
          value={note}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button disabled={isActive || !isPending} onClick={onApprove}>
            {isActive ? "Working" : "Approve"}
          </Button>
          <Button disabled={isActive || !isPending} onClick={onReject} variant="secondary">
            Reject
          </Button>
        </div>
        {application.adminNote ? (
          <p className="text-xs text-slate-500">Previous note: {application.adminNote}</p>
        ) : null}
      </div>

      {message ? <InlineMessage message={message} /> : null}
    </div>
  );
}

function VendorCard({ vendor }: { vendor: VendorApplication }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-bold text-slate-950">{vendor.storeName}</h4>
          <p className="break-all text-xs text-slate-500">{vendor.slug}</p>
        </div>
        <VendorStatusBadge status={vendor.status} />
      </div>
      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Fact label="Owner" value={vendor.user.fullName} />
        <Fact label="Email" value={vendor.user.email} />
        <Fact label="Active" value={vendor.isActive ? "Yes" : "No"} />
        <Fact label="Commission" value={`${vendor.commissionRate ?? "8"}%`} />
      </div>
    </div>
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

function EmptyPanel({ text }: { text: string }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">{text}</p>;
}

function VendorStatusBadge({ status }: { status: VendorStatus }) {
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

function cleanOptional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
