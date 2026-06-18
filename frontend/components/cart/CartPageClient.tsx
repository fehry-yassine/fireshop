"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { notifyCartUpdated } from "@/lib/cartEvents";
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
            text: error instanceof Error ? error.message : "Impossible de charger le panier.",
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
    return count === 1 ? "1 article" : `${count} articles`;
  }, [cart?.itemCount]);

  function applyCart(nextCart: CartResponse) {
    setCart(nextCart);
    notifyCartUpdated(nextCart.itemCount);
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
      setMessage({ text: "Quantité mise à jour.", tone: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Impossible de mettre à jour la quantité.",
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
      setMessage({ text: "Article retiré du panier.", tone: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Impossible de retirer cet article.",
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
      setMessage({ text: "Panier vidé.", tone: "success" });
    } catch (error) {
      setMessage({
        text: error instanceof Error ? error.message : "Impossible de vider le panier.",
        tone: "error",
      });
    } finally {
      setIsClearing(false);
    }
  }

  if (isUserLoading || (!user && !isUserLoading)) {
    return <CartLoadingState label="Vérification de votre session" />;
  }

  if (isCartLoading) {
    return <CartLoadingState label="Chargement de votre panier" />;
  }

  if (!cart || !hasItems) {
    return (
      <section className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">Votre panier est vide</h1>
              <p className="text-sm leading-6 text-slate-500">
                Les produits ajoutés depuis les vendeurs FireShop apparaîtront ici.
              </p>
            </div>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
              href="/"
            >
              Continuer les achats
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-market-100 bg-gradient-to-r from-market-50 via-white to-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-bold text-market-700">Étape 1</p>
          <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Panier</h1>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Vérifiez vos articles avant de valider votre commande COD.
              {cart.vendor ? ` Votre panier concerne le vendeur ${cart.vendor.storeName}.` : ""}
            </p>
          </div>
          <p className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-market-100">
            {itemCountLabel}
          </p>
        </div>
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-950">Articles sélectionnés</h2>
            <Button
              className="h-9 px-3"
              disabled={isClearing}
              onClick={clearCart}
              variant="secondary"
            >
              {isClearing ? "Suppression..." : "Vider"}
            </Button>
          </div>
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
  const [hasImageError, setHasImageError] = useState(false);
  const isActive = activeItemId === item.id;
  const quantityChanged = quantity !== item.quantity;
  const imageUrl = hasImageError ? null : image?.url;

  return (
    <Card className="overflow-hidden">
      <CardContent className="grid gap-4 sm:grid-cols-[118px_minmax(0,1fr)]">
        <Link
          className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2 shadow-inner"
          href={`/product/${item.product.slug}`}
        >
          {imageUrl ? (
            <img
              alt={image?.altText ?? item.product.name}
              className="h-full w-full object-contain"
              onError={() => setHasImageError(true)}
              src={imageUrl}
            />
          ) : (
            <span className="grid h-full w-full place-items-center rounded-lg bg-gradient-to-br from-market-50 to-slate-100 px-3 text-center text-xs font-bold text-market-800">
              {productInitials(item.product.name)}
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
              <p className="text-sm text-slate-500">Sous-total</p>
              <p className="font-bold text-slate-950">{formatTnd(item.subtotal)}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_220px] sm:items-end">
            <div className="grid grid-cols-2 gap-3 text-sm sm:max-w-xs">
              <div>
                <p className="text-slate-500">Prix unitaire</p>
                <p className="font-semibold text-slate-950">{formatTnd(item.unitPrice)}</p>
              </div>
              <div>
                <p className="text-slate-500">Stock</p>
                <p className="font-semibold text-slate-950">
                  {item.product.stockQuantity} disponible
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Input
                aria-label={`Quantité pour ${item.product.name}`}
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
                Modifier
              </Button>
              <Button
                className="h-9 px-3"
                disabled={isActive}
                onClick={onRemove}
                variant="ghost"
              >
                Retirer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CartSummary({ cart }: { cart: CartResponse }) {
  const itemCountLabel = cart.itemCount === 1 ? "1 article" : `${cart.itemCount} articles`;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card className="border-market-100 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <CardContent className="space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Résumé de commande</h2>
            <p className="text-sm text-slate-500">Paiement à la livraison</p>
          </div>

          <div className="space-y-3 border-y border-slate-200 py-4 text-sm">
            <SummaryRow label="Articles" value={itemCountLabel} />
            <SummaryRow label="Sous-total" value={formatTnd(cart.total)} />
            <SummaryRow label="Livraison" value="Confirmée après validation du vendeur" />
            <SummaryRow label="Paiement" value="Paiement à la livraison" />
          </div>

          <div className="flex items-end justify-between gap-4 rounded-xl bg-market-50 px-4 py-3">
            <span className="text-base font-bold text-slate-950">Total</span>
            <span className="text-2xl font-extrabold text-market-700">{formatTnd(cart.total)}</span>
          </div>

          <Link
            className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
            href="/checkout"
          >
            Passer la commande
          </Link>

          <p className="text-xs leading-5 text-slate-500">
            Une commande COD par vendeur est prise en charge dans cette version.
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
        <p className="mt-2 text-sm text-slate-500">Veuillez patienter.</p>
      </CardContent>
    </Card>
  );
}

function productInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

