import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartPanel } from "@/components/product/AddToCartPanel";
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
    <main>
      <Container className="py-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white sm:aspect-[4/3]">
              {image?.url ? (
                <img
                  alt={image.altText ?? product.name}
                  className="h-full w-full object-contain"
                  src={image.url}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-100 p-8 text-center">
                  <span className="text-lg font-semibold text-slate-500">{product.name}</span>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="space-y-3">
                <h2 className="text-lg font-bold text-slate-950">Description</h2>
                <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                  {product.description}
                </p>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardContent className="space-y-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {hasOffer ? <Badge tone="warning">Offer</Badge> : null}
                    <Badge tone={product.stockQuantity > 0 ? "success" : "neutral"}>
                      {stockLabel}
                    </Badge>
                  </div>
                  <h1 className="text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                    {product.name}
                  </h1>
                  <div>
                    <p className="text-3xl font-bold text-slate-950">
                      {formatTnd(displayPrice)}
                    </p>
                    {hasOffer ? (
                      <p className="text-sm text-slate-400 line-through">
                        {formatTnd(product.price)}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 border-y border-slate-200 py-4 text-sm">
                  <DetailRow label="Category" value={product.category?.name ?? "Marketplace"} />
                  <DetailRow label="Vendor" value={product.vendor?.storeName ?? "Local vendor"} />
                  <DetailRow label="Stock" value={`${product.stockQuantity} available`} />
                </div>

                <AddToCartPanel
                  productId={product.id}
                  stockQuantity={product.stockQuantity}
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <h2 className="text-sm font-bold text-slate-950">Buyer protection</h2>
                <ul className="space-y-2 text-sm text-slate-600">
                  <TrustItem text="Cash on delivery" />
                  <TrustItem text="Local vendor" />
                  <TrustItem text="Stock verified" />
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
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span>{text}</span>
    </li>
  );
}

function getStockLabel(product: Product) {
  if (product.stockQuantity <= 0) {
    return "Out of stock";
  }

  if (product.stockQuantity <= 5) {
    return "Low stock";
  }

  return "In stock";
}

