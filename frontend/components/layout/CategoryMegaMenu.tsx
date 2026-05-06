"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

type IconName =
  | "accessories"
  | "apparel"
  | "auto"
  | "beauty"
  | "default"
  | "electronics"
  | "fashion"
  | "health"
  | "home"
  | "industry"
  | "kitchen"
  | "pets"
  | "sports";

type CategoryRecord = {
  categories?: unknown;
  children?: unknown;
  data?: unknown;
  description?: unknown;
  iconKey?: unknown;
  id?: unknown;
  image?: unknown;
  imageUrl?: unknown;
  isActive?: unknown;
  items?: unknown;
  name?: unknown;
  parentId?: unknown;
  slug?: unknown;
  sortOrder?: unknown;
  subcategories?: unknown;
};

const iconKeywords: Array<[IconName, string[]]> = [
  ["electronics", ["electronic", "phone", "computer", "tech", "gadget", "consumer"]],
  ["fashion", ["fashion", "mode", "clothing", "wear", "shoes", "shoe"]],
  ["apparel", ["apparel", "textile", "dress", "shirt", "hoodie", "jeans"]],
  ["accessories", ["accessor", "bag", "watch", "jewelry", "eyewear", "luggage"]],
  ["home", ["home", "garden", "maison", "furniture", "decor"]],
  ["kitchen", ["kitchen", "cuisine", "cook", "appliance"]],
  ["beauty", ["beauty", "beaute", "cosmetic", "hair", "skin"]],
  ["auto", ["auto", "car", "vehicle", "moto", "parts", "pieces"]],
  ["pets", ["pet", "animal", "dog", "cat"]],
  ["industry", ["industry", "industrial", "factory", "machine", "tools"]],
  ["health", ["health", "sante", "wellness", "medical"]],
  ["sports", ["sport", "fitness", "outdoor", "entertainment"]],
];

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isRecord(value: unknown): value is CategoryRecord {
  return Boolean(value) && typeof value === "object";
}

function slugFromName(name: string) {
  return normalize(name)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanOrUndefined(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeCategoryNode(value: unknown): Category | null {
  if (!isRecord(value)) {
    return null;
  }

  const name = stringOrNull(value.name);

  if (!name) {
    return null;
  }

  const slug = stringOrNull(value.slug) ?? slugFromName(name);
  const nested =
    Array.isArray(value.children)
      ? value.children
      : Array.isArray(value.subcategories)
        ? value.subcategories
        : [];

  return {
    id: stringOrNull(value.id) ?? slug,
    name,
    slug,
    children: nested
      .map((child) => normalizeCategoryNode(child))
      .filter((child): child is Category => Boolean(child)),
    description: stringOrNull(value.description),
    iconKey: stringOrNull(value.iconKey),
    imageUrl: stringOrNull(value.imageUrl) ?? stringOrNull(value.image),
    isActive: booleanOrUndefined(value.isActive),
    parentId: stringOrNull(value.parentId),
    sortOrder: numberOrNull(value.sortOrder),
  };
}

function responseArray(response: unknown) {
  if (Array.isArray(response)) {
    return response;
  }

  if (!isRecord(response)) {
    return [];
  }

  if (Array.isArray(response.data)) {
    return response.data;
  }

  if (Array.isArray(response.categories)) {
    return response.categories;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  return [];
}

function normalizeCategoryTree(response: unknown) {
  const categories = responseArray(response)
    .map((category) => normalizeCategoryNode(category))
    .filter((category): category is Category => Boolean(category));

  const byId = new Map(categories.map((category) => [category.id, category]));
  const hasFlatChildren = categories.some(
    (category) => category.parentId && byId.has(category.parentId),
  );

  if (!hasFlatChildren) {
    return categories;
  }

  for (const category of categories) {
    if (category.parentId && byId.has(category.parentId)) {
      const parent = byId.get(category.parentId)!;
      const existing = parent.children ?? [];

      if (!existing.some((child) => child.id === category.id)) {
        parent.children = [...existing, category];
      }
    }
  }

  return categories.filter(
    (category) => !category.parentId || !byId.has(category.parentId),
  );
}

function iconNameFor(category: Category): IconName {
  const explicit = normalize(category.iconKey ?? "");
  const haystack = normalize(`${category.slug} ${category.name}`);

  for (const [icon, keywords] of iconKeywords) {
    if (explicit === icon || keywords.some((keyword) => explicit.includes(keyword))) {
      return icon;
    }

    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return icon;
    }
  }

  return "default";
}

function categoryHref(category: Category, parent?: Category) {
  if (parent) {
    return `/categories/${encodeURIComponent(parent.slug)}/${encodeURIComponent(category.slug)}`;
  }

  return `/categories/${encodeURIComponent(category.slug)}`;
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.name.localeCompare(right.name);
  });
}

