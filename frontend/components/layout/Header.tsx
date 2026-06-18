"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthNav } from "@/components/auth/AuthNav";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { categoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

const marketplaceLinks = [
  { href: "/#produits", label: "Produits" },
  { href: "/#offres", label: "Offres" },
];

export function Header() {
  const pathname = usePathname();
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  const categoryRequestRef = useRef<Promise<void> | null>(null);
  const hasLoadedCategoriesRef = useRef(false);
  const isHeaderMountedRef = useRef(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [hasCategoryError, setHasCategoryError] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const mainCategories = useMemo(
    () => activeRootCategories(categories),
    [categories],
  );
  const activeCategory =
    mainCategories.find((category) => category.id === activeCategoryId) ??
    mainCategories[0] ??
    null;

  useEffect(() => {
    return () => {
      isHeaderMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setIsCategoryMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (
      !isCategoryMenuOpen ||
      hasLoadedCategoriesRef.current ||
      categoryRequestRef.current
    ) {
      return;
    }

    setIsCategoryLoading(true);
    setHasCategoryError(false);

    categoryRequestRef.current = api.categories
      .tree()
      .then((categoryTree) => {
        if (!isHeaderMountedRef.current) {
          return;
        }

        hasLoadedCategoriesRef.current = true;
        setCategories(categoryTree);
        const firstActiveCategory = activeRootCategories(categoryTree)[0];
        setActiveCategoryId(firstActiveCategory?.id ?? null);
      })
      .catch(() => {
        if (isHeaderMountedRef.current) {
          setCategories([]);
          setActiveCategoryId(null);
          setHasCategoryError(true);
        }
      })
      .finally(() => {
        categoryRequestRef.current = null;

        if (isHeaderMountedRef.current) {
          setIsCategoryLoading(false);
        }
      });
  }, [isCategoryMenuOpen]);

  useEffect(() => {
    if (!isCategoryMenuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        categoryMenuRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsCategoryMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCategoryMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCategoryMenuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-market-100/80 bg-white/95 shadow-[0_14px_38px_rgba(255,106,45,0.10)] backdrop-blur-xl">
      <Container className="max-w-[1680px] py-2.5">
        <div className="flex min-w-0 flex-col gap-2 lg:min-h-[52px] lg:flex-row lg:items-center lg:gap-3">
          <Link
            className="flex w-fit shrink-0 items-center rounded-lg outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
            href="/"
          >
            <Image
              alt="FireShop"
              className="h-9 w-auto object-contain sm:h-10 lg:h-9 xl:h-10"
              height={48}
              priority
              src="/branding/fireshop-logo.png"
              width={160}
            />
          </Link>

          <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center lg:flex-nowrap">
            <div className="relative shrink-0" ref={categoryMenuRef}>
              <button
                aria-expanded={isCategoryMenuOpen}
                aria-haspopup="dialog"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-market-200/90 bg-gradient-to-b from-white to-market-50/95 px-3 text-sm font-semibold text-market-900 shadow-[0_7px_18px_rgba(255,106,45,0.12)] transition-all hover:-translate-y-px hover:border-market-300 hover:bg-market-50 hover:shadow-[0_10px_24px_rgba(255,106,45,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2 xl:px-3.5"
                onClick={() => setIsCategoryMenuOpen((isOpen) => !isOpen)}
                type="button"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-market-600 to-market-800 text-white shadow-sm shadow-market-500/25">
                  <CategoryGlyph />
                </span>
                <span className="hidden whitespace-nowrap md:inline">
                  Toutes les categories
                </span>
              </button>

              {isCategoryMenuOpen ? (
                <GlobalCategoryMenu
                  activeCategory={activeCategory}
                  hasCategoryError={hasCategoryError}
                  isLoading={isCategoryLoading}
                  mainCategories={mainCategories}
                  onCategorySelect={setActiveCategoryId}
                  onClose={() => setIsCategoryMenuOpen(false)}
                />
              ) : null}
            </div>

            <form
              action="/"
              className="flex h-11 min-w-[200px] flex-1 items-center gap-1.5 rounded-full border border-market-200/80 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.065)] transition focus-within:border-market-500 focus-within:shadow-[0_12px_30px_rgba(255,106,45,0.14)] focus-within:ring-2 focus-within:ring-market-600/15 lg:max-w-[740px] 2xl:max-w-[860px]"
              role="search"
            >
              <span className="ml-2 hidden h-6 w-6 shrink-0 place-items-center rounded-full bg-market-50 text-market-800 ring-1 ring-market-100 sm:grid">
                <SearchGlyph />
              </span>
              <Input
                aria-label="Rechercher des produits"
                className="h-8 rounded-full border-transparent bg-transparent px-2 text-sm font-medium text-slate-800 shadow-none placeholder:font-normal placeholder:text-slate-400 focus:border-transparent focus:ring-0 sm:px-3"
                name="q"
                placeholder="Rechercher produits, categories, vendeurs..."
                type="search"
              />
              <Button className="h-8 shrink-0 rounded-full bg-[linear-gradient(135deg,#ffb331_0%,#ff6a2d_48%,#ff3d30_100%)] px-4 text-sm font-bold shadow-[0_8px_18px_rgba(255,85,47,0.28)] hover:-translate-y-px hover:bg-[linear-gradient(135deg,#ffc04a_0%,#ff7436_46%,#ff4939_100%)] hover:shadow-[0_12px_24px_rgba(255,85,47,0.34)]" type="submit">
                <ButtonSearchGlyph />
                Rechercher
              </Button>
            </form>
          </div>

          <nav
            aria-label="Marketplace"
            className="flex shrink-0 items-center gap-1 overflow-x-auto text-sm font-semibold text-slate-700 lg:overflow-visible"
          >
            {marketplaceLinks.map((link) => (
              <Link
                className="whitespace-nowrap rounded-full px-3 py-2 transition-all hover:bg-market-50 hover:text-market-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <AuthNav />
        </div>
      </Container>
    </header>
  );
}

function GlobalCategoryMenu({
  activeCategory,
  hasCategoryError,
  isLoading,
  mainCategories,
  onCategorySelect,
  onClose,
}: {
  activeCategory: Category | null;
  hasCategoryError: boolean;
  isLoading: boolean;
  mainCategories: Category[];
  onCategorySelect: (categoryId: string) => void;
  onClose: () => void;
}) {
  const activeChildren = activeCategory
    ? activeCategory.children?.filter(isActiveCategory) ?? []
    : [];

  return (
    <div
      className="absolute left-0 top-full z-50 mt-3 w-[calc(100vw-2rem)] max-w-[960px] overflow-hidden rounded-2xl border border-market-100 bg-white shadow-[0_26px_70px_rgba(15,23,42,0.18)] ring-1 ring-white lg:w-[900px] xl:w-[960px]"
      role="dialog"
    >
      <div className="flex items-center justify-between gap-3 border-b border-market-100 bg-gradient-to-r from-market-50 to-white px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-950">Toutes les categories</p>
          <p className="text-xs text-slate-500">
            Explorez les rayons FireShop depuis n'importe quelle page.
          </p>
        </div>
        <button
          aria-label="Fermer le menu des categories"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-market-200 hover:bg-market-50 hover:text-market-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25"
          onClick={onClose}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>

      {isLoading ? (
        <div className="grid min-h-72 place-items-center p-8 text-sm font-medium text-slate-500">
          Chargement des cat&eacute;gories...
        </div>
      ) : hasCategoryError ? (
        <div className="grid min-h-72 place-items-center p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Impossible de charger les cat&eacute;gories
          </p>
        </div>
      ) : mainCategories.length === 0 ? (
        <div className="grid min-h-72 place-items-center p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Aucune cat&eacute;gorie disponible
          </p>
        </div>
      ) : (
        <div className="grid max-h-[72vh] md:grid-cols-[300px_minmax(0,1fr)]">
          <nav className="max-h-[72vh] overflow-y-auto border-b border-slate-100 bg-slate-50/70 p-2 md:border-b-0 md:border-r">
            {mainCategories.map((category) => {
              const isActive = category.id === activeCategory?.id;

              return (
                <button
                  className={cn(
                    "group grid w-full grid-cols-[34px_minmax(0,1fr)_18px] items-center gap-2 rounded-xl px-2.5 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-white hover:text-market-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-market-600/25",
                    isActive && "bg-white text-market-900 shadow-sm ring-1 ring-market-100",
                  )}
                  key={category.id}
                  onClick={() => onCategorySelect(category.id)}
                  onFocus={() => onCategorySelect(category.id)}
                  onMouseEnter={() => onCategorySelect(category.id)}
                  type="button"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-xs font-bold text-market-900 ring-1 ring-market-100 group-hover:bg-market-50">
                    {categoryInitial(category)}
                  </span>
                  <span className="line-clamp-1 break-words" dir="auto">
                    {category.name}
                  </span>
                  <ChevronRightIcon />
                </button>
              );
            })}
          </nav>

          <div className="max-h-[72vh] overflow-y-auto p-4">
            {activeCategory ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-gradient-to-br from-market-50 to-white p-4 ring-1 ring-market-100">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-market-800">
                      Rayon selectionne
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-950" dir="auto">
                      {activeCategory.name}
                    </h3>
                    {activeCategory.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500" dir="auto">
                        {activeCategory.description}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    className="inline-flex h-9 items-center rounded-full bg-market-700 px-4 text-sm font-bold text-white shadow-sm shadow-market-700/20 transition hover:bg-market-800"
                    href={categoryRoute(activeCategory.slug)}
                    onClick={onClose}
                  >
                    Voir les produits
                  </Link>
                </div>

                {activeChildren.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-bold text-slate-950">
                      Sous-categories
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {activeChildren.map((category) => (
                        <Link
                          className="group flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-market-200 hover:bg-market-50 hover:text-market-900 hover:shadow-[0_12px_24px_rgba(255,106,45,0.12)]"
                          href={categoryRoute(activeCategory.slug, category.slug)}
                          key={category.id}
                          onClick={onClose}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-market-50 text-xs font-bold text-market-900 ring-1 ring-market-100">
                            {categoryInitial(category)}
                          </span>
                          <span className="line-clamp-2 break-words" dir="auto">
                            {category.name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-market-200 bg-market-50/50 p-5 text-sm text-slate-600">
                    Cette categorie n'a pas encore de sous-categories publiques.
                    Elle reste disponible pour explorer les produits existants.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function activeRootCategories(categories: Category[]) {
  return categories
    .filter(isActiveCategory)
    .map((category) => ({
      ...category,
      children: category.children?.filter(isActiveCategory) ?? [],
    }));
}

function isActiveCategory(category: Category) {
  return category.isActive !== false;
}

function categoryInitial(category: Pick<Category, "name">) {
  return category.name.trim().slice(0, 2).toUpperCase();
}

function ButtonSearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M8.3 2.4 9 4.2l1.8.7L9 5.6l-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8ZM5.9 13.1a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8ZM10 10l3.1 3.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-slate-400 transition group-hover:text-market-700"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m6 3.5 4.5 4.5L6 12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        d="m5 5 10 10M15 5 5 15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m11.2 11.2 2.3 2.3M7.2 12.2a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function CategoryGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="M2.5 3.5h4M9.5 3.5h4M2.5 8h4M9.5 8h4M2.5 12.5h4M9.5 12.5h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}
