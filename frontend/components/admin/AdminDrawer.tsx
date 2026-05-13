"use client";

import type { ReactNode } from "react";
import { DashboardDrawer } from "@/components/dashboard/DashboardDrawer";

type AdminDrawerWidth = "md" | "lg" | "xl";

type AdminDrawerProps = {
  children: ReactNode;
  closeLabel?: string;
  description?: string;
  eyebrow?: string;
  footer?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  width?: AdminDrawerWidth;
};

export function AdminDrawer({
  isOpen,
  ...props
}: AdminDrawerProps) {
  return <DashboardDrawer open={isOpen} {...props} />;
}
