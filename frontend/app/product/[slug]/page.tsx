import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartPanel } from "@/components/product/AddToCartPanel";
import { ProductDetailImage } from "@/components/product/ProductDetailImage";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Product } from "@/types";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

async function getProduct(slug: string) {
  try {
    return await api.products.getBySlug(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    notFound();
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  return {
    title: `${product.name} | FireShop`,
    description: product.description,
  };
}

export default async function ProductDetailsPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  const image = product.images?.[0];
  const hasOffer = Boolean(product.offerPrice) || product.isOnOffer;
  const displayPrice = product.offerPrice ?? product.price;
  const stockLabel = getStockLabel(product);

  return (
    <main className="bg-[#f5f6f8]">
      <Container className="py-4 sm:py-6 lg:py-7">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,820px)_420px] xl:justify-center">
          <section className="space-y-4">
            <ProductDetailImage
              alt={image?.altText ?? product.name}
              imageUrl={image?.url}
              productName={product.name}
            />

            <Card className="shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-3 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="h-8 w-1 rounded-full bg-market-600" />
                  <h2 className="text-lg font-extrabold text-slate-950">
                    Description du produit
                  </h2>
                </div>
                <p className="whitespace-pre-line text-sm leading-7 text-slate-600 sm:text-base">
                  {product.description}
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-3 sm:p-6">
                <h2 className="text-base font-extrabold text-slate-950">
                  Informations de livraison
                </h2>
                <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  <DeliveryFact title="Paiement" value="A la livraison" />
                  <DeliveryFact title="Confirmation" value="Avant expedition" />
                  <DeliveryFact title="Disponibilite" value="Selon le vendeur" />
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card className="shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
              <CardContent className="space-y-5 sm:p-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {hasOffer ? <Badge tone="warning">Offre</Badge> : null}
                    <Badge tone={product.stockQuantity > 0 ? "success" : "neutral"}>
                      {stockLabel}
                    </Badge>
                    <Badge tone="neutral">COD</Badge>
                  </div>
                  <h1 className="text-2xl font-extrabold leading-tight text-slate-950 sm:text-3xl">
                    {product.name}
                  </h1>
                  <div className="rounded-lg bg-market-50 px-4 py-3 ring-1 ring-market-100">
                    <p className="text-3xl font-black leading-none text-market-800">
                      {formatTnd(displayPrice)}
                    </p>
                    {hasOffer ? (
                      <p className="mt-1 text-sm font-medium text-slate-400 line-through">
                        {formatTnd(product.price)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-2 border-y border-slate-200 py-4 text-sm">
                  <DetailRow label="Categorie" value={product.category?.name ?? "Marketplace"} />
                  <DetailRow label="Vendeur" value={product.vendor?.storeName ?? "Vendeur local"} />
                  <DetailRow label="Stock disponible" value={`${product.stockQuantity} disponible`} />
                </div>

                <div className="space-y-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-950">
                      Commander ce produit
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Choisissez la quantite puis ajoutez le produit au panier.
                    </p>
                  </div>
                  <AddToCartPanel
                    productId={product.id}
                    stockQuantity={product.stockQuantity}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <CardContent className="space-y-4 sm:p-6">
                <h2 className="text-base font-extrabold text-slate-950">
                  Protection acheteur
                </h2>
                <ul className="grid gap-2 text-sm text-slate-600">
                  <TrustItem text="Paiement a la livraison" />
                  <TrustItem text="Vendeur local" />
                  <TrustItem text="Stock verifie" />
                  <TrustItem text="Commande suivie" />
                </ul>
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[11px] font-black text-emerald-700">
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            d="M3.5 8.2 6.6 11.3 12.8 4.7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      </span>
      <span className="font-medium">{text}</span>
    </li>
  );
}

function DeliveryFact({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-slate-900/5">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      <p className="mt-1 font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function getStockLabel(product: Product) {
  if (product.stockQuantity <= 0) {
    return "Rupture de stock";
  }

  if (product.stockQuantity <= 5) {
    return "Stock limite";
  }

  return "En stock";
}

