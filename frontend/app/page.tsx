import { Container } from "@/components/ui/Container";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Category, Product } from "@/types";

const heroImages = [
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
  "https://images.unsplash.com/photo-1503602642458-232111445657",
];

const offerImages = [
  "https://images.unsplash.com/photo-1585386959984-a4155224a1ad",
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab",
  "https://images.unsplash.com/photo-1523381210434-271e8be1f52b",
  "https://images.unsplash.com/photo-1485968579580-b6d095142e6e",
  "https://images.unsplash.com/photo-1560343090-f0409e92791a",
  "https://images.unsplash.com/photo-1511497584788-876760111969",
];

const promoImage =
  "https://images.unsplash.com/photo-1616627456335-5d9f4f0958f4";
const quickCustomImage =
  "https://images.unsplash.com/photo-1612196808214-b8e1d6145a05";

async function getHomeData() {
  const [categoriesResult, productsResult] = await Promise.allSettled([
    api.categories.tree(),
    api.products.list(),
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

function imageFor(product: Product, fallback: string) {
  return product.images?.[0]?.url ?? fallback;
}

function seededIndex(seed: string, length: number) {
  return (
    seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % length
  );
}

export default async function HomePage() {
  const { categories, products } = await getHomeData();
  const featuredProducts = products.slice(0, 4);
  const bestOffers = products.slice(0, 6);
  const rankedProducts = products.slice(0, 4);
  const newArrivals = [...products]
    .sort((a, b) => {
      const aDate = new Date(a.createdAt ?? 0).getTime();
      const bDate = new Date(b.createdAt ?? 0).getTime();
      return bDate - aDate;
    })
    .slice(0, 4);
  const mainCategories = categories
    .filter((category) => !category.parentId)
    .slice(0, 10);

  return (
    <main className="bg-surface-50 pb-10">
      <section className="border-b border-slate-200 bg-white">
        <Container className="space-y-4 py-4">
          <nav className="flex items-center gap-5 overflow-x-auto text-lg font-bold text-slate-900">
            <a
              className="whitespace-nowrap border-b-2 border-market-700 pb-2 text-market-800"
              href="/"
            >
              AI Mode
            </a>
            <a className="whitespace-nowrap pb-2 hover:text-market-800" href="#produits">
              Produits
            </a>
            <a className="whitespace-nowrap pb-2 hover:text-market-800" href="#fabricants">
              Fabricants
            </a>
            <a className="whitespace-nowrap pb-2 hover:text-market-800" href="#offres">
              Mondial
            </a>
          </nav>

          <div className="rounded-lg border border-market-300 bg-white p-4 shadow-soft">
            <form action="/" className="space-y-3" role="search">
              <div className="grid gap-2 sm:grid-cols-[220px_minmax(0,1fr)_140px]">
                <select
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-market-600 focus:ring-2 focus:ring-market-600/20"
                  defaultValue="all"
                  name="category"
                >
                  <option value="all">Sous-vetements pour femme</option>
                  <option value="electronics">Electronique</option>
                  <option value="fashion">Mode</option>
                  <option value="home">Maison</option>
                </select>
                <input
                  className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-market-600 focus:ring-2 focus:ring-market-600/20"
                  name="q"
                  placeholder="Recherche par produit, fournisseur ou tendance"
                  type="search"
                />
                <button className="h-11 rounded-lg bg-market-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-800">
                  Rechercher
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                <input
                  className="h-4 w-4 rounded border-slate-300 text-market-700"
                  type="checkbox"
                />
                Recherche par image
              </label>
            </form>
          </div>
        </Container>
      </section>

      <Container className="space-y-5 py-5">
        <section className="grid gap-3 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-sm font-bold text-slate-900">Categories pour vous</p>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {mainCategories.map((category) => (
                <li key={category.id}>
                  <a
                    className="flex items-center justify-between rounded-md px-2 py-2 transition-colors hover:bg-slate-100"
                    href={`/?category=${category.slug}`}
                  >
                    <span>{category.name}</span>
                    <span className="text-slate-400">{">"}</span>
                  </a>
                </li>
              ))}
            </ul>
          </aside>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {featuredProducts.map((product) => (
                <a
                  className="rounded-lg border border-slate-200 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-market-200 hover:shadow-soft"
                  href={`/product/${product.slug}`}
                  key={product.id}
                >
                  <p className="mb-2 line-clamp-1 text-sm font-semibold text-slate-700">
                    Recherches...
                  </p>
                  <div className="aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                    <img
                      alt={product.images?.[0]?.altText ?? product.name}
                      className="h-full w-full object-cover"
                      src={imageFor(
                        product,
                        heroImages[seededIndex(product.id, heroImages.length)],
                      )}
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-900">
                    {product.name}
                  </p>
                </a>
              ))}
            </div>

            <article className="rounded-lg bg-gradient-to-br from-market-100 to-market-50 p-4">
              <p className="text-xl font-bold leading-tight text-market-900">
                Echantillon personnalise en 3 jours
              </p>
              <p className="mt-1 text-xl font-bold leading-tight text-market-900">
                Echantillon personnalise en 7 jours
              </p>
              <div className="mt-4 aspect-[4/3] overflow-hidden rounded-md bg-white/70">
                <img alt="Featured collection" className="h-full w-full object-cover" src={promoImage} />
              </div>
              <a
                className="mt-3 inline-flex h-10 items-center rounded-lg bg-market-700 px-4 text-sm font-semibold text-white hover:bg-market-800"
                href="/vendor"
              >
                En savoir plus
              </a>
            </article>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg bg-market-900 p-4 text-white lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold">Customization rapide</h2>
            <p className="text-sm text-market-100">
              Realisez vos idees de produits personnalises rapidement et facilement.
            </p>
            <a
              className="inline-flex h-10 items-center rounded-lg bg-white px-4 text-sm font-semibold text-market-900"
              href="#fabricants"
            >
              Decouvrir des maintenant
            </a>
            <div className="aspect-[4/3] overflow-hidden rounded-md border border-white/20">
              <img alt="Quick customization" className="h-full w-full object-cover" src={quickCustomImage} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {bestOffers.slice(0, 5).map((product, index) => (
              <a className="rounded-md bg-white p-2 text-slate-900" href={`/product/${product.slug}`} key={product.id}>
                <div className="aspect-square overflow-hidden rounded-md bg-slate-100">
                  <img
                    alt={product.images?.[0]?.altText ?? product.name}
                    className="h-full w-full object-cover"
                    src={imageFor(product, offerImages[index % offerImages.length])}
                  />
                </div>
                <p className="mt-2 line-clamp-1 text-xs font-semibold">{product.name}</p>
                <p className="text-sm font-bold text-market-800">
                  {formatTnd(product.offerPrice ?? product.price)}
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" id="offres">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Meilleures offres</h2>
              <p className="text-sm text-slate-500">
                Trouvez les meilleurs prix sur LocalMarket.
              </p>
            </div>
            <a className="text-sm font-semibold text-slate-700 hover:text-market-800" href="/orders">
              En savoir plus {" >"}
            </a>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {bestOffers.map((product, index) => (
              <a
                className="rounded-md border border-slate-200 bg-white p-2 transition-all hover:-translate-y-0.5 hover:border-market-200 hover:shadow-soft"
                href={`/product/${product.slug}`}
                key={product.id}
              >
                <div className="aspect-square overflow-hidden rounded-md bg-slate-100">
                  <img
                    alt={product.images?.[0]?.altText ?? product.name}
                    className="h-full w-full object-cover"
                    src={imageFor(product, offerImages[index % offerImages.length])}
                  />
                </div>
                <p className="mt-2 line-clamp-1 text-xs font-semibold text-slate-900">
                  {product.name}
                </p>
                <p className="text-sm font-bold text-market-800">
                  {formatTnd(product.offerPrice ?? product.price)}
                </p>
                <p className="text-xs text-slate-500">MOQ: 2</p>
              </a>
            ))}
          </div>
        </section>

        <section className="grid gap-3 lg:grid-cols-2" id="produits">
          <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-950">
                Produits au top du classement
              </h2>
              <a className="text-sm font-semibold text-slate-700 hover:text-market-800" href="/orders">
                En savoir plus {" >"}
              </a>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {rankedProducts.map((product, index) => (
                <a className="rounded-md border border-slate-200 p-2" href={`/product/${product.slug}`} key={product.id}>
                  <div className="aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                    <img
                      alt={product.images?.[0]?.altText ?? product.name}
                      className="h-full w-full object-cover"
                      src={imageFor(product, heroImages[index % heroImages.length])}
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {product.vendor?.storeName ?? "Vente a la Une"}
                  </p>
                </a>
              ))}
            </div>
          </article>

          <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4" id="fabricants">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-2xl font-bold text-slate-950">Nouveautes</h2>
              <a className="text-sm font-semibold text-slate-700 hover:text-market-800" href="/orders">
                En savoir plus {" >"}
              </a>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {newArrivals.map((product, index) => (
                <a className="rounded-md border border-slate-200 p-2" href={`/product/${product.slug}`} key={product.id}>
                  <div className="aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                    <img
                      alt={product.images?.[0]?.altText ?? product.name}
                      className="h-full w-full object-cover"
                      src={imageFor(
                        product,
                        heroImages[(index + 1) % heroImages.length],
                      )}
                    />
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-semibold text-slate-900">
                    {product.name}
                  </p>
                  <p className="text-sm font-bold text-market-800">
                    {formatTnd(product.offerPrice ?? product.price)}
                  </p>
                </a>
              ))}
            </div>
          </article>
        </section>
      </Container>
    </main>
  );
}
