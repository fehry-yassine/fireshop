import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import { Container } from "@/components/ui/Container";
import { api } from "@/lib/api";
import { categoryRoute } from "@/lib/categoryRoutes";
import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types";

export type CategoryListingSearchParams = {
  inStock?: string | string[];
  max?: string | string[];
  min?: string | string[];
  sort?: string | string[];
};

type CategoryListingPageProps = {
  categorySlug: string;
  searchParams?: CategoryListingSearchParams;
  subcategorySlug?: string;
};

type CategoryFilters = {
  inStockOnly: boolean;
  maxPrice?: number;
  minPrice?: number;
  sort: "newest" | "price-asc" | "price-desc";
};

type ProductLoadResult = {
  hasPartialError: boolean;
  products: Product[];
  unavailable: boolean;
};

export async function CategoryListingPage({
  categorySlug,
  searchParams,
  subcategorySlug,
}: CategoryListingPageProps) {
  const treeResult = await getCategoryTree();

  if (treeResult.unavailable) {
    return <CategoryTreeUnavailable />;
  }

  const parentCategory = rootCategories(treeResult.categories).find(
    (category) => category.slug === categorySlug,
  );

  if (!parentCategory) {
    notFound();
  }

  const childCategories = activeChildren(parentCategory);
  const selectedSubcategory = subcategorySlug
    ? childCategories.find((category) => category.slug === subcategorySlug)
    : undefined;

  if (subcategorySlug && !selectedSubcategory) {
    notFound();
  }

  const activeCategory = selectedSubcategory ?? parentCategory;
  const activePath = categoryRoute(
    parentCategory.slug,
    selectedSubcategory?.slug,
  );
  const productCategorySlugs = selectedSubcategory
    ? [selectedSubcategory.slug]
    : [parentCategory.slug, ...childCategories.map((category) => category.slug)];
  const productResult = await getProductsForCategorySlugs(productCategorySlugs);
  const filters = parseFilters(searchParams);
  const filteredProducts = applyFilters(productResult.products, filters);
  const hasActiveFilters =
    filters.inStockOnly ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort !== "newest";
  const emptyCopy = productResult.unavailable
    ? {
        title: "Impossible de charger les produits",
          text: "Les rayons restent disponibles. Reessayez dans un instant pour voir les produits publies.",
        }
    : productResult.products.length === 0
      ? {
          title: "Aucun produit pour le moment",
          text: (
            <>
              Cette cat&eacute;gorie est pr&ecirc;te, mais aucun produit n&rsquo;a
              encore &eacute;t&eacute; publi&eacute;.
            </>
          ),
        }
      : {
          title: "Aucun produit avec ces filtres",
          text: "Essayez une fourchette de prix plus large ou retirez le filtre de stock.",
        };

  return (
    <main className="bg-[#f6f7f9] pb-10">
      <Container className="max-w-[1680px] space-y-4 py-5 sm:py-7">
        <Breadcrumb
          parentCategory={parentCategory}
          selectedSubcategory={selectedSubcategory}
        />

        <section className="overflow-hidden rounded-2xl border border-market-100/80 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.07)]">
          <div className="bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_58%,#fff1e8_100%)] px-4 py-5 sm:px-5 lg:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-market-800">
                  FireShop marketplace
                </p>
                <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {activeCategory.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                  {activeCategory.description ??
                    "Explorez cette categorie FireShop et retrouvez les produits publies par les vendeurs approuves."}
                </p>
              </div>

              <div className="grid gap-2 sm:min-w-[360px] sm:grid-cols-3">
                <Stat label="Produits" value={productResult.products.length} />
                <Stat label="Sous-categories" value={childCategories.length} />
                <Stat label="Paiement" value="COD" />
              </div>
            </div>
          </div>
        </section>

        <RelatedCategories
          childCategories={childCategories}
          parentCategory={parentCategory}
          selectedSubcategory={selectedSubcategory}
        />

        {productResult.unavailable ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            Impossible de charger les produits pour le moment.
          </div>
        ) : productResult.hasPartialError ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Une partie des produits n'a pas pu etre chargee pour le moment.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_260px]">
          <FilterPanel
            activePath={activePath}
            filters={filters}
          />

          <section className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-slate-950">
                  Produits
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredProducts.length} resultat
                  {filteredProducts.length === 1 ? "" : "s"} affiche
                  {filteredProducts.length === 1 ? "" : "s"}
                </p>
              </div>
              {hasActiveFilters ? (
                <Link
                  className="rounded-full border border-market-200 bg-white px-3 py-1.5 text-xs font-bold text-market-900 transition hover:bg-market-50"
                  href={activePath}
                >
                  R&eacute;initialiser
                </Link>
              ) : null}
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyCategoryProducts
                emptyCopy={emptyCopy}
                parentCategory={parentCategory}
                selectedSubcategory={selectedSubcategory}
              />
            )}
          </section>

          <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-market-100 bg-white p-4 shadow-sm shadow-market-100/60">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-market-800">
                FireShop pro
              </p>
              <h2 className="mt-2 text-base font-extrabold text-slate-950">
                Besoin d'un produit precis ?
              </h2>
              <p className="mt-2 text-sm leading-5 text-slate-600">
                Parcourez les rayons actifs ou lancez une recherche pour trouver
                les produits publies disponibles en paiement a la livraison.
              </p>
              <Link
                className="mt-4 inline-flex h-9 items-center rounded-lg bg-market-700 px-4 text-sm font-bold text-white transition hover:bg-market-800"
                href="/search"
              >
                Rechercher
              </Link>
            </div>
          </aside>
        </div>
      </Container>
    </main>
  );
}

