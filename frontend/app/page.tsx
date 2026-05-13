import Link from "next/link";
import { HomeDiscoveryHero } from "@/components/home/HomeDiscoveryHero";
import { HomeProductImage } from "@/components/product/HomeProductImage";
import { Container } from "@/components/ui/Container";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Category, Product } from "@/types";

type HomePageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    q?: string | string[];
  }>;
};

type SectionHeaderProps = {
  href?: string;
  subtitle?: string;
  title: string;
};

async function getHomeData(categorySlug?: string) {
  const [categoriesResult, productsResult, homepagePromosResult] =
    await Promise.allSettled([
      api.categories.tree(),
      api.products.list({
        ...(categorySlug ? { category: categorySlug } : {}),
        limit: 60,
      }),
      api.homepagePromos.list(),
    ]);

  return {
    categories:
      categoriesResult.status === "fulfilled"
        ? categoriesResult.value
        : ([] as Category[]),
    homepagePromos:
      homepagePromosResult.status === "fulfilled"
        ? homepagePromosResult.value
        : { promoCards: [], heroSlides: [] },
    products:
      productsResult.status === "fulfilled"
        ? productsResult.value
        : ([] as Product[]),
  };
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function activeChildren(category?: Category) {
  return category?.children?.filter((child) => child.isActive !== false) ?? [];
}

function productMatchesSearch(product: Product, query: string) {
  if (!query) {
    return true;
  }

  const haystack = normalizeSearch(
    [
      product.name,
      product.description,
      product.category?.name,
      product.vendor?.storeName,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return haystack.includes(query);
}

function newestFirst(products: Product[]) {
  return [...products].sort((a, b) => {
    const aDate = new Date(a.createdAt ?? 0).getTime();
    const bDate = new Date(b.createdAt ?? 0).getTime();
    return bDate - aDate;
  });
}

function priceNumber(product: Product) {
  return Number(product.offerPrice ?? product.price) || 0;
}

function SectionHeader({
  href = "/search",
  subtitle,
  title,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 pb-2.5">
      <div className="min-w-0">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-950">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-sm leading-5 text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <Link
        className="mt-1 shrink-0 rounded-full px-2 py-1 text-xs font-bold text-slate-500 transition hover:bg-market-50 hover:text-market-800 sm:text-sm"
        href={href}
      >
        En savoir plus {">"}
      </Link>
    </div>
  );
}

function ProductImage({ product }: { product: Product }) {
  const image = product.images?.[0];

  return (
    <HomeProductImage
      alt={image?.altText ?? product.name}
      className="transition duration-300 group-hover:scale-[1.03]"
      productName={product.name}
      src={image?.url}
    />
  );
}

function CompactProductCard({
  product,
  tone = "light",
}: {
  product: Product;
  tone?: "light" | "dark";
}) {
  const hasOffer = Boolean(product.offerPrice) || product.isOnOffer;

  return (
    <Link
      className="group block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
      href={`/product/${product.slug}`}
    >
      <article
        className={
          tone === "dark"
            ? "flex h-full flex-col rounded-lg bg-white p-2 text-slate-950 shadow-[0_10px_24px_rgba(15,23,42,0.10)] ring-1 ring-white/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.16)]"
            : "flex h-full flex-col rounded-lg bg-white p-2 shadow-[0_8px_20px_rgba(15,23,42,0.055)] ring-1 ring-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(15,23,42,0.10)] hover:ring-market-200/80"
        }
      >
        <div className="aspect-square overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-900/5">
          <ProductImage product={product} />
        </div>
        <h3
          className="mt-2 line-clamp-2 min-h-9 break-words text-[13px] font-semibold leading-[18px] text-slate-950"
          dir="auto"
        >
          {product.name}
        </h3>
        <div className="mt-auto pt-2">
          <p className="text-sm font-extrabold leading-5 text-market-800">
            {formatTnd(product.offerPrice ?? product.price)}
          </p>
          {hasOffer ? (
            <p className="text-xs font-medium leading-4 text-slate-400 line-through">
              {formatTnd(product.price)}
            </p>
          ) : null}
          <p className="mt-1 truncate text-xs text-slate-500" dir="auto">
            {product.vendor?.storeName ?? product.category?.name ?? "FireShop"}
          </p>
        </div>
      </article>
    </Link>
  );
}

function MiniProductCard({ product }: { product: Product }) {
  return (
    <Link
      className="group grid min-h-[92px] grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-lg bg-white p-2 shadow-[0_8px_20px_rgba(15,23,42,0.055)] ring-1 ring-slate-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(15,23,42,0.10)] hover:ring-market-200/80"
      href={`/product/${product.slug}`}
    >
      <div className="aspect-square overflow-hidden rounded-md bg-slate-50 ring-1 ring-slate-900/5">
        <ProductImage product={product} />
      </div>
      <div className="flex min-w-0 flex-col">
        <p
          className="line-clamp-2 break-words text-[13px] font-semibold leading-[18px] text-slate-950 group-hover:text-market-800"
          dir="auto"
        >
          {product.name}
        </p>
        <div className="mt-auto pt-1">
          <p className="text-sm font-extrabold leading-5 text-market-800">
            {formatTnd(product.offerPrice ?? product.price)}
          </p>
          <p className="truncate text-xs text-slate-500" dir="auto">
            {product.vendor?.storeName ?? product.category?.name ?? "Vendeur"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyProducts({ label }: { label: string }) {
  return (
    <div className="rounded-xl bg-white/90 px-4 py-7 text-center shadow-[0_8px_22px_rgba(15,23,42,0.05)] ring-1 ring-slate-900/5">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-2xl bg-market-50 text-xs font-black text-market-800 shadow-sm ring-1 ring-market-100">
        FS
      </div>
      <p className="text-sm font-semibold text-slate-950">{label}</p>
      <p className="mt-1 text-sm text-slate-500">
        Les produits approuves et publies apparaitront ici automatiquement.
      </p>
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawCategory = Array.isArray(params?.category)
    ? params?.category[0]
    : params?.category;
  const rawQuery = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const categorySlug =
    rawCategory && rawCategory !== "all" ? rawCategory : undefined;
  const searchQuery = rawQuery?.trim() ?? "";
  const normalizedQuery = normalizeSearch(searchQuery);

  const { categories, homepagePromos, products } = await getHomeData(categorySlug);
  const mainCategories = categories
    .filter((category) => !category.parentId && category.isActive !== false)
    .map((category) => ({
      ...category,
      children: activeChildren(category),
    }));
  const publishedProducts = products
    .filter((product) => product.status === "PUBLISHED")
    .filter((product) => productMatchesSearch(product, normalizedQuery));

  const recentProducts = newestFirst(publishedProducts).slice(0, 6);
  const trendProducts = publishedProducts.slice(0, 8);
  const bestOffers = [...publishedProducts]
    .sort((a, b) => {
      const aOffer = a.offerPrice || a.isOnOffer ? 1 : 0;
      const bOffer = b.offerPrice || b.isOnOffer ? 1 : 0;
      if (aOffer !== bOffer) {
        return bOffer - aOffer;
      }

      return priceNumber(a) - priceNumber(b);
    })
    .slice(0, 8);
  const rankedProducts = [...publishedProducts]
    .sort((a, b) => {
      const featuredScore = Number(b.isFeatured) - Number(a.isFeatured);
      if (featuredScore !== 0) {
        return featuredScore;
      }

      return b.stockQuantity - a.stockQuantity;
    })
    .slice(0, 4);
  const newArrivals = newestFirst(publishedProducts).slice(0, 4);
  return (
    <main className="bg-[#f5f6f8] pb-8">
      <Container className="max-w-[1680px] space-y-4 py-4">
        <HomeDiscoveryHero
          activeCategorySlug={categorySlug}
          categories={mainCategories}
          heroSlides={homepagePromos.heroSlides}
          promoCards={homepagePromos.promoCards}
        />

        <section
          className="space-y-3 rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 sm:p-4"
          id="offres"
        >
          <SectionHeader
            href="/search"
            subtitle="Des produits publies avec prix clairs et paiement a la livraison."
            title="Meilleures offres"
          />
          <div className="grid grid-cols-2 items-stretch gap-2 md:grid-cols-3 xl:grid-cols-6 2xl:grid-cols-8">
            {bestOffers.length > 0 ? (
              bestOffers.map((product) => (
                <CompactProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-full">
                <EmptyProducts label="Aucune meilleure offre disponible." />
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2" id="produits">
          <article className="space-y-3 rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 sm:p-4">
            <SectionHeader
              href="/search"
              subtitle="Une selection compacte pour continuer la decouverte."
              title="Produits au top"
            />
            <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
              {rankedProducts.length > 0 ? (
                rankedProducts.map((product) => (
                  <MiniProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="sm:col-span-2">
                  <EmptyProducts label="Le classement sera genere avec les produits publies." />
                </div>
              )}
            </div>
          </article>

          <article className="space-y-3 rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 sm:p-4">
            <SectionHeader
              href="/search"
              subtitle="Les produits recemment publies par les vendeurs."
              title="Nouveautes"
            />
            <div className="grid auto-rows-fr gap-2 sm:grid-cols-2">
              {newArrivals.length > 0 ? (
                newArrivals.map((product) => (
                  <MiniProductCard key={product.id} product={product} />
                ))
              ) : (
                <div className="sm:col-span-2">
                  <EmptyProducts label="Les nouveautes apparaitront apres approbation admin." />
                </div>
              )}
            </div>
          </article>
        </section>
      </Container>
    </main>
  );
}
