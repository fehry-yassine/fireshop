"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type AdminAccessGateProps = {
  children: ReactNode;
};

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const router = useRouter();
  const { isLoading, user } = useCurrentUser();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/auth/login");
    }
  }, [isLoading, router, user]);

  if (isLoading || (!user && !isLoading)) {
    return <AdminLoadingState label="Checking admin session" />;
  }

  if (!user) {
    return <AdminLoadingState label="Checking admin session" />;
  }

  if (user.role !== "ADMIN") {
    return (
      <section className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <Badge tone="warning">Admin access required</Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">
                This area is for administrators
              </h1>
              <p className="text-sm leading-6 text-slate-500">
                Your current role is {user.role}. Admin tools are restricted to
                marketplace operators.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              href="/"
            >
              Back to marketplace
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return children;
}

function AdminLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
      </CardContent>
    </Card>
  );
}
