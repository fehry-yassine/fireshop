"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { formatOrderStatus } from "@/components/orders/OrderStatus";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { notifyCartUpdated } from "@/lib/cartEvents";
import { formatTnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { CartItem, CartResponse, Order } from "@/types";

type CheckoutMessage = {
  text: string;
  tone: "success" | "error";
};

export function CheckoutPageClient() {
  const router = useRouter();
  const { isLoading: isUserLoading, user } = useCurrentUser();
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<CheckoutMessage | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setCart(response);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          router.replace("/auth/login");
          return;
        }

        if (isActive) {
          setMessage({
            text:
              error instanceof Error
                ? error.message
                : "Impossible de charger la validation de commande.",
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await api.orders.checkout({
        customerName: String(formData.get("customerName") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
        notes: String(formData.get("notes") ?? "").trim() || undefined,
      });

      setCreatedOrder(response.order);
      setCart(null);
      notifyCartUpdated(0);
      setMessage({ text: "Commande créée avec succès.", tone: "success" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        router.replace("/auth/login");
        return;
      }

      setMessage({
        text: getCheckoutErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isUserLoading || (!user && !isUserLoading)) {
    return <CheckoutLoadingState label="Vérification de votre session" />;
  }

  const currentUser = user;

  if (!currentUser) {
    return <CheckoutLoadingState label="Vérification de votre session" />;
  }

  if (isCartLoading) {
    return <CheckoutLoadingState label="Chargement de la validation de commande" />;
  }

  if (createdOrder) {
    return <CheckoutSuccess order={createdOrder} />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <Badge tone="neutral">Panier vide</Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">Aucune commande à valider</h1>
              <p className="text-sm leading-6 text-slate-500">
                Ajoutez des produits d'un vendeur FireShop avant de lancer la validation COD.
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
      <div className="space-y-2">
        <Badge tone="success">Paiement à la livraison</Badge>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Validation de commande</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Vous payez à la réception. Confirmez vos coordonnées de livraison et
          le vendeur préparera votre commande COD.
        </p>
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Coordonnées de livraison</h2>
              <p className="text-sm text-slate-500">
                Ces informations seront associées à votre commande COD.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nom complet" name="customerName">
                  <Input
                    autoComplete="name"
                    defaultValue={currentUser.fullName}
                    id="customerName"
                    name="customerName"
                    placeholder="Nom complet"
                    required
                  />
                </Field>
                <Field label="Téléphone" name="phone">
                  <Input
                    autoComplete="tel"
                    defaultValue={currentUser.phone ?? ""}
                    id="phone"
                    name="phone"
                    placeholder="Ex. 22 000 000"
                    required
                    type="tel"
                  />
                </Field>
              </div>

              <Field label="Adresse" name="address">
                <Input
                  autoComplete="street-address"
                  id="address"
                  name="address"
                  placeholder="Rue, immeuble, appartement"
                  required
                />
              </Field>

              <Field label="Ville" name="city">
                <Input
                  autoComplete="address-level2"
                  id="city"
                  name="city"
                  placeholder="Ex. Sousse"
                  required
                />
              </Field>

              <Field label="Notes" name="notes">
                <textarea
                  className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                  id="notes"
                  name="notes"
                  placeholder="Notes de livraison optionnelles"
                />
              </Field>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                <span className="font-semibold">Paiement à la livraison.</span>{" "}
                Vous payez à la réception. Aucun paiement en ligne n'est requis.
              </div>

              <Button
                className="h-12 w-full text-base shadow-[0_12px_24px_rgba(234,88,12,0.22)] sm:w-auto"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Création de la commande..." : "Valider la commande COD"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <CheckoutSummary cart={cart} />
      </div>
    </section>
  );
}

function Field({
  children,
  label,
  name,
}: {
  children: ReactNode;
  label: string;
  name: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-700" htmlFor={name}>
        {label}
      </label>
      {children}
    </div>
  );
}

function CheckoutSummary({ cart }: { cart: CartResponse }) {
  const itemCountLabel = cart.itemCount === 1 ? "1 article" : `${cart.itemCount} articles`;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card className="border-market-100 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <CardContent className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-950">Résumé de commande</h2>
            <p className="text-sm text-slate-500">
              {cart.vendor?.storeName ?? "Vendeur local"}
            </p>
          </div>

          <div className="space-y-3">
            {cart.items.map((item) => (
              <div className="flex gap-3" key={item.id}>
                <CheckoutItemThumbnail item={item} />
                <div className="min-w-0 flex-1">
                  <Link
                    className="line-clamp-2 text-sm font-semibold text-slate-950 hover:text-market-700"
                    href={`/product/${item.product.slug}`}
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {item.quantity} x {formatTnd(item.unitPrice)} - {item.vendor.storeName}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-950">
                  {formatTnd(item.subtotal)}
                </p>
              </div>
            ))}
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
        </CardContent>
      </Card>
    </aside>
  );
}

function CheckoutItemThumbnail({ item }: { item: CartItem }) {
  const image = item.product.images?.[0];
  const [hasImageError, setHasImageError] = useState(false);
  const imageUrl = hasImageError ? null : image?.url;

  return (
    <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-inner">
      {imageUrl ? (
        <img
          alt={image?.altText ?? item.product.name}
          className="h-full w-full object-contain"
          onError={() => setHasImageError(true)}
          src={imageUrl}
        />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-lg bg-gradient-to-br from-market-50 to-slate-100 text-xs font-bold text-market-800">
          {productInitials(item.product.name)}
        </span>
      )}
      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-market-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
        {item.quantity}
      </span>
    </div>
  );
}

function CheckoutSuccess({ order }: { order: Order }) {
  const itemCount = getOrderItemCount(order);
  const itemCountLabel = itemCount === 1 ? "1 article" : `${itemCount} articles`;

  return (
    <section className="mx-auto max-w-2xl">
      <Card className="overflow-hidden border-emerald-200 shadow-[0_18px_44px_rgba(16,185,129,0.12)]">
        <CardContent className="space-y-4 px-5 py-6 text-center sm:px-7 sm:py-7">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 shadow-sm">
            <SuccessIcon />
          </div>
          <div className="space-y-2">
            <Badge tone="success">Commande confirmée</Badge>
            <h1 className="text-xl font-extrabold text-slate-950 sm:text-2xl">
              Votre commande COD est confirmée
            </h1>
            <p className="mx-auto max-w-lg text-sm leading-5 text-slate-600">
              Le vendeur préparera votre commande. Vous paierez à la réception.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-left shadow-inner">
            <div className="divide-y divide-slate-200 rounded-lg bg-white px-3 shadow-sm ring-1 ring-slate-200/70">
              <CompactSummaryRow
                label="Référence de commande"
                value={formatDisplayOrderReference(order.id)}
                valueClassName="font-extrabold tracking-wide text-market-700"
              />
              <CompactSummaryRow label="Statut" value={formatOrderStatus(order.status)} />
              <CompactSummaryRow label="Vendeur" value={order.vendor.storeName} />
              <CompactSummaryRow label="Paiement" value={formatPaymentMethod(order.paymentMethod)} />
              <CompactSummaryRow label="Articles" value={itemCountLabel} />
              <CompactSummaryRow
                isStrong
                label="Total à payer"
                value={formatTnd(order.total)}
                valueClassName="text-xl font-extrabold text-market-700"
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-left">
            <ReassuranceItem label="Paiement à la livraison" />
            <ReassuranceItem label="Préparation par le vendeur" />
            <ReassuranceItem label="Suivi depuis vos commandes" />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-5 text-sm font-semibold text-white shadow-sm shadow-market-600/20 transition-colors hover:bg-market-700"
              href="/orders"
            >
              Voir mes commandes
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              href="/"
            >
              Continuer les achats
            </Link>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function CompactSummaryRow({
  isStrong = false,
  label,
  value,
  valueClassName,
}: {
  isStrong?: boolean;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5 text-sm",
        isStrong && "rounded-lg bg-market-50 px-3 -mx-1 my-1",
      )}
    >
      <span className="text-slate-500">{label}</span>
      <span className={cn("min-w-0 break-words text-right font-bold text-slate-950", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

function ReassuranceItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 sm:text-sm">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-emerald-700 shadow-sm ring-1 ring-emerald-200">
        <MiniCheckIcon />
      </span>
      <span>{label}</span>
    </div>
  );
}

function CheckoutLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Veuillez patienter.</p>
      </CardContent>
    </Card>
  );
}

function MiniCheckIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 16 16"
    >
      <path
        d="m3.5 8.2 2.7 2.7 6.3-6.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m5.5 12.5 4.2 4.2 8.8-9.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function formatPaymentMethod(method: Order["paymentMethod"]) {
  if (method === "CASH_ON_DELIVERY") {
    return "Paiement à la livraison";
  }

  return method;
}

function formatDisplayOrderReference(id: string) {
  const normalizedId = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  const suffix = normalizedId.slice(-4);

  return `CMD-${suffix || "0000"}`;
}

function getOrderItemCount(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
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

function getCheckoutErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Impossible de créer votre commande. Veuillez réessayer.";
}

