"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BackofficeLink = {
  badge?: string;
  disabled?: boolean;
  href: string;
  label: string;
};

type BackofficeFrameProps = {
  brand?: "default" | "fireshop";
  children: ReactNode;
  links: BackofficeLink[];
  panelLabel: string;
  panelTitle: string;
  panelSubtitle: string;
  topTitle: string;
  topBadgeLabel: string;
  supportText: string;
};

type VendorTheme = "dark" | "light";

const VENDOR_THEME_STORAGE_KEY = "fireshop-vendor-theme";

export function BackofficeFrame({
  brand = "default",
  children,
  links,
  panelLabel,
  panelTitle,
  panelSubtitle,
  topTitle,
  topBadgeLabel,
  supportText,
}: BackofficeFrameProps) {
  const pathname = usePathname();
  const isFireShop = brand === "fireshop";
  const initial = panelTitle.trim().charAt(0).toUpperCase() || "S";
  const [vendorTheme, setVendorTheme] = useState<VendorTheme>("dark");

  useEffect(() => {
    if (!isFireShop) {
      return;
    }

    const storedTheme = window.localStorage.getItem(VENDOR_THEME_STORAGE_KEY);

    if (storedTheme === "dark" || storedTheme === "light") {
      setVendorTheme(storedTheme);
    }
  }, [isFireShop]);

  function toggleVendorTheme() {
    setVendorTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem(VENDOR_THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }

  return (
    <section
      data-vendor-theme={isFireShop ? vendorTheme : undefined}
      className={cn(
        "min-h-screen",
        isFireShop ? "vendor-fireshop-theme" : "bg-[#f4f5f8]",
      )}
    >
      <div
        className={cn(
          "grid min-h-screen",
          isFireShop
            ? "lg:grid-cols-[312px_minmax(0,1fr)]"
            : "lg:grid-cols-[280px_minmax(0,1fr)]",
        )}
      >
        <aside
          className={cn(
            "p-4 text-white",
            isFireShop
              ? "vendor-sidebar"
              : "bg-[#311552]",
          )}
        >
          <div className="flex h-full flex-col">
            <div className="px-2 py-2">
              <div className="flex items-center gap-3">
                {isFireShop ? (
                  <div className="vendor-logo-tile">
                    <Image
                      alt="FireShop"
                      className="h-8 w-auto object-contain"
                      height={48}
                      src="/branding/fireshop-mark.png"
                      width={160}
                    />
                  </div>
                ) : null}
                <div>
                  <p className="vendor-title text-3xl font-bold leading-none">FireShop</p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-semibold",
                      isFireShop ? "vendor-accent-text" : "text-purple-200",
                    )}
                  >
                    seller workspace
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "mt-5 border px-4 py-3",
                isFireShop
                  ? "vendor-store-card"
                  : "border-white/10 bg-[#8e43db]",
              )}
            >
              <p
                className={cn(
                  "text-xs font-semibold uppercase tracking-normal",
                  isFireShop ? "vendor-accent-text" : "text-purple-100",
                )}
              >
                {panelLabel}
              </p>
              <p className="vendor-title mt-1 text-3xl font-extrabold leading-tight">
                {panelTitle}
              </p>
              <p className={cn("mt-1 text-sm", isFireShop ? "vendor-muted" : "text-purple-100")}>
                {panelSubtitle}
              </p>
            </div>

            <nav className="mt-5 space-y-1.5">
              {links.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    item.href !== "/vendor" &&
                    pathname.startsWith(`${item.href}/`));

                return item.disabled ? (
                  <div
                    className={cn(
                      "flex h-12 cursor-not-allowed items-center justify-between rounded-xl px-4 text-sm font-semibold",
                      isFireShop ? "vendor-nav-link vendor-nav-link-disabled" : "text-purple-200/70",
                    )}
                    key={item.href}
                  >
                    <div className="flex items-center gap-3">
                      <span className="vendor-nav-icon inline-flex h-7 w-7 items-center justify-center rounded-lg">
                        <SidebarIcon label={item.label} />
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded-full bg-white/10 px-2 py-1 text-xs",
                          isFireShop ? "vendor-soft-pill" : "text-purple-100",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    className={cn(
                      "flex h-12 items-center justify-between rounded-xl px-4 text-sm font-semibold transition-colors",
                      isFireShop
                        ? isActive
                          ? "vendor-nav-link vendor-nav-link-active"
                          : "vendor-nav-link"
                        : isActive
                          ? "bg-white text-[#4b1d7a] hover:bg-white hover:text-[#4b1d7a]"
                          : "text-purple-50 hover:bg-[#6d35a8] hover:text-white",
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-lg",
                          isFireShop ? "vendor-nav-icon" : isActive
                            ? "bg-[#FFF4EB] text-[#FF6A2D]"
                            : "bg-white/10 text-white/85",
                        )}
                      >
                        <SidebarIcon label={item.label} />
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-xs",
                          isActive
                            ? isFireShop
                              ? "vendor-active-pill"
                              : "bg-[#ffefeb] text-market-700"
                            : isFireShop
                              ? "vendor-soft-pill"
                              : "bg-[#ff4d4d] text-white",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div
              className={cn(
                "mt-auto rounded-2xl p-4 text-sm leading-6",
                isFireShop
                  ? "vendor-help-card"
                  : "bg-black/20 text-purple-50",
              )}
            >
              <p className="vendor-title font-bold">Need help?</p>
              <p className="mt-1">{supportText}</p>
              {isFireShop ? (
                <div className="mt-4 flex items-center gap-2">
                  <span className="vendor-soft-pill inline-flex h-9 min-w-10 items-center justify-center rounded-full px-3 text-xs font-bold">
                    YouTube
                  </span>
                  <span className="vendor-soft-pill inline-flex h-9 min-w-10 items-center justify-center rounded-full px-3 text-xs font-bold">
                    WhatsApp
                  </span>
                  <span className="vendor-soft-pill inline-flex h-9 min-w-10 items-center justify-center rounded-full px-3 text-xs font-bold">
                    Meta
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header
            className={cn(
              "border-b px-4 py-4 lg:px-6",
              isFireShop
                ? "vendor-topbar"
                : "border-slate-200 bg-white",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className={cn(isFireShop ? "space-y-1" : undefined)}>
                {isFireShop ? (
                  <div className="vendor-muted flex items-center gap-2 text-sm font-semibold">
                    <span>{topTitle}</span>
                    <span>/</span>
                    <span className="vendor-soft-pill px-2.5 py-1 text-xs font-bold uppercase tracking-wide">
                      {topBadgeLabel}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">
                    {topBadgeLabel}
                  </p>
                )}
                <h1 className={cn("text-xl font-bold", isFireShop ? "vendor-title" : "text-slate-900")}>
                  {isFireShop ? panelTitle : topTitle}
                </h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                {isFireShop ? (
                  <button
                    aria-checked={vendorTheme === "dark"}
                    aria-label={`Switch to ${vendorTheme === "dark" ? "light" : "dark"} mode`}
                    className="vendor-theme-toggle"
                    onClick={toggleVendorTheme}
                    role="switch"
                    type="button"
                  >
                    <span className="vendor-theme-toggle-thumb">
                      {vendorTheme === "dark" ? <MoonIcon /> : <SunIcon />}
                    </span>
                    <span className="text-xs font-bold">
                      {vendorTheme === "dark" ? "Dark" : "Light"}
                    </span>
                  </button>
                ) : null}
                {isFireShop ? (
                  <div className="vendor-chip px-3 py-2 text-sm font-semibold">
                    {panelTitle}
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white",
                    isFireShop ? "vendor-avatar" : "bg-[#7457ff]",
                  )}
                >
                  {isFireShop ? initial : "LM"}
                </div>
              </div>
            </div>
          </header>

          <main className={cn("space-y-5 p-4 lg:p-6", isFireShop ? "vendor-main lg:p-8" : undefined)}>
            {children}
          </main>
        </div>
      </div>
    </section>
  );
}

function SidebarIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const iconClassName = "h-4 w-4";

  if (normalized.includes("dashboard")) {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" fill="currentColor" />
      </svg>
    );
  }

  if (normalized.includes("order")) {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path d="M4 7h16M7 12h10M9 17h6" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    );
  }

  if (normalized.includes("product")) {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="m12 3 8 4.5v9L12 21 4 16.5v-9L12 3Zm0 0v18m8-13.5-8 4.5-8-4.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (normalized.includes("setting") || normalized.includes("categorie")) {
    return (
      <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
        <path
          d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm8 4-2.1.8a6.7 6.7 0 0 1-.5 1.2l1 2-2.1 2.1-2-1a6.7 6.7 0 0 1-1.2.5L12 20l-1.1-2.1a6.7 6.7 0 0 1-1.2-.5l-2 1L5.6 16l1-2a6.7 6.7 0 0 1-.5-1.2L4 12l2.1-1a6.7 6.7 0 0 1 .5-1.2l-1-2L7.7 5.7l2 1a6.7 6.7 0 0 1 1.2-.5L12 4l1 2.1a6.7 6.7 0 0 1 1.2.5l2-1L18.3 8l-1 2a6.7 6.7 0 0 1 .5 1.2L20 12Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={iconClassName} fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" fill="currentColor" r="3" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M20 15.4A7.7 7.7 0 0 1 8.6 4a8.2 8.2 0 1 0 11.4 11.4Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

