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
  const fallbackInitials = product.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

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
            <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(135deg,#fff7f1,#ffffff_52%,#f8fafc)] p-4 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xs font-black text-market-800 shadow-sm ring-1 ring-market-200">
                {fallbackInitials || "FS"}
              </span>
              <span className="mt-3 line-clamp-3 text-sm font-semibold text-slate-500">
                {product.name}
              </span>
            </div>
          )}
          {hasOffer ? (
            <Badge className="absolute left-3 top-3 shadow-sm" tone="warning">
              Offre
            </Badge>
          ) : null}
        </div>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-950 transition-colors group-hover:text-market-800">
              {product.name}
            </h3>
            <p className="truncate text-xs text-slate-500">
              {product.vendor?.storeName ?? "Vendeur local"}
            </p>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="text-base font-extrabold text-market-800">{formatTnd(displayPrice)}</p>
              {hasOffer ? (
                <p className="text-xs text-slate-400 line-through">{formatTnd(product.price)}</p>
              ) : null}
            </div>
            <span className="rounded-full bg-market-50 px-2 py-1 text-xs font-bold text-market-900 ring-1 ring-market-100">
              COD
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
