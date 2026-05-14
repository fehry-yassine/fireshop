"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type DashboardDrawerWidth = "md" | "lg" | "xl" | "full";

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
  md: "w-full sm:max-w-3xl lg:w-[62vw]",
  lg: "w-full sm:max-w-5xl lg:w-[74vw]",
  xl: "w-full sm:max-w-[1320px] lg:w-[86vw]",
  full: "w-full lg:w-[94vw] xl:max-w-[1600px]",
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
        className="absolute inset-0 m-0 h-full w-full border-0 bg-slate-950/40 p-0 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "absolute right-0 top-0 flex h-screen min-h-screen max-w-full flex-col overflow-hidden border-l border-white/70 bg-slate-50 shadow-[0_0_70px_rgba(15,23,42,0.28)] ring-1 ring-slate-950/5",
          widthClassNames[width],
        )}
      >
        <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-market-700 via-orange-500 to-amber-300" />
          <div className="flex items-start justify-between gap-4 pt-1">
            <div className="min-w-0">
              {eyebrow ? (
                <p className="text-xs font-bold uppercase tracking-wide text-market-700">
                  {eyebrow}
                </p>
              ) : null}
              <h2 className="mt-1 text-xl font-black leading-tight text-slate-950 sm:text-2xl">
                {title}
              </h2>
              {description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                  {description}
                </p>
              ) : null}
            </div>
            <Button
              aria-label={closeLabel}
              className="h-9 shrink-0 border-slate-200 bg-white px-3 shadow-sm shadow-slate-200/60"
              onClick={onClose}
              variant="secondary"
            >
              {closeLabel}
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_58%,#fff7ed_100%)] px-4 py-5 sm:px-6 lg:px-8">
          {children}
        </div>

        {footer ? (
          <footer className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200/90 bg-white/95 px-4 py-4 shadow-[0_-18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-6 lg:px-8">
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}