function CategoryGlyph({ category }: { category: Category }) {
  const iconName = iconNameFor(category);

  const paths: Record<IconName, ReactNode> = {
    accessories: (
      <>
        <path d="M8 7h8l2 13H6L8 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </>
    ),
    apparel: <path d="M8 5 5 7l2 4 2-1v9h6v-9l2 1 2-4-3-2-2 2h-4L8 5Z" />,
    auto: (
      <>
        <path d="m5 13 2-5h10l2 5" />
        <path d="M4 13h16v5H4v-5Z" />
        <path d="M7 18v1" />
        <path d="M17 18v1" />
      </>
    ),
    beauty: (
      <>
        <path d="M8 21h8" />
        <path d="M12 3c3 3 4 5 4 8a4 4 0 0 1-8 0c0-3 1-5 4-8Z" />
      </>
    ),
    default: (
      <>
        <path d="M4 7h7v7H4V7Z" />
        <path d="M13 5h7v7h-7V5Z" />
        <path d="M6 16h7v5H6v-5Z" />
        <path d="M15 14h5v5h-5v-5Z" />
      </>
    ),
    electronics: (
      <>
        <path d="M7 4h10v16H7V4Z" />
        <path d="M10 17h4" />
      </>
    ),
    fashion: (
      <>
        <path d="M6 20 9 4h6l3 16" />
        <path d="M8 11h8" />
        <path d="M10 4c.5 2 3.5 2 4 0" />
      </>
    ),
    health: (
      <>
        <path d="M12 21s7-4.5 7-11a4 4 0 0 0-7-2 4 4 0 0 0-7 2c0 6.5 7 11 7 11Z" />
        <path d="M9 12h6" />
        <path d="M12 9v6" />
      </>
    ),
    home: (
      <>
        <path d="m4 11 8-7 8 7" />
        <path d="M6 10v10h12V10" />
        <path d="M10 20v-6h4v6" />
      </>
    ),
    industry: (
      <>
        <path d="M4 20V9l5 3V9l5 3V6h6v14H4Z" />
        <path d="M8 16h1" />
        <path d="M12 16h1" />
        <path d="M16 16h1" />
      </>
    ),
    kitchen: (
      <>
        <path d="M6 3v8" />
        <path d="M4 3v4a2 2 0 1 0 4 0V3" />
        <path d="M6 11v10" />
        <path d="M15 3v18" />
        <path d="M15 3c3 2 4 5 2 8h-2" />
      </>
    ),
    pets: (
      <>
        <circle cx="7" cy="8" r="2" />
        <circle cx="12" cy="6" r="2" />
        <circle cx="17" cy="8" r="2" />
        <path d="M7 17c1-4 9-4 10 0 1.2 4-11.2 4-10 0Z" />
      </>
    ),
    sports: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M7 7c3 2 7 2 10 0" />
        <path d="M7 17c3-2 7-2 10 0" />
        <path d="M12 4v16" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[iconName]}
    </svg>
  );
}

function CategoryMedia({ category }: { category: Category }) {
  if (category.imageUrl) {
    return (
      <img
        alt=""
        className="h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        src={category.imageUrl}
      />
    );
  }

  return <CategoryGlyph category={category} />;
}

function SubcategoryThumbnail({ category }: { category: Category }) {
  if (category.imageUrl) {
    return (
      <span className="grid h-[92px] w-[92px] place-items-center overflow-hidden rounded-full border border-[#60A5FA]/20 bg-[radial-gradient(circle_at_35%_25%,rgba(96,165,250,0.20),rgba(37,99,255,0.07)_62%,rgba(2,12,32,0.22))] shadow-[0_10px_20px_rgba(1,8,24,0.24),0_0_14px_rgba(37,99,255,0.10)] sm:h-[104px] sm:w-[104px]">
        <img
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.06]"
          decoding="async"
          loading="lazy"
          src={category.imageUrl}
        />
      </span>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="grid h-[92px] w-[92px] place-items-center rounded-full border border-[#60A5FA]/22 bg-[radial-gradient(circle_at_34%_24%,rgba(96,165,250,0.24),rgba(37,99,255,0.10)_62%,rgba(8,31,72,0.74))] text-[#E8F3FF] shadow-[0_10px_20px_rgba(1,8,24,0.24),0_0_14px_rgba(37,99,255,0.12)] sm:h-[104px] sm:w-[104px]">
        <CategoryGlyph category={category} />
      </span>
    </div>
  );
}

