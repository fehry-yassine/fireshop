import { Card, CardContent } from "@/components/ui/Card";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types";

type ProductGridProps = {
  products: Product[];
  isUnavailable?: boolean;
};

export function ProductGrid({ products, isUnavailable }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <Card className="border-dashed bg-white/80">
        <CardContent className="mx-auto max-w-md py-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-market-50" />
          <p className="text-base font-bold text-slate-950">
            {isUnavailable ? "Products could not be loaded right now." : "No products available yet."}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Approved marketplace products will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