function Breadcrumb({
  parentCategory,
  selectedSubcategory,
}: {
  parentCategory: Category;
  selectedSubcategory?: Category;
}) {
  return (
    <nav
      aria-label="Fil d'Ariane"
      className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500"
    >
      <Link className="hover:text-market-800" href="/">
        Accueil
      </Link>
      <span className="text-slate-300">/</span>
      {selectedSubcategory ? (
        <Link
          className="hover:text-market-800"
          href={categoryRoute(parentCategory.slug)}
        >
          {parentCategory.name}
        </Link>
      ) : (
        <span className="text-slate-950">{parentCategory.name}</span>
      )}
      {selectedSubcategory ? (
        <>
          <span className="text-slate-300">/</span>
          <span className="text-slate-950">{selectedSubcategory.name}</span>
        </>
      ) : null}
    </nav>
  );
}

function CategoryTreeUnavailable() {
  return (
    <main className="bg-[#f6f7f9] pb-10">
      <Container className="max-w-[960px] py-8">
        <div className="rounded-2xl border border-market-100 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-extrabold text-slate-950">
            Impossible de charger les cat&eacute;gories
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Revenez dans un instant ou explorez les produits depuis la page
            d'accueil.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-lg bg-market-700 px-4 text-sm font-bold text-white transition hover:bg-market-800"
            href="/"
          >
            Retour accueil
          </Link>
        </div>
      </Container>
    </main>
  );
}

