"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { ApiError, api } from "@/lib/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PublicUser, Vendor, VendorApplication } from "@/types";

type VendorAccessGateProps = {
  children: (context: { vendor: Vendor }) => ReactNode;
};

export function VendorAccessGate({ children }: VendorAccessGateProps) {
  const router = useRouter();
  const { isLoading: isUserLoading, user } = useCurrentUser();
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
      <Card>
        <CardContent className="space-y-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-slate-950">Vendor profile unavailable</h1>
          <p className="text-sm text-red-700">
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
}: {
  application: VendorApplication | null;
  isApplicationLoading: boolean;
}) {
  return (
    <section className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="space-y-5 py-10 text-center">
          <Badge tone="warning">Buyer account</Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">
              Apply to become a vendor
            </h1>
            <p className="text-sm leading-6 text-slate-500">
              Seller tools are available after your LocalMarket vendor profile is
              approved. Product management will come later; this area is for received
              COD orders.
            </p>
          </div>

          {isApplicationLoading ? (
            <p className="text-sm text-slate-500">Checking your vendor application.</p>
          ) : application ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
              <p className="font-semibold text-slate-950">{application.storeName}</p>
              <p className="mt-1 text-slate-500">Status: {application.status}</p>
            </div>
          ) : (
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
              href="/vendor#application"
              id="application"
            >
              Apply to become a vendor
            </Link>
          )}
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
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
      </CardContent>
    </Card>
  );
}
