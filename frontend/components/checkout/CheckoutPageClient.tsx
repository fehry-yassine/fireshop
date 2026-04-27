"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { CartResponse, Order } from "@/types";

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
            text: error instanceof Error ? error.message : "Could not load checkout.",
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
      setMessage({ text: "Order created successfully.", tone: "success" });
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
    return <CheckoutLoadingState label="Checking your session" />;
  }

  const currentUser = user;

  if (!currentUser) {
    return <CheckoutLoadingState label="Checking your session" />;
  }

  if (isCartLoading) {
    return <CheckoutLoadingState label="Loading checkout" />;
  }

  if (createdOrder) {
    return <CheckoutSuccess order={createdOrder} />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="space-y-5 py-10 text-center">
            <Badge tone="neutral">Empty cart</Badge>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">Nothing to checkout</h1>
              <p className="text-sm leading-6 text-slate-500">
                Add products from a LocalMarket vendor before starting COD checkout.
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
      <div className="space-y-2">
        <Badge tone="success">Cash on delivery</Badge>
        <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">Checkout</h1>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          You will pay when you receive your order. Confirm your delivery details and
          the vendor will prepare your COD order.
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
              <h2 className="text-lg font-bold text-slate-950">Delivery details</h2>
              <p className="text-sm text-slate-500">
                These details will be attached to your COD order.
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer name" name="customerName">
                  <Input
                    autoComplete="name"
                    defaultValue={currentUser.fullName}
                    id="customerName"
                    name="customerName"
                    required
                  />
                </Field>
                <Field label="Phone" name="phone">
                  <Input
                    autoComplete="tel"
                    defaultValue={currentUser.phone ?? ""}
                    id="phone"
                    name="phone"
                    required
                    type="tel"
                  />
                </Field>
              </div>

              <Field label="Address" name="address">
                <Input
                  autoComplete="street-address"
                  id="address"
                  name="address"
                  placeholder="Street, building, apartment"
                  required
                />
              </Field>

              <Field label="City" name="city">
                <Input autoComplete="address-level2" id="city" name="city" required />
              </Field>

              <Field label="Notes" name="notes">
                <textarea
                  className="min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                  id="notes"
                  name="notes"
                  placeholder="Optional delivery notes"
                />
              </Field>

              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                You will pay when you receive your order. No online payment is required.
              </div>

              <Button className="h-11 w-full sm:w-auto" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating order" : "Place COD order"}
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
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-950">Order summary</h2>
            <p className="text-sm text-slate-500">
              {cart.vendor?.storeName ?? "Local vendor"}
            </p>
          </div>

          <div className="space-y-3">
            {cart.items.map((item) => (
              <div className="flex gap-3" key={item.id}>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-center text-xs font-semibold text-slate-500">
                  {item.quantity}x
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    className="line-clamp-2 text-sm font-semibold text-slate-950 hover:text-market-700"
                    href={`/product/${item.product.slug}`}
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-slate-500">{item.vendor.storeName}</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-950">
                  {formatTnd(item.subtotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-y border-slate-200 py-4 text-sm">
            <SummaryRow label="Items" value={`${cart.itemCount}`} />
            <SummaryRow label="Subtotal" value={formatTnd(cart.total)} />
            <SummaryRow label="Delivery" value="Confirmed by vendor" />
            <SummaryRow label="Payment" value="Cash on delivery" />
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-base font-bold text-slate-950">Total</span>
            <span className="text-xl font-bold text-slate-950">{formatTnd(cart.total)}</span>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}

function CheckoutSuccess({ order }: { order: Order }) {
  return (
    <section className="mx-auto max-w-2xl">
      <Card>
        <CardContent className="space-y-6 py-10 text-center">
          <Badge tone="success">Order created</Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">Your COD order is confirmed</h1>
            <p className="text-sm leading-6 text-slate-500">
              The vendor will prepare your order. You will pay when you receive it.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-left text-sm">
            <SummaryRow label="Order ID" value={order.id} />
            <div className="mt-3">
              <SummaryRow label="Status" value={order.status} />
            </div>
            <div className="mt-3">
              <SummaryRow label="Total" value={formatTnd(order.total)} />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-market-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-market-700"
              href="/orders"
            >
              View orders
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-50"
              href="/"
            >
              Continue shopping
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

function CheckoutLoadingState({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait a moment.</p>
      </CardContent>
    </Card>
  );
}

function getCheckoutErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Could not create your order. Please try again.";
}
