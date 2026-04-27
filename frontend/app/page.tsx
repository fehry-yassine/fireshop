import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Input } from "@/components/ui/Input";
import { CategorySidebar } from "@/components/category/CategorySidebar";
import { ProductGrid } from "@/components/product/ProductGrid";
import { api } from "@/lib/api";
import type { Category, Product } from "@/types";

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
    productsUnavailable: productsResult.status === "rejected",
  };
}

export default async function HomePage() {
  const { categories, products, productsUnavailable } = await getHomeData();
  const visibleProducts = products.slice(0, 8);

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <Container className="py-6 sm:py-8">
          <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
            <CategorySidebar categories={categories} />

            <div className="space-y-6">
              <div className="space-y-4 border-b border-slate-200 pb-6">
                <Badge tone="success">Tunisia marketplace</Badge>
                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
                    Shop local vendors with simple cash on delivery.
                  </h1>
                  <p className="text-base leading-7 text-slate-600">
                    Browse products from Tunisian sellers across everyday categories.
                  </p>
                </div>
                <form action="/" className="flex max-w-2xl flex-col gap-2 sm:flex-row" role="search">
                  <Input
                    aria-label="Search marketplace"
                    name="q"
                    placeholder="What are you looking for?"
                    type="search"
                  />
                  <Button className="sm:w-32" type="submit">
                    Search
                  </Button>
                </form>
              </div>

              <section className="space-y-4" id="products">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-950">Latest products</h2>
                    <p className="text-sm text-slate-500">
                      Approved products from marketplace vendors.
                    </p>
                  </div>
                </div>
                <ProductGrid products={visibleProducts} isUnavailable={productsUnavailable} />
              </section>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
