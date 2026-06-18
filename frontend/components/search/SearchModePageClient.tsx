"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { ProductRecommendationResponse } from "@/types";

export function SearchModePageClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ProductRecommendationResponse | null>(null);

  async function runSearch(inputText: string) {
    const nextQuery = inputText.trim();
    if (!nextQuery) {
      setError("Veuillez saisir une recherche produit.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const data = await api.search.recommend({
        needText: nextQuery,
        locale: "auto",
        maxResults: 6,
      });
      setResponse(data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "La recherche a echoue.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function addToCart(productId: string) {
    try {
      await api.cart.addItem({ productId, quantity: 1 });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        router.push("/auth/login");
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
        : "Impossible d'ajouter ce produit au panier.",
      );
    }
  }

  return (
    <div className="space-y-6 py-6 sm:py-8">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-market-700">
              Recherche
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Recherche produit</h1>
            <p className="mt-1 text-sm text-slate-600">
              Recherchez simplement par texte et trouvez les meilleurs produits en stock.
            </p>
          </div>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch(query);
            }}
          >
            <Input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex: kit noir moins de 200 TND"
              value={query}
            />
            <div className="flex flex-wrap gap-2">
              <Button disabled={isLoading} type="submit">
                {isLoading ? "Recherche..." : "Lancer la recherche"}
              </Button>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                href="/"
              >
                Retour accueil
              </Link>
            </div>
          </form>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {response ? (
        <Card>
          <CardContent className="space-y-3">
            <h2 className="text-xl font-bold text-slate-950">{response.summary.title}</h2>
            <p className="text-sm text-slate-700">{response.summary.userNeedUnderstanding}</p>
            <p className="text-sm text-slate-700">{response.summary.matchNarrative}</p>
            {response.keywordsUsed.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {response.keywordsUsed.slice(0, 10).map((term) => (
                  <Badge key={term}>{term}</Badge>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {response?.results?.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {response.results.map((entry) => {
            const image = entry.product.images?.[0];
            const displayPrice = entry.product.offerPrice ?? entry.product.price;

            return (
              <Card key={entry.product.id}>
                <CardContent className="space-y-3">
                  <Link
                    className="block overflow-hidden rounded-lg bg-slate-100"
                    href={`/product/${entry.product.slug}`}
                  >
                    {image?.url ? (
                      <img
                        alt={image.altText ?? entry.product.name}
                        className="aspect-square w-full object-cover"
                        src={image.url}
                      />
                    ) : (
                      <div className="flex aspect-square items-center justify-center p-4 text-center text-sm font-semibold text-slate-500">
                        {entry.product.name}
                      </div>
                    )}
                  </Link>
                  <div>
                    <p className="line-clamp-2 text-sm font-semibold text-slate-950">
                      {entry.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.product.vendor?.storeName ?? "Vendeur local"}
                    </p>
                    <p className="mt-1 text-base font-bold text-market-800">
                      {formatTnd(displayPrice)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.reasons.map((reason) => (
                      <Badge key={reason} tone="success">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        void addToCart(entry.product.id);
                      }}
                      variant="secondary"
                    >
                      Ajouter au panier
                    </Button>
                    <Link
                      className="inline-flex h-10 flex-1 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition hover:bg-market-700"
                      href={`/product/${entry.product.slug}`}
                    >
                      Voir produit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
