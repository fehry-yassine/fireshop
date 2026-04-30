"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicUser, Vendor, VendorApplication } from "@/types";

type VendorAccessGateProps = {
  children: (context: { vendor: Vendor }) => ReactNode;
};

export function VendorAccessGate({ children }: VendorAccessGateProps) {
  const router = useRouter();
  const { isLoading: isUserLoading, refreshUser, user } = useCurrentUser();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isVendorLoading, setIsVendorLoading] = useState(true);
  const [isApplicationLoading, setIsApplicationLoading] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    const currentUser = user;

    if (!currentUser) {
      router.replace("/auth/login");
      return;
    }

    let isActive = true;

    async function loadVendorArea(currentUser: PublicUser) {
      setVendor(null);
      setApplication(null);
      setMessage(null);

      if (currentUser.role === "BUYER") {
        setIsVendorLoading(false);
        setIsApplicationLoading(true);

        try {
          const response = await api.vendors.myApplication();

          if (isActive) {
            setApplication(response.application);
          }
        } catch {
          if (isActive) {
            setApplication(null);
          }
        } finally {
          if (isActive) {
            setIsApplicationLoading(false);
          }
        }

        return;
      }

      if (currentUser.role === "ADMIN") {
        setIsVendorLoading(false);
        return;
      }

      setIsVendorLoading(true);

      try {
        const response = await api.vendors.me();

        if (isActive) {
          setVendor(response.vendor);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (isActive) {
          setMessage(
            error instanceof Error ? error.message : "Could not load vendor profile.",
          );
        }
      } finally {
        if (isActive) {
          setIsVendorLoading(false);
        }
      }
    }

    void loadVendorArea(currentUser);

    return () => {
      isActive = false;
    };
  }, [isUserLoading, router, user]);

  if (isUserLoading || (!user && !isUserLoading)) {
    return <VendorLoadingState label="Checking your session" />;
  }

  if (!user) {
    return <VendorLoadingState label="Checking your session" />;
  }

  if (user.role === "BUYER") {
    return (
      <BuyerVendorGuidance
        application={application}
        isApplicationLoading={isApplicationLoading}
        onApplicationUpdated={setApplication}
        onRefreshUser={refreshUser}
      />
    );
  }

  if (user.role === "ADMIN") {
    return <AdminVendorGuidance />;
  }

  if (isVendorLoading) {
    return <VendorLoadingState label="Loading vendor dashboard" />;
  }

  if (message || !vendor) {
    return (
      <Card className="mx-auto mt-12 max-w-xl border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-white">Vendor profile unavailable</h1>
          <p className="text-sm text-red-300">
            {message ?? "Your active vendor profile could not be found."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return children({ vendor });
}

function BuyerVendorGuidance({
  application,
  isApplicationLoading,
  onApplicationUpdated,
  onRefreshUser,
}: {
  application: VendorApplication | null;
  isApplicationLoading: boolean;
  onApplicationUpdated: (application: VendorApplication) => void;
  onRefreshUser: () => Promise<void>;
}) {
  const router = useRouter();
  const [storeName, setStoreName] = useState(application?.storeName ?? "");
  const [description, setDescription] = useState(application?.description ?? "");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshingAccess, setIsRefreshingAccess] = useState(false);

  useEffect(() => {
    if (!application) {
      return;
    }

    setStoreName(application.storeName);
    setDescription(application.description ?? "");
  }, [application]);

  const canSubmit =
    !isSubmitting &&
    !isApplicationLoading &&
    storeName.trim().length >= 3 &&
    (application?.status === "REJECTED" || !application);

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await api.vendors.apply({
        storeName: storeName.trim(),
        description: description.trim() || undefined,
      });

      onApplicationUpdated(response.application);
      setMessage({
        tone: "success",
        text: "Your vendor application was submitted. We will review it soon.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: getVendorApplicationError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshSellerAccess() {
    setIsRefreshingAccess(true);
    setMessage(null);

    try {
      await onRefreshUser();
      router.refresh();
      setMessage({
        tone: "success",
        text: "Session refreshed. Redirecting to seller tools.",
      });
    } catch {
      setMessage({
        tone: "error",
        text: "Could not refresh your session yet. Please try again.",
      });
    } finally {
      setIsRefreshingAccess(false);
    }
  }

  const showForm = !application || application.status === "REJECTED";

  return (
    <section className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="space-y-5 py-10">
          <Badge tone="warning">Buyer account</Badge>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-slate-950">
              Apply to become a vendor
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Seller tools are available after your FireShop vendor profile is
              approved. Product management will come later; this area is for received
              COD orders.
            </p>
          </div>

          {isApplicationLoading ? (
            <p className="text-center text-sm text-slate-500">
              Checking your vendor application.
            </p>
          ) : null}

          {!isApplicationLoading && application ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-slate-950">{application.storeName}</p>
                <VendorApplicationStatusBadge status={application.status} />
              </div>
              {application.adminNote ? (
                <p className="mt-3 rounded-md bg-white px-3 py-2 text-slate-600">
                  Admin note: {application.adminNote}
                </p>
              ) : null}
            </div>
          ) : null}

          {showForm && !isApplicationLoading ? (
            <form className="space-y-4" id="application" onSubmit={submitApplication}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="storeName">
                  Store name
                </label>
                <Input
                  id="storeName"
                  maxLength={70}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="Example: Tunis Home Deals"
                  required
                  value={storeName}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700" htmlFor="storeDescription">
                  Store description (optional)
                </label>
                <textarea
                  className="min-h-28 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                  id="storeDescription"
                  maxLength={280}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What do you sell and who is it for?"
                  value={description}
                />
              </div>

              <Button className="w-full sm:w-auto" disabled={!canSubmit} type="submit">
                {isSubmitting
                  ? "Submitting"
                  : application?.status === "REJECTED"
                    ? "Submit updated application"
                    : "Apply to become a vendor"}
              </Button>
            </form>
          ) : null}

          {application?.status === "PENDING" ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Your application is under review. We will notify you once it is approved.
            </p>
          ) : null}

          {application?.status === "APPROVED" ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Approved. Refresh your session to enter seller tools.
              </p>
              <Button disabled={isRefreshingAccess} onClick={refreshSellerAccess} type="button">
                {isRefreshingAccess ? "Refreshing" : "Go to seller tools"}
              </Button>
            </div>
          ) : null}

          {message ? (
            <p
              className={
                message.tone === "success"
                  ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
                  : "rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
              }
            >
              {message.text}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

function AdminVendorGuidance() {
  return (
    <section className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="space-y-5 py-10 text-center">
          <Badge tone="neutral">Admin account</Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">Use the admin dashboard</h1>
            <p className="text-sm leading-6 text-slate-500">
              Vendor order tools are reserved for sellers. Admin dashboard work will be
              handled in a later milestone.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
            href="/admin"
          >
            Go to admin dashboard
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}

function VendorLoadingState({ label }: { label: string }) {
  return (
    <Card className="mx-auto mt-12 max-w-xl border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="mt-2 text-sm text-[#98A0B2]">Please wait a moment.</p>
      </CardContent>
    </Card>
  );
}

function VendorApplicationStatusBadge({
  status,
}: {
  status: VendorApplication["status"];
}) {
  if (status === "APPROVED") {
    return <Badge tone="success">Approved</Badge>;
  }

  if (status === "PENDING") {
    return <Badge tone="warning">Pending review</Badge>;
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

function getVendorApplicationError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not submit vendor application.";
}

