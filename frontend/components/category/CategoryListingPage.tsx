import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeProductImage } from "@/components/product/HomeProductImage";
import { Container } from "@/components/ui/Container";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Category, Product } from "@/types";

export type CategoryListingSearchParams = {
  inStock?: string | string[];
  maxPrice?: string | string[];
  minPrice?: string | string[];
  sort?: string | string[];
};

type CategoryListingPageProps = {
  categorySlug: string;
  searchParams?: CategoryListingSearchParams;
  subcategorySlug?: string;
};

type CategoryContext = {
  activeCategory: Category;
  category: Category;
  siblings: Category[];
  subcategory?: Category;
};

type FilterState = {
  inStock: boolean;
  maxPrice: number | null;
  minPrice: number | null;
  sort: "newest" | "price-asc" | "price-desc";
};

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

function categoryPath(categorySlug: string, subcategorySlug?: string) {
  const category = encodeURIComponent(categorySlug);

  if (!subcategorySlug) {
    return `/categories/${category}`;
  }

  return `/categories/${category}/${encodeURIComponent(subcategorySlug)}`;
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function numberParam(value: string | string[] | undefined) {
  const parsed = Number(firstParam(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseFilters(searchParams?: CategoryListingSearchParams): FilterState {
  const sort = firstParam(searchParams?.sort);

  return {
    inStock: firstParam(searchParams?.inStock) === "1",
    maxPrice: numberParam(searchParams?.maxPrice),
    minPrice: numberParam(searchParams?.minPrice),
    sort:
      sort === "price-asc" || sort === "price-desc" || sort === "newest"
        ? sort
        : "newest",
  };
}

function productPrice(product: Product) {
  return Number(product.offerPrice ?? product.price) || 0;
}

function productDate(product: Product) {
  return new Date(product.createdAt ?? 0).getTime();
}

function filterProducts(products: Product[], filters: FilterState) {
  return products
    .filter((product) => product.status === "PUBLISHED")
    .filter((product) => !filters.inStock || product.stockQuantity > 0)
    .filter((product) => filters.minPrice === null || productPrice(product) >= filters.minPrice)
    .filter((product) => filters.maxPrice === null || productPrice(product) <= filters.maxPrice)
    .sort((left, right) => {
      if (filters.sort === "price-asc") {
        return productPrice(left) - productPrice(right);
      }

      if (filters.sort === "price-desc") {
        return productPrice(right) - productPrice(left);
      }

      return productDate(right) - productDate(left);
    });
}

function uniqueProducts(products: Product[]) {
  const seen = new Map<string, Product>();

  for (const product of products) {
    seen.set(product.id, product);
  }

  return Array.from(seen.values());
}

async function getCategoryTree() {
  try {
    return await api.categories.tree();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

async function getCategoryContext(
  categorySlug: string,
  subcategorySlug?: string,
): Promise<CategoryContext> {
  const categories = sortCategories(await getCategoryTree()).map((category) => ({
    ...category,
    children: sortCategories(
      (category.children ?? []).filter((child) => child.isActive !== false),
    ),
  }));
  const category = categories.find(
    (item) => item.slug === categorySlug && item.isActive !== false && !item.parentId,
  );

  if (!category) {
    notFound();
  }

  if (!subcategorySlug) {
    return {
      activeCategory: category,
      category,
      siblings: category.children ?? [],
    };
  }

  const subcategory = (category.children ?? []).find(
    (item) => item.slug === subcategorySlug && item.isActive !== false,
  );

  if (!subcategory) {
    notFound();
  }

  return {
    activeCategory: subcategory,
    category,
    siblings: category.children ?? [],
    subcategory,
  };
}

async function getProductsForContext(context: CategoryContext) {
  const slugs = context.subcategory
    ? [context.subcategory.slug]
    : [context.category.slug, ...context.siblings.map((category) => category.slug)];

  const results = await Promise.allSettled(
    slugs.map((slug) => api.products.list({ category: slug, limit: 100 })),
  );

  return uniqueProducts(
    results.flatMap((result) => (result.status === "fulfilled" ? result.value : [])),
  );
}

export async function getCategoryListingMetadata({
  categorySlug,
  subcategorySlug,
}: Pick<CategoryListingPageProps, "categorySlug" | "subcategorySlug">) {
  const context = await getCategoryContext(categorySlug, subcategorySlug);
  const title = context.subcategory
    ? `${context.subcategory.name} | ${context.category.name} | Carthage Market`
    : `${context.category.name} | Carthage Market`;

  return {
    title,
    description:
      context.activeCategory.description ??
      `Explorez ${context.activeCategory.name} sur Carthage Market.`,
  };
}

export async function CategoryListingPage({
  categorySlug,
  searchParams,
  subcategorySlug,
}: CategoryListingPageProps) {
  const context = await getCategoryContext(categorySlug, subcategorySlug);
  const filters = parseFilters(searchParams);
  const products = filterProducts(await getProductsForContext(context), filters);
  const basePath = categoryPath(categorySlug, subcategorySlug);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(37,99,255,0.24),transparent_28%),radial-gradient(circle_at_86%_0%,rgba(59,130,246,0.14),transparent_24%)]" />
        <Container className="relative max-w-[1500px] py-6 sm:py-8">
          <Breadcrumb context={context} />
          <div className="mt-5 rounded-3xl border border-white/[0.08] bg-[#020817]/82 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.36)] sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-4xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#60A5FA]">
                  Carthage Market
                </p>
                <h1 className="mt-3 break-words text-3xl font-black leading-tight text-white sm:text-5xl">
                  {context.activeCategory.name}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#CBD5E1] sm:text-base">
                  {context.activeCategory.description ??
                    "Explorez les produits publies dans cet univers et trouvez les fournisseurs qui correspondent a vos besoins."}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[380px]">
                <HeroStat label="Produits" value={products.length} />
                <HeroStat label="Sous-categories" value={context.siblings.length} />
                <HeroStat label="Paiement" value="COD" />
              </div>
            </div>
          </div>
        </Container>
      </section>

      <Container className="max-w-[1500px] space-y-5 py-6">
        {context.siblings.length > 0 ? (
          <SubcategoryRail context={context} />
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <CategoryFilters basePath={basePath} filters={filters} />

          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-[#0F172A]/80 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Produits</h2>
                <p className="mt-1 text-sm text-[#94A3B8]">
                  {products.length} produit{products.length > 1 ? "s" : ""} trouve
                  {products.length > 1 ? "s" : ""}
                </p>
              </div>
              <span className="rounded-full border border-[#2563FF]/30 bg-[#2563FF]/10 px-3 py-2 text-xs font-bold text-[#BFDBFE]">
                {filters.sort === "price-asc"
                  ? "Prix croissant"
                  : filters.sort === "price-desc"
                    ? "Prix decroissant"
                    : "Nouveautes"}
              </span>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                {products.map((product) => (
                  <CategoryProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyCategoryState />
            )}
          </div>
        </section>
      </Container>
    </main>
  );
}

function Breadcrumb({ context }: { context: CategoryContext }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#94A3B8]">
      <Link className="transition hover:text-white" href="/">
        Accueil
      </Link>
      <span>/</span>
      {context.subcategory ? (
        <>
          <Link
            className="transition hover:text-white"
            href={categoryPath(context.category.slug)}
          >
            {context.category.name}
          </Link>
          <span>/</span>
          <span className="text-white">{context.subcategory.name}</span>
        </>
      ) : (
        <span className="text-white">{context.category.name}</span>
      )}
    </nav>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0F172A]/80 p-3">
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-[#94A3B8]">{label}</p>
    </div>
  );
}

function SubcategoryRail({ context }: { context: CategoryContext }) {
  return (
    <section className="rounded-2xl border border-white/[0.08] bg-[#020817]/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-white">
          {context.subcategory ? "Sous-categories liees" : "Sous-categories"}
        </h2>
        {context.subcategory ? (
          <Link
            className="rounded-full border border-[#2563FF]/35 px-3 py-2 text-xs font-bold text-[#BFDBFE] transition hover:bg-[#2563FF]/10 hover:text-white"
            href={categoryPath(context.category.slug)}
          >
            Voir toute la categorie
          </Link>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {context.siblings.map((subcategory) => {
          const isActive = context.subcategory?.id === subcategory.id;

          return (
            <Link
              className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 ${
                isActive
                  ? "border-[#60A5FA]/55 bg-[#2563FF]/18 shadow-[0_0_26px_rgba(37,99,255,0.20)]"
                  : "border-white/[0.08] bg-[#0F172A]/80 hover:border-[#2563FF]/45 hover:bg-[#111827]"
              }`}
              href={categoryPath(context.category.slug, subcategory.slug)}
              key={subcategory.id}
            >
              <p className="line-clamp-1 text-sm font-black text-white">
                {subcategory.name}
              </p>
              <p className="mt-1 text-xs text-[#94A3B8]">Explorer les produits</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CategoryFilters({
  basePath,
  filters,
}: {
  basePath: string;
  filters: FilterState;
}) {
  return (
    <aside className="rounded-2xl border border-white/[0.08] bg-[#0F172A]/82 p-4 lg:sticky lg:top-24 lg:self-start">
      <h2 className="text-lg font-black text-white">Filtres</h2>
      <form action={basePath} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
            Trier
          </span>
          <select
            className="mt-2 h-11 w-full rounded-xl border border-white/[0.10] bg-[#020817] px-3 text-sm font-semibold text-white outline-none transition focus:border-[#2563FF]/70"
            defaultValue={filters.sort}
            name="sort"
          >
            <option value="newest">Nouveautes</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix decroissant</option>
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
              Prix min
            </span>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-white/[0.10] bg-[#020817] px-3 text-sm font-semibold text-white outline-none transition placeholder:text-[#64748B] focus:border-[#2563FF]/70"
              defaultValue={filters.minPrice ?? ""}
              min={0}
              name="minPrice"
              placeholder="0"
              type="number"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#94A3B8]">
              Prix max
            </span>
            <input
              className="mt-2 h-11 w-full rounded-xl border border-white/[0.10] bg-[#020817] px-3 text-sm font-semibold text-white outline-none transition placeholder:text-[#64748B] focus:border-[#2563FF]/70"
              defaultValue={filters.maxPrice ?? ""}
              min={0}
              name="maxPrice"
              placeholder="1000"
              type="number"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#020817]/70 px-3 py-3 text-sm font-semibold text-[#CBD5E1]">
          <input
            className="h-4 w-4 accent-[#2563FF]"
            defaultChecked={filters.inStock}
            name="inStock"
            type="checkbox"
            value="1"
          />
          En stock uniquement
        </label>

        <div className="flex gap-2">
          <button
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_0_26px_rgba(37,99,255,0.28)] transition hover:bg-[#3B82F6]"
            type="submit"
          >
            Appliquer
          </button>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/[0.10] px-4 text-sm font-bold text-[#CBD5E1] transition hover:border-[#2563FF]/50 hover:text-white"
            href={basePath}
          >
            Reset
          </Link>
        </div>
      </form>
    </aside>
  );
}

function CategoryProductCard({ product }: { product: Product }) {
  const image = product.images?.[0];
  const hasOffer = Boolean(product.offerPrice) || product.isOnOffer;
  const displayPrice = product.offerPrice ?? product.price;

  return (
    <Link
      className="group block h-full rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
      href={`/product/${product.slug}`}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F172A]/90 shadow-[0_18px_44px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-[#2563FF]/55 hover:shadow-[0_18px_54px_rgba(37,99,255,0.22)]">
        <div className="relative aspect-square overflow-hidden bg-[#020817]">
          <HomeProductImage
            alt={image?.altText ?? product.name}
            className="transition duration-300 group-hover:scale-[1.04]"
            productName={product.name}
            src={image?.url}
          />
          {hasOffer ? (
            <span className="absolute left-3 top-3 rounded-full bg-[#2563FF] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_0_22px_rgba(37,99,255,0.45)]">
              Offre
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3 className="line-clamp-2 min-h-11 break-words text-[15px] font-black leading-[22px] text-white">
            {product.name}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-[#94A3B8]">
            {product.vendor?.storeName ?? product.category?.name ?? "Carthage Market"}
          </p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <div>
              <p className="text-lg font-black text-white">{formatTnd(displayPrice)}</p>
              {hasOffer ? (
                <p className="text-xs font-medium text-[#64748B] line-through">
                  {formatTnd(product.price)}
                </p>
              ) : null}
            </div>
            <span className="rounded-full border border-[#2563FF]/35 bg-[#2563FF]/10 px-2 py-1 text-[11px] font-bold text-[#93C5FD]">
              COD
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyCategoryState() {
  return (
    <div className="rounded-3xl border border-dashed border-[#2563FF]/30 bg-[#0F172A]/78 px-5 py-14 text-center shadow-[0_0_42px_rgba(37,99,255,0.10)]">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#2563FF]/45 bg-[#2563FF]/10 text-sm font-black text-[#BFDBFE]">
        CM
      </div>
      <h2 className="mt-5 text-2xl font-black text-white">Aucun produit pour le moment</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#94A3B8]">
        Cette catégorie est prête, mais aucun produit n’a encore été publié.
      </p>
      <Link
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[#2563FF] px-5 text-sm font-black text-white shadow-[0_0_26px_rgba(37,99,255,0.28)] transition hover:bg-[#3B82F6]"
        href="/"
      >
        Explorer d’autres catégories
      </Link>
    </div>
  );
}
