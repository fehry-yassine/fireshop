"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Notification } from "@/types";

const POLL_INTERVAL_MS = 30_000;

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "il y a quelques secondes";
  if (minutes < 60) return `il y a ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;

  return new Date(dateStr).toLocaleDateString("fr-TN");
}

type NotificationBellProps = {
  /** Visual variant: 'light' for public header, 'dark' for backoffice sidebar */
  variant?: "light" | "dark";
};

export function NotificationBell({ variant = "light" }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUnreadCount = async () => {
    try {
      const { count } = await api.notifications.unreadCount();
      setUnreadCount(count);
    } catch {
      // Keep current count on any network or auth error — do not hide the bell.
    }
  };

  useEffect(() => {
    void fetchUnreadCount();
    pollRef.current = setInterval(() => void fetchUnreadCount(), POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        dropdownRef.current?.contains(event.target)
      ) {
        return;
      }
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleOpen() {
    const opening = !isOpen;
    setIsOpen(opening);

    if (opening) {
      setIsLoading(true);
      try {
        const response = await api.notifications.list({ limit: 10 });
        setItems(response.items);
      } catch {
        // silently ignore
      } finally {
        setIsLoading(false);
      }
    }
  }

  async function handleMarkAsRead(notification: Notification) {
    if (notification.isRead) return;
    try {
      await api.notifications.markAsRead(notification.id);
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently ignore
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await api.notifications.markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // silently ignore
    }
  }

  const isDark = variant === "dark";

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className={cn(
          "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          isDark
            ? "vendor-account-button text-white focus-visible:ring-white/30"
            : "border border-slate-200 bg-white text-slate-800 shadow-[0_7px_18px_rgba(15,23,42,0.075)] hover:-translate-y-px hover:border-market-200 hover:bg-market-50 hover:text-market-900 hover:shadow-[0_10px_22px_rgba(255,106,45,0.15)] focus-visible:ring-market-600/25",
        )}
        onClick={handleOpen}
        type="button"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_52px_rgba(15,23,42,0.18)]"
          role="dialog"
          aria-label="Centre de notifications"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-bold text-slate-950">Notifications</p>
            {unreadCount > 0 && (
              <button
                className="text-xs font-semibold text-market-700 transition hover:opacity-80"
                onClick={handleMarkAllAsRead}
                type="button"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-sm text-slate-400">Chargement...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <BellIcon />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  Aucune notification
                </p>
              </div>
            ) : (
              <ul>
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      className={cn(
                        "w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50",
                        !notification.isRead && "bg-market-50/40",
                      )}
                      onClick={() => handleMarkAsRead(notification)}
                      type="button"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            "mt-1 inline-block h-2 w-2 shrink-0 rounded-full",
                            notification.isRead ? "bg-transparent" : "bg-market-500",
                          )}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug text-slate-900">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-4 text-slate-500">
                            {notification.body}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6 6 0 0 0-4-5.659V5a2 2 0 0 0-4 0v.341A6 6 0 0 0 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 0 1-6 0v-1m6 0H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
