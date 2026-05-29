"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { PublicUser } from "@/types";

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
  logoAlt?: string;
  logoSrc?: string;
  panelLabel: string;
  panelTitle: string;
  panelSubtitle: string;
  topTitle: string;
  topBadgeLabel: string;
  supportText: string;
  user?: PublicUser;
  workspaceDisabledActionLabel?: string;
  workspacePanelTitle?: string;
};

type VendorTheme = "dark" | "light";

const VENDOR_THEME_STORAGE_KEY = "fireshop-vendor-theme";
const FIRESHOP_SIDEBAR_GRID_CLASS = "lg:grid-cols-[240px_minmax(0,1fr)]";
const DEFAULT_SIDEBAR_GRID_CLASS = "lg:grid-cols-[248px_minmax(0,1fr)]";

export function BackofficeFrame({
  brand = "default",
  children,
  links,
  logoAlt,
  logoSrc,
  panelLabel,
  panelTitle,
  panelSubtitle,
  topTitle,
  topBadgeLabel,
  supportText,
  user,
  workspaceDisabledActionLabel,
  workspacePanelTitle,
}: BackofficeFrameProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isFireShop = brand === "fireshop";
  const accountName = user?.fullName || panelTitle;
  const initial = accountName.trim().charAt(0).toUpperCase() || "S";
  const [vendorTheme, setVendorTheme] = useState<VendorTheme>("dark");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const workspaceSelectorRef = useRef<HTMLDivElement | null>(null);
  const workspaceSelectorTitle = workspacePanelTitle ?? (user ? "Stores" : "Workspaces");
  const workspacePanelId = "fireshop-workspace-selector";

  useEffect(() => {
    if (!isFireShop) {
      return;
    }

    const storedTheme = window.localStorage.getItem(VENDOR_THEME_STORAGE_KEY);

    if (storedTheme === "dark" || storedTheme === "light") {
      setVendorTheme(storedTheme);
    }
  }, [isFireShop]);

  useEffect(() => {
    if (!isWorkspaceMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        workspaceSelectorRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsWorkspaceMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isWorkspaceMenuOpen]);

  useEffect(() => {
    setIsWorkspaceMenuOpen(false);
  }, [pathname]);

  function toggleVendorTheme() {
    setVendorTheme((currentTheme) => {
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      window.localStorage.setItem(VENDOR_THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await api.auth.logout();
    } catch {
      // Continue locally even if the session was already expired on the server.
    } finally {
      setIsLoggingOut(false);
      setIsAccountMenuOpen(false);
    }

    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <section
      data-vendor-theme={isFireShop ? vendorTheme : undefined}
      className={cn(
        "min-h-screen lg:h-screen lg:overflow-hidden",
        isFireShop ? "vendor-fireshop-theme" : "bg-[#f4f5f8]",
      )}
    >
      <div
        className={cn(
          "grid min-h-screen lg:h-screen",
          isFireShop ? FIRESHOP_SIDEBAR_GRID_CLASS : DEFAULT_SIDEBAR_GRID_CLASS,
        )}
      >
        <aside
          className={cn(
            "overflow-hidden p-2 text-white lg:h-screen",
            isFireShop
              ? "vendor-sidebar"
              : "bg-[#311552]",
          )}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 px-1 pb-0 pt-1">
              {isFireShop ? (
                <div className="vendor-logo-tile relative mx-auto h-[58px] w-full max-w-[148px]">
                  <Image
                    alt={logoAlt ?? "FireShop workspace"}
                    className="object-contain"
                    fill
                    priority
                    sizes="148px"
                    src={logoSrc ?? "/branding/fireshop-logo.png"}
                  />
                </div>
              ) : null}
            </div>

            <div className="relative mx-1 mt-1 shrink-0" ref={workspaceSelectorRef}>
              <button
                aria-controls={workspacePanelId}
                aria-expanded={isWorkspaceMenuOpen}
                className={cn(
                  "vendor-identity-card vendor-workspace-trigger w-full border px-2.5 py-2 text-left",
                  isWorkspaceMenuOpen ? "vendor-workspace-trigger-open" : undefined,
                  isFireShop
                    ? undefined
                    : "border-white/10 bg-[#8e43db]",
                )}
                onClick={() => setIsWorkspaceMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "vendor-workspace-label inline-flex min-w-0 max-w-full items-center rounded-full px-2 py-0.5 text-[11px] font-bold leading-5",
                        isFireShop ? undefined : "bg-white/10 text-purple-100",
                      )}
                    >
                      {panelLabel}
                    </span>
                    <span className="vendor-title mt-1.5 block truncate text-[15px] font-extrabold leading-tight">
                      {panelTitle}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "vendor-workspace-cue inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-transform duration-200",
                      isWorkspaceMenuOpen ? "rotate-180" : undefined,
                    )}
                  >
                    <ChevronDownIcon />
                  </span>
                </span>
              </button>

              <div
                aria-hidden={!isWorkspaceMenuOpen}
                className={cn(
                  "vendor-workspace-panel absolute left-0 right-0 top-[calc(100%+5px)] z-30 origin-top rounded-md border p-1 transition-all duration-150 ease-out",
                  isWorkspaceMenuOpen
                    ? "translate-y-0 scale-100 opacity-100"
                    : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
                )}
                id={workspacePanelId}
              >
                <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5">
                  <p className="vendor-panel-title text-[10px] font-extrabold">
                    {workspaceSelectorTitle}
                  </p>
                  <button
                    aria-label="Close workspace selector"
                    className="vendor-workspace-close inline-flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold"
                    onClick={() => setIsWorkspaceMenuOpen(false)}
                    tabIndex={isWorkspaceMenuOpen ? 0 : -1}
                    type="button"
                  >
                    x
                  </button>
                </div>
                <div className="space-y-0.5">
                  <button
                    className="vendor-workspace-row vendor-workspace-row-selected flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left"
                    onClick={() => setIsWorkspaceMenuOpen(false)}
                    tabIndex={isWorkspaceMenuOpen ? 0 : -1}
                    type="button"
                  >
                    <span className="vendor-workspace-mark inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                      <WorkspaceFlameIcon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="vendor-title block truncate text-[12px] font-bold leading-4">
                        {panelTitle}
                      </span>
                      <span className="vendor-muted block truncate text-[10px] font-medium leading-[14px]">
                        {panelSubtitle}
                      </span>
                    </span>
                    <span className="vendor-workspace-check inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                      <CheckIcon />
                    </span>
                  </button>

                  {workspaceDisabledActionLabel ? (
                    <div className="vendor-workspace-row vendor-workspace-row-disabled flex items-center gap-1.5 rounded-md px-1.5 py-1">
                      <span className="vendor-workspace-mark inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                        <PlusIcon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-bold leading-4">
                          {workspaceDisabledActionLabel}
                        </span>
                        <span className="block truncate text-[10px] font-medium leading-[14px]">
                          Future workspace
                        </span>
                      </span>
                      <span className="vendor-workspace-soon shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                        Soon
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="vendor-sidebar-scroll mt-2.5 flex min-h-0 flex-1 flex-col overflow-y-auto px-1 pb-1">
              <nav className="space-y-1">
                {links.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/admin" &&
                      item.href !== "/vendor" &&
                      pathname.startsWith(`${item.href}/`));

                  return item.disabled ? (
                    <div
                      className={cn(
                        "flex h-[42px] cursor-not-allowed items-center justify-between rounded-lg px-2.5 text-[13px] font-semibold",
                        isFireShop ? "vendor-nav-link vendor-nav-link-disabled" : "text-purple-200/70",
                      )}
                      key={item.href}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="vendor-nav-icon inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
                          <SidebarIcon label={item.label} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px]",
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
                        "flex h-[42px] items-center justify-between rounded-lg px-2.5 text-[13px] font-semibold transition-colors",
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
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                            isFireShop ? "vendor-nav-icon" : isActive
                              ? "bg-[#FFF4EB] text-[#FF6A2D]"
                              : "bg-white/10 text-white/85",
                          )}
                        >
                          <SidebarIcon label={item.label} />
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-1.5 py-0.5 text-[11px]",
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
                  "mt-3 rounded-lg p-2.5 text-[11px] leading-5",
                  isFireShop
                    ? "vendor-help-card"
                    : "bg-black/20 text-purple-50",
                )}
              >
                <p className="vendor-title text-[13px] font-bold">Need help?</p>
                <p className="mt-0.5">{supportText}</p>
                {isFireShop ? (
                  <div className="mt-2.5 flex items-center gap-1.5">
                    <span className="vendor-soft-pill inline-flex h-7 min-w-8 items-center justify-center rounded-full px-2 text-[10px] font-bold">
                      YouTube
                    </span>
                    <span className="vendor-soft-pill inline-flex h-7 min-w-8 items-center justify-center rounded-full px-2 text-[10px] font-bold">
                      WhatsApp
                    </span>
                    <span className="vendor-soft-pill inline-flex h-7 min-w-8 items-center justify-center rounded-full px-2 text-[10px] font-bold">
                      Meta
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 lg:flex lg:h-screen lg:min-h-0 lg:flex-col lg:overflow-hidden">
          <header
            className={cn(
              "sticky top-0 z-20 min-h-[72px] border-b px-4 py-3 lg:shrink-0 lg:px-5",
              isFireShop
                ? "vendor-topbar"
                : "border-slate-200 bg-white",
            )}
          >
            <div className="flex min-h-[46px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className={cn(isFireShop ? "space-y-0" : undefined)}>
                {isFireShop ? (
                  <div className="vendor-muted flex items-center gap-2 text-[13px] font-semibold">
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
                {!isFireShop ? (
                  <h1 className="text-xl font-bold text-slate-900">
                    {topTitle}
                  </h1>
                ) : null}
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
                {isFireShop ? <NotificationBell variant="dark" /> : null}
                {isFireShop ? (
                  <div className="vendor-chip inline-flex h-10 max-w-[220px] items-center overflow-hidden truncate whitespace-nowrap px-3 text-sm font-semibold">
                    {panelTitle}
                  </div>
                ) : null}
                {isFireShop ? (
                  <div className="relative">
                    <button
                      aria-expanded={isAccountMenuOpen}
                      aria-haspopup="menu"
                      aria-label="Open account menu"
                      className="vendor-account-button flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                      onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
                      type="button"
                    >
                      {initial}
                    </button>
                    {isAccountMenuOpen ? (
                      <div
                        className="vendor-account-menu absolute right-0 top-11 z-40 w-72 rounded-lg border p-3"
                        role="menu"
                      >
                        <div className="border-b pb-3">
                          <p className="vendor-muted text-xs font-semibold uppercase tracking-wide">
                            Vendor account
                          </p>
                          <p className="vendor-title mt-1 truncate text-sm font-bold">
                            {panelTitle}
                          </p>
                          {user?.email ? (
                            <p className="vendor-muted mt-0.5 truncate text-xs">
                              {user.email}
                            </p>
                          ) : null}
                          {user?.fullName ? (
                            <p className="vendor-muted mt-2 truncate text-xs">
                              Signed in as {user.fullName}
                            </p>
                          ) : null}
                        </div>
                        <button
                          className="vendor-logout-button mt-3 flex h-10 w-full items-center justify-center rounded-lg px-3 text-sm font-bold"
                          disabled={isLoggingOut}
                          onClick={handleLogout}
                          role="menuitem"
                          type="button"
                        >
                          {isLoggingOut ? "Logging out" : "Logout"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7457ff] text-sm font-bold text-white">
                    LM
                  </div>
                )}
              </div>
            </div>
          </header>

          <main
            className={cn(
              "space-y-4 p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-5 lg:py-4 xl:px-6",
              isFireShop ? "vendor-main" : undefined,
            )}
          >
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

function ChevronDownIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="m5 12.5 4 4L19 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function WorkspaceFlameIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3c3.4 2.5 5.2 5.3 5.2 8.5A5.2 5.2 0 0 1 12 17a5.2 5.2 0 0 1-5.2-5.5c0-2.2 1.1-4.1 3.2-5.8-.1 1.5.3 2.6 1.2 3.4.5-2.1.8-4 0.8-6.1Z"
        fill="currentColor"
      />
      <path
        d="M7 20h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

