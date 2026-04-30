"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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

  if (!shouldRender) {
    return null;
  }

  return (
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
          "absolute inset-y-0 right-0 flex w-full flex-col overflow-y-auto border-l border-[#242833] bg-[#0F1218] shadow-2xl shadow-black/45 transition-all duration-[250ms] ease-in-out will-change-transform sm:max-w-[1120px]",
          isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-90",
        )}
      >
        {children}
      </aside>
    </div>
  );
}
