"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type SlideOverProps = {
  ariaLabel: string;
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
};

export function SlideOver({
  ariaLabel,
  children,
  isOpen,
  onClose,
}: SlideOverProps) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      window.requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    setIsVisible(false);
    const timeoutId = window.setTimeout(() => setShouldRender(false), 250);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, shouldRender]);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [shouldRender]);

  if (!shouldRender || !portalRoot) {
    return null;
  }

  return createPortal(
    <div
      aria-label={ariaLabel}
      aria-modal="true"
      className="fixed inset-0 z-50"
      role="dialog"
    >
      <button
        aria-label="Close panel"
        className={cn(
          "absolute inset-0 h-full w-full bg-slate-950/45 transition-opacity duration-[250ms] ease-in-out",
          isVisible ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        type="button"
      />
      <aside
        className={cn(
          "vendor-slide-over absolute right-0 top-0 flex h-full w-full flex-col overflow-y-auto border-l shadow-2xl transition-all duration-[250ms] ease-in-out will-change-transform sm:max-w-[1120px]",
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-90",
        )}
      >
        {children}
      </aside>
    </div>,
    portalRoot,
  );
}