export function CategoryMegaMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef(new Map<string, HTMLElement>());

  const mainCategories = useMemo(
    () =>
      sortCategories(
        categories.filter((category) => category.isActive !== false && !category.parentId),
      ).map((category) => ({
        ...category,
        children: sortCategories(
          (category.children ?? []).filter((child) => child.isActive !== false),
        ),
      })),
    [categories],
  );

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function loadCategories(force = false) {
    if (isLoadingRef.current || (!force && hasLoadedRef.current)) {
      return;
    }

    isLoadingRef.current = true;
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await (api.categories.tree() as Promise<unknown>);
      const tree = normalizeCategoryTree(response);

      if (!isMountedRef.current) {
        return;
      }

      setCategories(tree);
      setActiveId(tree[0]?.id ?? null);
      hasLoadedRef.current = true;
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      console.warn("Could not load category tree.", error);
      setCategories([]);
      setLoadError("Impossible de charger les categories pour le moment.");
      hasLoadedRef.current = false;
    } finally {
      isLoadingRef.current = false;

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      void loadCategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!mainCategories.length) {
      setActiveId(null);
      return;
    }

    if (!activeId || !mainCategories.some((category) => category.id === activeId)) {
      setActiveId(mainCategories[0].id);
    }
  }, [activeId, mainCategories]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  function scrollToCategory(categoryId: string) {
    const section = sectionRefs.current.get(categoryId);
    const panel = panelRef.current;

    setActiveId(categoryId);

    if (!section || !panel) {
      return;
    }

    const top = section.offsetTop - panel.offsetTop;
    panel.scrollTo({ top, behavior: "smooth" });
  }

  function handlePanelScroll() {
    const panel = panelRef.current;

    if (!panel) {
      return;
    }

    const panelTop = panel.getBoundingClientRect().top;
    let nextActive = activeId;

    for (const category of mainCategories) {
      const section = sectionRefs.current.get(category.id);

      if (!section) {
        continue;
      }

      if (section.getBoundingClientRect().top - panelTop <= 120) {
        nextActive = category.id;
      }
    }

    if (nextActive && nextActive !== activeId) {
      setActiveId(nextActive);
    }
  }

  return (
    <>
      <button
        className="inline-flex h-11 w-fit items-center gap-2 rounded-full border border-white/[0.10] bg-[#0F172A] px-4 text-sm font-black text-[#CBD5E1] shadow-[0_0_24px_rgba(37,99,255,0.10)] transition hover:border-[#2563FF]/50 hover:bg-[#111827] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2563FF]/15 text-[#93C5FD]">
          <span className="h-2 w-2 rounded-full border border-current" />
        </span>
        Toutes les catégories
      </button>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#03112B]/54 px-3 py-4 backdrop-blur-sm sm:px-5"
          onMouseDown={() => setIsOpen(false)}
          role="dialog"
        >
          <div
            className="flex h-[calc(100dvh-2rem)] w-full max-w-[1460px] flex-col overflow-hidden rounded-[24px] border border-[#3B82F6]/16 bg-[linear-gradient(160deg,#071A3A_0%,#0A2250_48%,#102955_100%)] text-white shadow-[0_24px_64px_rgba(1,8,24,0.42),0_0_24px_rgba(37,99,255,0.08)] lg:h-[80vh] lg:max-h-[820px] lg:min-h-[560px] lg:w-[82vw]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#3B82F6]/16 bg-[#081D43]/34 px-5 py-4 sm:px-7">
              <div>
                <h2 className="text-lg font-bold leading-none text-white sm:text-xl">
                  Toutes les catégories
                </h2>
                <p className="mt-1.5 text-sm text-[#C6DBFF]">
                  Explorez les univers Carthage Market
                </p>
              </div>
              <button
                aria-label="Fermer le menu des catégories"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#3B82F6]/34 bg-[#0B2D66]/74 text-xl leading-none text-[#E8F3FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_14px_rgba(37,99,255,0.16)] transition hover:border-[#93C5FD]/70 hover:bg-[#163F83] hover:text-white"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="grid min-h-0 flex-1 bg-[linear-gradient(170deg,rgba(8,24,58,0.50),rgba(12,34,78,0.66))] lg:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="max-h-[35vh] overflow-y-auto border-b border-[#60A5FA]/14 bg-[linear-gradient(180deg,rgba(7,27,64,0.90),rgba(7,24,57,0.96))] p-3.5 [scrollbar-color:#5B8DFF_rgba(11,31,67,0.55)] [scrollbar-width:thin] lg:max-h-none lg:min-h-0 lg:border-b-0 lg:border-r lg:border-r-[#60A5FA]/16 lg:p-4 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#5B8DFF]/46 [&::-webkit-scrollbar-track]:bg-[#071A3A]/50 [&::-webkit-scrollbar]:w-1.5">
                {isLoading ? (
                  <div className="rounded-2xl border border-[#60A5FA]/24 bg-[#11326C]/72 p-4 text-sm font-bold text-[#D5E8FF]">
                    Chargement des catégories...
                  </div>
                ) : null}

                {!isLoading && loadError ? (
                  <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">
                    <p className="font-black">{loadError}</p>
                    <button
                      className="mt-3 h-9 rounded-full border border-red-200/20 bg-white/10 px-3 text-xs font-black text-white transition hover:bg-white/15"
                      onClick={() => void loadCategories(true)}
                      type="button"
                    >
                      Réessayer
                    </button>
                  </div>
                ) : null}

                {!isLoading && !loadError && mainCategories.length === 0 ? (
                  <div className="rounded-2xl border border-[#60A5FA]/24 bg-[#11326C]/64 p-4 text-sm font-bold text-[#D5E8FF]">
                    Aucune catégorie active pour le moment.
                  </div>
                ) : null}

                <div className="space-y-2">
                  {mainCategories.map((category) => (
                    <button
                      className={cn(
                        "group flex min-h-[64px] w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-left transition duration-200",
                        activeId === category.id
                          ? "border-[#5EA1FF]/42 bg-[linear-gradient(120deg,rgba(37,99,255,0.44),rgba(43,91,216,0.36))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_18px_rgba(37,99,255,0.28)]"
                          : "border-transparent text-[#DBEAFE] hover:border-[#60A5FA]/24 hover:bg-[#163A73]/42 hover:text-white hover:shadow-[0_0_18px_rgba(37,99,255,0.12)]",
                      )}
                      key={category.id}
                      onClick={() => scrollToCategory(category.id)}
                      onFocus={() => setActiveId(category.id)}
                      onMouseEnter={() => scrollToCategory(category.id)}
                      type="button"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[12px] border border-[#60A5FA]/26 bg-[#14356F]/64 text-[#D6E8FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                        <CategoryMedia category={category} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-tight sm:text-[15px]">
                          {category.name}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-[#BCD6FF]">
                          {category.children?.length ?? 0} sous-catégorie
                          {(category.children?.length ?? 0) > 1 ? "s" : ""}
                        </span>
                      </span>
                      <span className="text-xl leading-none text-[#9BC7FF]/70 transition group-hover:text-[#E3F0FF]">
                        ›
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              <section
                className="min-h-0 flex-1 overflow-y-auto p-4 scroll-smooth [scrollbar-color:#6B94F8_rgba(8,24,58,0.58)] [scrollbar-width:thin] sm:p-5 lg:p-6 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#6B94F8]/52 [&::-webkit-scrollbar-track]:bg-[#081A3A]/56 [&::-webkit-scrollbar]:w-1.5"
                onScroll={handlePanelScroll}
                ref={panelRef}
              >
                {mainCategories.length ? (
                  <div className="space-y-4 pb-3">
                    {mainCategories.map((category) => (
                      <section
                        className="rounded-[18px] border border-[#4C7FF7]/20 bg-[linear-gradient(145deg,rgba(13,38,84,0.88),rgba(12,34,75,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_12px_26px_rgba(0,0,0,0.20)]"
                        key={category.id}
                        ref={(node) => {
                          if (node) {
                            sectionRefs.current.set(category.id, node);
                          } else {
                            sectionRefs.current.delete(category.id);
                          }
                        }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[16px] border border-[#60A5FA]/28 bg-[#123B7B]/68 text-[#DBEAFF] shadow-[0_0_16px_rgba(37,99,255,0.12)]">
                              <CategoryMedia category={category} />
                            </span>
                            <div className="min-w-0">
                              <h3 className="break-words text-xl font-semibold leading-tight text-white sm:text-2xl">
                                {category.name}
                              </h3>
                              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#BCD2F7]">
                                {category.description ||
                                  "Découvrez les sous-catégories disponibles dans cet univers."}
                              </p>
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[#C9DEFF]">
                                <span className="rounded-full border border-[#60A5FA]/24 bg-[#183D79]/34 px-2.5 py-1">
                                  {(category.children?.length ?? 0)} sous-catégorie
                                  {(category.children?.length ?? 0) > 1 ? "s" : ""}
                                </span>
                                <span className="rounded-full border border-[#60A5FA]/18 bg-[#183D79]/24 px-2.5 py-1">
                                  Produits authentiques
                                </span>
                                <span className="rounded-full border border-[#60A5FA]/18 bg-[#183D79]/24 px-2.5 py-1">
                                  Garantie & support
                                </span>
                              </div>
                            </div>
                          </div>
                          <Link
                            className="inline-flex h-9 items-center rounded-full border border-[#75A9FF]/28 bg-[#2463FF]/24 px-3.5 text-xs font-semibold text-[#ECF4FF] shadow-[0_0_14px_rgba(37,99,255,0.16)] transition hover:border-[#BFDBFE]/70 hover:bg-[#2463FF]/42"
                            href={categoryHref(category)}
                            onClick={() => setIsOpen(false)}
                          >
                            Voir la catégorie
                          </Link>
                        </div>

                        {category.children?.length ? (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {category.children.map((child) => (
                              <Link
                                className="group flex aspect-square flex-col overflow-hidden rounded-[12px] border border-[#5C8CF8]/20 bg-[radial-gradient(circle_at_50%_28%,rgba(65,111,255,0.13),transparent_46%),linear-gradient(165deg,rgba(18,48,96,0.82),rgba(11,32,71,0.94))] shadow-[0_10px_20px_rgba(1,10,26,0.25)] transition duration-200 hover:-translate-y-0.5 hover:border-[#A8C7FF]/46 hover:shadow-[0_16px_30px_rgba(37,99,255,0.16)]"
                                href={categoryHref(child, category)}
                                key={child.id}
                                onClick={() => setIsOpen(false)}
                              >
                                <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_48%,rgba(37,99,255,0.16),transparent_62%)]">
                                  <SubcategoryThumbnail category={child} />
                                </div>
                                <div className="flex items-end justify-between gap-2.5 px-3.5 pb-3.5 pt-1.5">
                                  <div className="min-w-0">
                                    <p className="truncate text-base font-semibold leading-tight text-white">
                                      {child.name}
                                    </p>
                                    <p className="mt-1 truncate text-xs font-medium text-[#BFD5F9]">
                                      Explorer les produits
                                    </p>
                                  </div>
                                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#82B6FF]/30 bg-[#1C4591]/48 text-base leading-none text-[#E1EEFF] transition group-hover:border-[#D7E8FF]/58 group-hover:bg-[#2E63D7]/58">
                                    ›
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-2xl border border-dashed border-[#60A5FA]/24 bg-[#163A73]/38 px-4 py-4 text-sm font-medium text-[#D3E6FF]">
                            Aucune sous-catégorie pour le moment
                          </div>
                        )}
                      </section>
                    ))}

                    <div className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-[#5F8DFF]/20 bg-[linear-gradient(120deg,rgba(13,45,97,0.62),rgba(13,39,86,0.76))] px-5 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(37,99,255,0.08)]">
                      <div>
                        <p className="text-sm font-semibold text-white sm:text-base">
                          Vous ne trouvez pas ce que vous cherchez ?
                        </p>
                        <p className="mt-1 text-xs font-medium text-[#BCD5FA] sm:text-sm">
                          Utilisez notre recherche pour découvrir encore plus de produits.
                        </p>
                      </div>
                      <Link
                        className="inline-flex h-10 items-center rounded-[12px] border border-[#8DBBFF]/34 bg-[#2563FF] px-5 text-sm font-semibold text-white shadow-[0_0_18px_rgba(37,99,255,0.32)] transition hover:bg-[#3B82F6]"
                        href="/search"
                        onClick={() => setIsOpen(false)}
                      >
                        Rechercher un produit
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#60A5FA]/26 bg-[#153669]/52 p-6 text-center text-sm font-semibold text-[#D0E3FF]">
                    Aucune catégorie active pour le moment.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
