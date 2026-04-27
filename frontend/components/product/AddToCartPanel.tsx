"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
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
      await api.cart.addItem({ productId, quantity: nextQuantity });
      setMessageTone("success");
      setMessage("Product added to cart.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.push("/auth/login");
        return;
      }

      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not add product to cart.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-3">
        <div className="w-28 space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="quantity">
            Quantity
          </label>
          <Input
            className="text-center"
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
          className="h-10 flex-1"
          disabled={isLoading || isSubmitting || isOutOfStock}
          onClick={handleAddToCart}
        >
          {isSubmitting ? "Adding" : isOutOfStock ? "Out of stock" : "Add to cart"}
        </Button>
      </div>

      {message ? (
        <p
          className={
            messageTone === "success"
              ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
              : "rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
