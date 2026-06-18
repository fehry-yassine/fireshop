"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { notifyCartUpdated } from "@/lib/cartEvents";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type AddToCartPanelProps = {
  productId: string;
  stockQuantity: number;
};

export function AddToCartPanel({ productId, stockQuantity }: AddToCartPanelProps) {
  const router = useRouter();
  const { isLoading, user } = useCurrentUser();
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isOutOfStock = stockQuantity <= 0;

  async function handleAddToCart() {
    setMessage(null);

    if (!user) {
      router.push("/auth/login");
      return;
    }

    const requestedQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
    const nextQuantity = Math.max(1, Math.min(requestedQuantity, stockQuantity));
    setQuantity(nextQuantity);
    setIsSubmitting(true);

    try {
      const response = await api.cart.addItem({ productId, quantity: nextQuantity });
      notifyCartUpdated(response.itemCount);
      setMessageTone("success");
      setMessage("Produit ajouté au panier.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login");
        return;
      }

      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Impossible d'ajouter ce produit au panier.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="w-28 space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="quantity">
            Quantité
          </label>
          <Input
            className="h-12 text-center text-base font-semibold"
            disabled={isOutOfStock}
            id="quantity"
            max={Math.max(stockQuantity, 1)}
            min={1}
            onChange={(event) => setQuantity(Number(event.target.value))}
            type="number"
            value={quantity}
          />
        </div>
        <Button
          className="h-12 flex-1 text-base shadow-[0_12px_24px_rgba(234,88,12,0.24)]"
          disabled={isLoading || isSubmitting || isOutOfStock}
          onClick={handleAddToCart}
        >
          {isSubmitting
            ? "Ajout..."
            : isOutOfStock
              ? "Rupture de stock"
              : "Ajouter au panier"}
        </Button>
      </div>

      {message ? (
        messageTone === "success" ? (
          <div className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold">{message}</p>
            <Link
              className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-3 font-semibold text-emerald-800 shadow-sm ring-1 ring-emerald-200 transition hover:bg-emerald-100"
              href="/cart"
            >
              Voir le panier
            </Link>
          </div>
        ) : (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {message}
          </p>
        )
      ) : null}
    </div>
  );
}