function EmptyCategoryProducts({
  emptyCopy,
  parentCategory,
  selectedSubcategory,
}: {
  emptyCopy: { text: ReactNode; title: string };
  parentCategory: Category;
  selectedSubcategory?: Category;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-market-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-market-50 text-sm font-black text-market-900 ring-1 ring-market-100">
        FS
      </div>
      <p className="text-lg font-extrabold text-slate-950">{emptyCopy.title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {emptyCopy.text}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Link
          className="inline-flex h-10 items-center rounded-lg bg-market-700 px-4 text-sm font-bold text-white transition hover:bg-market-800"
          href="/#categories"
        >
          Explorer d'autres cat&eacute;gories
        </Link>
        {selectedSubcategory ? (
          <Link
            className="inline-flex h-10 items-center rounded-lg border border-market-200 bg-white px-4 text-sm font-bold text-market-900 transition hover:bg-market-50"
            href={categoryRoute(parentCategory.slug)}
          >
            Voir toute la cat&eacute;gorie
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function FilterPanel({
  activePath,
  filters,
}: {
  activePath: string;
  filters: CategoryFilters;
}) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <form
        action={activePath}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-sm font-extrabold text-slate-950">Filtres</h2>
          <Link
            className="text-xs font-bold text-market-800 hover:text-market-900"
            href={activePath}
          >
            Effacer
          </Link>
        </div>

        <div className="mt-3 space-y-3">
          <label className="block text-xs font-bold uppercase tracking-[0.10em] text-slate-500">
            Tri
            <select
              className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none transition focus:border-market-400 focus:ring-2 focus:ring-market-600/15"
              defaultValue={filters.sort}
              name="sort"
            >
              <option value="newest">Plus recents</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix decroissant</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <label className="block text-xs font-bold uppercase tracking-[0.10em] text-slate-500">
              Prix min
              <input
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none transition focus:border-market-400 focus:ring-2 focus:ring-market-600/15"
                defaultValue={filters.minPrice?.toString() ?? ""}
                min="0"
                name="min"
                placeholder="0"
                type="number"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-[0.10em] text-slate-500">
              Prix max
              <input
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none transition focus:border-market-400 focus:ring-2 focus:ring-market-600/15"
                defaultValue={filters.maxPrice?.toString() ?? ""}
                min="0"
                name="max"
                placeholder="500"
                type="number"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-sm font-semibold text-slate-700">
            <input
              className="h-4 w-4 rounded border-slate-300 text-market-700 focus:ring-market-600/25"
              defaultChecked={filters.inStockOnly}
              name="inStock"
              type="checkbox"
              value="1"
            />
            En stock uniquement
          </label>

          <button
            className="h-10 w-full rounded-lg bg-market-700 px-4 text-sm font-bold text-white transition hover:bg-market-800"
            type="submit"
          >
            Appliquer
          </button>
        </div>
      </form>
    </aside>
  );
}

function RelatedCategories({
  childCategories,
  parentCategory,
  selectedSubcategory,
}: {
  childCategories: Category[];
  parentCategory: Category;
  selectedSubcategory?: Category;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-slate-950">
            {selectedSubcategory
              ? `Sous-categories de ${parentCategory.name}`
              : "Sous-categories"}
          </h2>
          <p className="text-xs text-slate-500">
            Les rayons restent visibles meme avant l'arrivee des produits.
          </p>
        </div>
        {selectedSubcategory ? (
          <Link
            className="rounded-full border border-market-200 bg-market-50 px-3 py-1.5 text-xs font-bold text-market-900 transition hover:bg-market-100"
            href={categoryRoute(parentCategory.slug)}
          >
            Voir toute la cat&eacute;gorie
          </Link>
        ) : null}
      </div>

      {childCategories.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {childCategories.map((category) => {
            const isActive = category.slug === selectedSubcategory?.slug;

            return (
              <Link
                className={cn(
                  "min-w-max rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:border-market-200 hover:bg-market-50 hover:text-market-900",
                  isActive &&
                    "border-market-200 bg-market-50 text-market-900 ring-1 ring-market-100",
                )}
                href={categoryRoute(parentCategory.slug, category.slug)}
                key={category.id}
              >
                {category.name}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
          Cette cat&eacute;gorie n'a pas encore de sous-cat&eacute;gories publiques.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-market-100 bg-white/85 px-3 py-2 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-extrabold text-market-900">{value}</p>
    </div>
  );
}

async function getCategoryTree() {
  try {
    return {
      categories: await api.categories.tree(),
      unavailable: false,
    };
  } catch {
    return {
      categories: [] as Category[],
      unavailable: true,
    };
  }
}

async function getProductsForCategorySlugs(
  categorySlugs: string[],
): Promise<ProductLoadResult> {
  const uniqueSlugs = Array.from(new Set(categorySlugs));
  const results = await Promise.allSettled(
    uniqueSlugs.map((category) => api.products.list({ category, limit: 100 })),
  );
  const products = uniqueProducts(
    results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  ).filter((product) => product.status === "PUBLISHED");
  const rejectedCount = results.filter(
    (result) => result.status === "rejected",
  ).length;

  return {
    hasPartialError: rejectedCount > 0 && rejectedCount < results.length,
    products,
    unavailable: results.length > 0 && rejectedCount === results.length,
  };
}

function applyFilters(products: Product[], filters: CategoryFilters) {
  const filtered = products.filter((product) => {
    const price = priceNumber(product);

    if (filters.inStockOnly && product.stockQuantity <= 0) {
      return false;
    }

    if (filters.minPrice !== undefined && price < filters.minPrice) {
      return false;
    }

    if (filters.maxPrice !== undefined && price > filters.maxPrice) {
      return false;
    }

    return true;
  });

  return sortProducts(filtered, filters.sort);
}

function sortProducts(products: Product[], sort: CategoryFilters["sort"]) {
  return [...products].sort((a, b) => {
    if (sort === "price-asc") {
      return priceNumber(a) - priceNumber(b);
    }

    if (sort === "price-desc") {
      return priceNumber(b) - priceNumber(a);
    }

    return dateNumber(b.createdAt) - dateNumber(a.createdAt);
  });
}

function parseFilters(
  searchParams: CategoryListingSearchParams | undefined,
): CategoryFilters {
  const sort = firstValue(searchParams?.sort);
  const minPrice = positiveNumber(firstValue(searchParams?.min));
  const maxPrice = positiveNumber(firstValue(searchParams?.max));

  return {
    inStockOnly: firstValue(searchParams?.inStock) === "1",
    maxPrice,
    minPrice,
    sort:
      sort === "price-asc" || sort === "price-desc" || sort === "newest"
        ? sort
        : "newest",
  };
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function priceNumber(product: Product) {
  return Number(product.offerPrice ?? product.price) || 0;
}

function dateNumber(value: string | undefined) {
  return value ? new Date(value).getTime() || 0 : 0;
}

function rootCategories(categories: Category[]) {
  return categories
    .filter(isActiveCategory)
    .map((category) => ({
      ...category,
      children: activeChildren(category),
    }));
}

function activeChildren(category: Category) {
  return category.children?.filter(isActiveCategory) ?? [];
}

function isActiveCategory(category: Category) {
  return category.isActive !== false;
}

function uniqueProducts(products: Product[]) {
  const seen = new Set<string>();

  return products.filter((product) => {
    if (seen.has(product.id)) {
      return false;
    }

    seen.add(product.id);
    return true;
  });
}
