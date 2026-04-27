"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { CartItem, CartResponse } from "@/types";

type Message = {
  text: string;
  tone: "success" | "error";
};

export function CartPageClient() {
  const router = useRouter();
  const { isLoading: isUserLoading, user } = useCurrentUser();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (!user) {
      router.replace("/auth/login");
      return;
    }

    let isActive = true;

    async function loadCart() {
      setIsCartLoading(true);
      setMessage(null);

      try {
        const response = await api.cart.get();

        if (isActive) {
          applyCart(response);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (isActive) {
          setMessage({
            text: error instanceof Error ? error.message : "Could not load cart.",
            tone: "error",
          });
        }
      } finally {
        if (isActive) {
          setIsCartLoading(false);
        }
      }
    }

    void loadCart();

    return () => {
      isActive = false;
    };
  }, [isUserLoading, router, user]);

  const hasItems = Boolean(cart?.items.length);
  const itemCountLabel = useMemo(() => {
    const count = cart?.itemCount ?? 0;
    return count === 1 ? "1 item" : `${count} items`;
  }, [cart?.itemCount]);

  function applyCart(nextCart: CartResponse) {
    setCart(nextCart);
    setQuantities(
      Object.fromEntries(nextCart.items.map((item) => [item.id, item.quantity])),
    );
  }

  async function updateQuantity(item: CartItem) {
    const requestedQuantity = quantities[item.id] ?? item.quantity;
    const nextQuantity = Math.max(
      1,
      Math.min(Math.floor(requestedQuantity), item.product.stockQuantity),
    );

    setActiveItemId(item.id);
    setMessage(null);

    try {
      const response = await api.cart.updateItem(item.id, { quantity: nextQuantity });
      applyCart(response);
      setMessage({ text: "Quantity updated.", tone: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Could not update quantity.",
        tone: "error",
      });
    } finally {
      setActiveItemId(null);
    }
  }

  async function removeItem(itemId: string) {
    setActiveItemId(itemId);
    setMessage(null);

    try {
      const response = await api.cart.removeItem(itemId);
      applyCart(response);
      setMessage({ text: "Item removed.", tone: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Could not remove item.",
        tone: "error",
      });
    } finally {
      setActiveItemId(null);
    }
  }

  async function clearCart() {
    setIsClearing(true);
    setMessage(null);

    try {
      const response = await api.cart.clear();
      applyCart(response);
      setMessage({ text: "Cart cleared.", tone: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Could not clear cart.",
        tone: "error",
      });
    } finally {
      setIsClearing(false);
    }
  }

  if (isUserLoading || (!user && !isUserLoading)) {
    return <CartLoadingState label="Checking your session" />;
  }

  if (isCartLoading) {
    return <CartLoadingState label="Loading your cart" />;
  }

  if (!cart || !hasItems) {
    return (
      <section className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">Your cart is empty</h1>
              <p className="text-sm leading-6 text-slate-500">
                Products you add from LocalMarket vendors will appear here.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
              href="/"
            >
              Continue shopping
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Shopping cart</h1>
          <p className="text-sm text-slate-500">
            {itemCountLabel}
            {cart.vendor ? ` from ${cart.vendor.storeName}` : ""}
          </p>
        </div>
        <Button
          className="sm:w-auto"
          disabled={isClearing}
          onClick={clearCart}
          variant="secondary"
        >
          {isClearing ? "Clearing" : "Clear cart"}
        </Button>
      </div>

      {message ? (
        <p
          className={
            message.tone === "success"
              ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
              : "rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          }
        >
          {message.text}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          {cart.items.map((item) => (
            <CartItemCard
              activeItemId={activeItemId}
              item={item}
              key={item.id}
              onQuantityChange={(value) =>
                setQuantities((current) => ({ ...current, [item.id]: value }))
              }
              onRemove={() => removeItem(item.id)}
              onUpdate={() => updateQuantity(item)}
              quantity={quantities[item.id] ?? item.quantity}
            />
          ))}
        </div>

        <CartSummary cart={cart} />
      </div>
    </section>
  );
}

function CartItemCard({
  activeItemId,
  item,
  onQuantityChange,
  onRemove,
  onUpdate,
  quantity,
}: {
  activeItemId: string | null;
  item: CartItem;
  onQuantityChange: (value: number) => void;
  onRemove: () => void;
  onUpdate: () => void;
  quantity: number;
}) {
  const image = item.product.images?.[0];
  const isActive = activeItemId === item.id;
  const quantityChanged = quantity !== item.quantity;

  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-[112px_minmax(0,1fr)]">
        <Link
          className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-slate-100"
          href={`/product/${item.product.slug}`}
        >
          {image?.url ? (
            <img
              alt={image.altText ?? item.product.name}
              className="h-full w-full object-cover"
              src={image.url}
            />
          ) : (
            <span className="px-3 text-center text-xs font-semibold text-slate-500">
              {item.product.name}
            </span>
          )}
        </Link>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <div className="min-w-0 space-y-1">
              <Link
                className="line-clamp-2 text-base font-semibold text-slate-950 hover:text-market-700"
                href={`/product/${item.product.slug}`}
              >
                {item.product.name}
              </Link>
              <p className="text-sm text-slate-500">{item.vendor.storeName}</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-sm text-slate-500">Subtotal</p>
              <p className="font-bold text-slate-950">{formatTnd(item.subtotal)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_220px] sm:items-end">
            <div className="grid grid-cols-2 gap-3 text-sm sm:max-w-xs">
              <div>
                <p className="text-slate-500">Unit price</p>
                <p className="font-semibold text-slate-950">{formatTnd(item.unitPrice)}</p>
              </div>
              <div>
                <p className="text-slate-500">Stock</p>
                <p className="font-semibold text-slate-950">
                  {item.product.stockQuantity} available
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Input
                aria-label={`Quantity for ${item.product.name}`}
                className="h-9 w-24 text-center"
                max={Math.max(item.product.stockQuantity, 1)}
                min={1}
                onChange={(event) => onQuantityChange(Number(event.target.value))}
                type="number"
                value={quantity}
              />
              <Button
                className="h-9 px-3"
                disabled={isActive || !quantityChanged}
                onClick={onUpdate}
                variant="secondary"
              >
                Update
              </Button>
              <Button
                className="h-9 px-3"
                disabled={isActive}
                onClick={onRemove}
                variant="ghost"
              >
                Remove
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CartSummary({ cart }: { cart: CartResponse }) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Order summary</h2>
            <p className="text-sm text-slate-500">Cash on delivery checkout</p>
          </div>

          <div className="space-y-3 border-y border-slate-200 py-4 text-sm">
            <SummaryRow label="Items" value={`${cart.itemCount}`} />
            <SummaryRow label="Delivery" value="Calculated at checkout" />
            <SummaryRow label="Payment" value="Cash on delivery" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-base font-bold text-slate-950">Total</span>
            <span className="text-xl font-bold text-slate-950">{formatTnd(cart.total)}</span>
          </div>

          <Link
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
            href="/checkout"
          >
            Proceed to checkout
          </Link>

          <p className="text-xs leading-5 text-slate-500">
            LocalMarket supports one-vendor COD checkout in this version.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function CartLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
      </CardContent>
    </Card>
  );
}
