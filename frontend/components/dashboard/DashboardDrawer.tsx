"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardDrawerWidth = "md" | "lg" | "xl";

type DashboardDrawerProps = {
  children: ReactNode;
  closeLabel?: string;
  description?: string;
  eyebrow?: string;
  footer?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
  width?: DashboardDrawerWidth;
};

const widthClassNames: Record<DashboardDrawerWidth, string> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
};

export function DashboardDrawer({
  children,
  closeLabel = "Close",
  description,
  eyebrow,
  footer,
  onClose,
  open,
  title,
  width = "lg",
}: DashboardDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !mounted) {
    return null;
  }

  const drawer = (
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-[9999] m-0 overflow-hidden p-0"
      role="dialog"
    >
      <button
        aria-label={closeLabel}
        className="absolute inset-0 m-0 h-full w-full border-0 bg-slate-950/40 p-0 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-screen min-h-screen w-full flex-col overflow-hidden border-l border-slate-200 bg-slate-50 shadow-2xl shadow-slate-950/25",
          widthClassNames[width],
        )}
      >
        <header className="shrink-0 border-b border-market-100 bg-gradient-to-br from-white to-market-50/80 px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-sm font-semibold text-market-700">
                  {eyebrow}
                </p>
              ) : null}
              <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950">
                {title}
              </h2>
              {description ? (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
            <Button
              className="h-9 border-slate-200 px-3"
              onClick={onClose}
              variant="secondary"
            >
              {closeLabel}
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer ? (
          <footer className="shrink-0 border-t border-slate-200 bg-white/95 px-5 py-4 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
