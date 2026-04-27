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
    <Link className="block h-full" href={`/product/${product.slug}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-soft">
        <div className="flex aspect-square items-center justify-center bg-slate-100">
          {image?.url ? (
            <img
              alt={image.altText ?? product.name}
              className="h-full w-full object-cover"
              src={image.url}
            />
          ) : (
            <span className="px-4 text-center text-sm font-semibold text-slate-500">
              {product.name}
            </span>
          )}
        </div>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h3 className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-950">
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
            {hasOffer ? <Badge tone="warning">Offer</Badge> : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
