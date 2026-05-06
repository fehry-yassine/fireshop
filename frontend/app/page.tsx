import Image from "next/image";
import Link from "next/link";
import { HomeProductImage } from "@/components/product/HomeProductImage";
import { Container } from "@/components/ui/Container";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Category, Product, Vendor } from "@/types";

type HomePageProps = {
  searchParams?: Promise<{
    category?: string | string[];
    q?: string | string[];
  }>;
};

type SectionHeaderProps = {
  actionLabel?: string;
  eyebrow?: string;
  href?: string;
  title: string;
};

type SupplierSummary = {
  id: string;
  productCount: number;
  slug: string;
  storeName: string;
};

async function getHomeData(categorySlug?: string) {
  const [categoriesResult, productsResult] = await Promise.allSettled([
    api.categories.tree(),
    api.products.list({
      ...(categorySlug ? { category: categorySlug } : {}),
      limit: 60,
    }),
  ]);

  return {
    categories:
      categoriesResult.status === "fulfilled"
        ? categoriesResult.value
        : ([] as Category[]),
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

function suppliersFromProducts(products: Product[]): SupplierSummary[] {
  const suppliers = new Map<string, SupplierSummary>();

  for (const product of products) {
    const vendor = product.vendor;

    if (!vendor?.id || !vendor.storeName || !vendor.slug) {
      continue;
    }

    const current = suppliers.get(vendor.id);
    suppliers.set(vendor.id, {
      id: vendor.id,
      productCount: (current?.productCount ?? 0) + 1,
      slug: vendor.slug,
      storeName: vendor.storeName,
    });
  }

  return Array.from(suppliers.values())
    .sort((left, right) => right.productCount - left.productCount)
    .slice(0, 5);
}

function vendorInitials(vendor: Pick<Vendor, "storeName">) {
  return vendor.storeName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function SectionHeader({
  actionLabel = "Voir tout",
  eyebrow,
  href = "/search",
  title,
}: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#3B82F6]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 text-xl font-extrabold tracking-normal text-white">
          {title}
        </h2>
      </div>
      <Link
        className="shrink-0 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#CBD5E1] transition hover:border-[#2563FF]/60 hover:bg-[#2563FF]/10 hover:text-white"
        href={href}
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function ProductImage({ product }: { product: Product }) {
  const image = product.images?.[0];

  return (
    <HomeProductImage
      alt={image?.altText ?? product.name}
      className="transition duration-300 group-hover:scale-[1.04]"
      productName={product.name}
      src={image?.url}
    />
  );
}

function ProductCard({ product }: { product: Product }) {
  const hasOffer = Boolean(product.offerPrice) || product.isOnOffer;
  const displayPrice = product.offerPrice ?? product.price;

  return (
    <Link
      className="group block h-full rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#2563FF]/60"
      href={`/product/${product.slug}`}
    >
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F172A]/90 shadow-[0_18px_44px_rgba(0,0,0,0.24)] transition duration-200 hover:-translate-y-1 hover:border-[#2563FF]/55 hover:shadow-[0_18px_54px_rgba(37,99,255,0.22)]">
        <div className="relative aspect-[1.08] overflow-hidden bg-[#020817]">
          <ProductImage product={product} />
          {hasOffer ? (
            <span className="absolute left-3 top-3 rounded-full bg-[#2563FF] px-2.5 py-1 text-[11px] font-black text-white shadow-[0_0_22px_rgba(37,99,255,0.45)]">
              Offre
            </span>
          ) : null}
          {product.isFeatured ? (
            <span className="absolute right-3 top-3 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
              Sélection
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <h3
            className="line-clamp-2 min-h-11 break-words text-[15px] font-black leading-[22px] text-white"
            dir="auto"
          >
            {product.name}
          </h3>
          <p className="mt-1 truncate text-xs font-medium text-[#94A3B8]" dir="auto">
            {product.vendor?.storeName ?? "Fournisseur vérifié"}
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

function SmallProductCard({ product }: { product: Product }) {
  return (
    <Link
      className="group grid min-h-[96px] grid-cols-[76px_minmax(0,1fr)] gap-3 rounded-xl border border-white/[0.08] bg-[#0F172A]/85 p-2 transition hover:-translate-y-0.5 hover:border-[#2563FF]/50 hover:bg-[#111827]"
      href={`/product/${product.slug}`}
    >
      <div className="aspect-square overflow-hidden rounded-lg bg-[#020817]">
        <ProductImage product={product} />
      </div>
      <div className="flex min-w-0 flex-col">
        <p
          className="line-clamp-2 break-words text-sm font-bold leading-5 text-white group-hover:text-[#BFDBFE]"
          dir="auto"
        >
          {product.name}
        </p>
        <div className="mt-auto">
          <p className="text-sm font-black text-[#93C5FD]">
            {formatTnd(product.offerPrice ?? product.price)}
          </p>
          <p className="truncate text-xs text-[#94A3B8]" dir="auto">
            {product.vendor?.storeName ?? product.category?.name ?? "Carthage Market"}
          </p>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({
  description = "Les produits approuvés et publiés apparaîtront ici automatiquement.",
  label,
}: {
  description?: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#0F172A]/75 px-4 py-8 text-center">
      <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border border-[#2563FF]/40 bg-[#2563FF]/10 text-sm font-black text-[#93C5FD]">
        CM
      </div>
      <p className="mt-3 text-sm font-bold text-white">{label}</p>
      <p className="mt-1 text-sm text-[#94A3B8]">{description}</p>
    </div>
  );
}

function BrandLogo({
  className = "h-10 w-[170px]",
}: {
  className?: string;
}) {
  return (
    <span className={`relative block overflow-hidden rounded-md ${className}`}>
      <Image
        alt="Carthage Market"
        className="object-cover object-left"
        fill
        sizes="220px"
        src="/branding/carthage-market-logo.png"
      />
    </span>
  );
}

function HeroVisual() {
  return (
    <div className="relative aspect-[1.55] w-full max-w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#020817] shadow-[0_0_70px_rgba(37,99,255,0.18)] sm:aspect-[1.85] lg:aspect-auto lg:min-h-[310px]">
      <Image
        alt="Carthage Market growth channels"
        className="object-cover object-center opacity-95"
        fill
        priority
        sizes="(min-width: 1024px) 520px, 100vw"
        src="/branding/carthage-market-hero.png"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,8,23,0.22),rgba(2,8,23,0.02)),radial-gradient(circle_at_52%_48%,rgba(37,99,255,0.18),transparent_34%)]" />
      <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-black text-white backdrop-blur-md">
        Growth channels
      </div>
    </div>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawCategory = Array.isArray(params?.category)
    ? params?.category[0]
    : params?.category;
  const rawQuery = Array.isArray(params?.q) ? params?.q[0] : params?.q;
  const categorySlug = rawCategory && rawCategory !== "all" ? rawCategory : undefined;
  const searchQuery = rawQuery?.trim() ?? "";
  const normalizedQuery = normalizeSearch(searchQuery);

  const { products } = await getHomeData(categorySlug);
  const publishedProducts = products
    .filter((product) => product.status === "PUBLISHED")
    .filter((product) => productMatchesSearch(product, normalizedQuery));

  const trendingProducts = [...publishedProducts]
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
    .slice(0, 6);
  const latestProducts = newestFirst(publishedProducts).slice(0, 4);
  const bestOffers = [...publishedProducts]
    .sort((a, b) => {
      const aOffer = a.offerPrice || a.isOnOffer ? 1 : 0;
      const bOffer = b.offerPrice || b.isOnOffer ? 1 : 0;
      if (aOffer !== bOffer) {
        return bOffer - aOffer;
      }

      return priceNumber(a) - priceNumber(b);
    })
    .slice(0, 4);
  const suppliers = suppliersFromProducts(publishedProducts);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030712] text-white">
      <section className="relative overflow-hidden border-b border-white/[0.08]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(37,99,255,0.22),transparent_28%),radial-gradient(circle_at_78%_16%,rgba(59,130,246,0.16),transparent_26%)]" />
        <Container className="relative max-w-[1680px] py-4 sm:py-6">
          <div className="grid min-w-0 gap-5 rounded-3xl border border-white/[0.08] bg-[#020817]/80 p-4 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur lg:grid-cols-[minmax(0,1fr)_minmax(420px,500px)] lg:p-6">
            <div className="flex min-w-0 flex-col justify-center py-2 sm:min-h-[270px]">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#93C5FD]">
                Carthage Market
              </p>
              <h1 className="mt-3 max-w-4xl break-words text-4xl font-black leading-[1.02] tracking-normal text-white sm:text-5xl lg:text-6xl">
                Build Your Marketplace{" "}
                <span className="block text-[#2563FF] drop-shadow-[0_0_24px_rgba(37,99,255,0.45)] sm:inline">
                  Growth
                </span>
              </h1>
              <p className="mt-4 max-w-[31ch] break-words text-base leading-7 text-[#CBD5E1] sm:max-w-2xl">
                Carthage Market connecte les acheteurs et fournisseurs de Tunisie
                et du monde entier. Trouvez, comparez et commandez en toute
                confiance.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Produits vérifiés", "Fournisseurs de confiance", "Paiements sécurisés"].map(
                  (item) => (
                    <span
                      className="rounded-full border border-[#2563FF]/30 bg-[#2563FF]/10 px-3 py-2 text-xs font-bold text-[#DBEAFE]"
                      key={item}
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <HeroVisual />
          </div>
        </Container>
      </section>

      <Container className="max-w-[1680px] space-y-4 py-5">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <section
              className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#020817]/80 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              id="produits"
            >
              <SectionHeader
                actionLabel="Voir tous les produits"
                eyebrow="Nouveautés sélectionnées"
                href="/search"
                title="Produits tendance"
              />
              {trendingProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
                  {trendingProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  description={
                    categorySlug
                      ? "Cette catégorie est prête, mais aucun produit n’a encore été publié."
                      : undefined
                  }
                  label={
                    categorySlug
                      ? "Aucun produit pour le moment."
                      : "Aucun produit publié pour cette recherche."
                  }
                />
              )}
            </section>

            <section
              className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#020817]/80 p-4"
              id="fournisseurs"
            >
              <SectionHeader
                actionLabel="Voir les fournisseurs"
                eyebrow="Partenaires de confiance"
                href="/search"
                title="Fournisseurs vérifiés"
              />
              {suppliers.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {suppliers.map((supplier) => (
                    <Link
                      className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-[#0F172A]/80 p-3 transition hover:-translate-y-0.5 hover:border-[#2563FF]/50 hover:bg-[#111827]"
                      href={`/search?q=${encodeURIComponent(supplier.storeName)}`}
                      key={supplier.id}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[#2563FF]/30 bg-[#2563FF]/10 text-sm font-black text-[#DBEAFE]">
                        {vendorInitials(supplier)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black text-white">
                          {supplier.storeName}
                        </span>
                        <span className="block text-xs text-[#94A3B8]">
                          {supplier.productCount} produit{supplier.productCount > 1 ? "s" : ""}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState label="Les fournisseurs apparaîtront avec les produits publiés." />
              )}
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <article
                className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0F172A]/80 p-4"
                id="offres"
              >
                <SectionHeader actionLabel="Explorer" href="/search" title="Meilleures offres" />
                <div className="grid gap-2">
                  {bestOffers.length > 0 ? (
                    bestOffers.map((product) => (
                      <SmallProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <EmptyState label="Aucune meilleure offre disponible." />
                  )}
                </div>
              </article>

              <article className="space-y-3 rounded-2xl border border-white/[0.08] bg-[#0F172A]/80 p-4">
                <SectionHeader actionLabel="Découvrir" href="/search" title="Nouveautés" />
                <div className="grid gap-2">
                  {latestProducts.length > 0 ? (
                    latestProducts.map((product) => (
                      <SmallProductCard key={product.id} product={product} />
                    ))
                  ) : (
                    <EmptyState label="Les nouveautés apparaîtront après approbation." />
                  )}
                </div>
              </article>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="relative overflow-hidden rounded-3xl border border-[#2563FF]/30 bg-[#020817] p-5 shadow-[0_0_60px_rgba(37,99,255,0.16)]">
              <div className="absolute -right-16 bottom-0 h-48 w-48 rounded-full bg-[#2563FF]/25 blur-3xl" />
              <BrandLogo className="h-12 w-[190px]" />
              <h2 className="relative mt-7 text-3xl font-black leading-tight text-white">
                Vendez plus. Développez votre business.
              </h2>
              <p className="relative mt-3 text-sm leading-6 text-[#CBD5E1]">
                Accédez à des outils avancés, boostez votre visibilité et gérez
                votre boutique comme un pro.
              </p>
              <ul className="relative mt-5 space-y-3 text-sm font-semibold text-[#DBEAFE]">
                {[
                  "Boutique personnalisée",
                  "Statistiques avancées",
                  "Mise en avant produits",
                  "Support prioritaire",
                ].map((item) => (
                  <li className="flex items-center gap-2" key={item}>
                    <span className="h-2 w-2 rounded-full bg-[#3B82F6]" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                className="relative mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#2563FF] px-4 text-sm font-black text-white shadow-[0_0_30px_rgba(37,99,255,0.35)] transition hover:bg-[#3B82F6]"
                href="/vendor"
              >
                Découvrir Carthage Pro
              </Link>
            </section>

            <section className="rounded-2xl border border-white/[0.08] bg-[#0F172A]/80 p-4">
              <h2 className="text-lg font-black text-white">Découverte rapide</h2>
              <div className="mt-3 grid gap-2">
                {latestProducts.slice(0, 3).map((product) => (
                  <SmallProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="grid gap-3 rounded-2xl border border-white/[0.08] bg-[#0F172A]/80 p-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Paiement sécurisé", "Transactions protégées"],
            ["Livraison rapide", "Partout en Tunisie"],
            ["Qualité garantie", "Produits vérifiés"],
            ["Support dédié", "Équipe à votre écoute"],
            ["Retours faciles", "Sous 7 jours"],
          ].map(([title, subtitle]) => (
            <div
              className="rounded-xl border border-white/[0.06] bg-[#020817]/70 px-4 py-3"
              key={title}
            >
              <p className="text-sm font-black text-white">{title}</p>
              <p className="mt-1 text-xs text-[#94A3B8]">{subtitle}</p>
            </div>
          ))}
        </section>
      </Container>
    </main>
  );
}
