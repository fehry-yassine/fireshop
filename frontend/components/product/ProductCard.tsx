import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { formatTnd } from "@/lib/format";
import type { Product } from "@/types";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images?.[0];
  const hasOffer = Boolean(product.offerPrice) || product.isOnOffer;
  const displayPrice = product.offerPrice ?? product.price;

  return (
    <Link
      className="group block h-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-market-600/25 focus-visible:ring-offset-2"
      href={`/product/${product.slug}`}
    >
      <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-0.5 group-hover:border-market-200 group-hover:shadow-lift">
        <div className="relative flex aspect-square items-center justify-center bg-slate-100">
          {image?.url ? (
            <img
              alt={image.altText ?? product.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              src={image.url}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 p-4">
              <span className="line-clamp-3 text-center text-sm font-semibold text-slate-500">
                {product.name}
              </span>
            </div>
          )}
          {hasOffer ? (
            <Badge className="absolute left-3 top-3 shadow-sm" tone="warning">
              Offer
            </Badge>
          ) : null}
        </div>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950 transition-colors group-hover:text-market-800">
              {product.name}
            </h3>
            <p className="truncate text-xs text-slate-500">
              {product.vendor?.storeName ?? "Local vendor"}
            </p>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-base font-bold text-slate-950">{formatTnd(displayPrice)}</p>
              {hasOffer ? (
                <p className="text-xs text-slate-400 line-through">{formatTnd(product.price)}</p>
              ) : null}
            </div>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              COD
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
