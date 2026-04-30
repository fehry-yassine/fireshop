"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { VendorAccessGate } from "@/components/vendor/VendorAccessGate";
import { VendorDashboardFrame } from "@/components/vendor/VendorDashboardFrame";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Product } from "@/types";

export function VendorProductDetailsPageClient({ productId }: { productId: string }) {
  return (
    <VendorAccessGate>
      {({ vendor }) => (
        <VendorDashboardFrame vendor={vendor}>
          <VendorProductDetailsContent productId={productId} />
        </VendorDashboardFrame>
      )}
    </VendorAccessGate>
  );
}

function VendorProductDetailsContent({ productId }: { productId: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function loadProduct() {
      setIsLoading(true);
      setError(null);

      try {
        const products = await api.vendors.products.list();
        const selectedProduct = products.find((item) => item.id === productId);

        if (!isActive) {
          return;
        }

        if (!selectedProduct) {
          setError("Product not found in your vendor catalog.");
          return;
        }

        setProduct(selectedProduct);
      } catch (requestError) {
        if (isActive) {
          setError(getProductError(requestError, "Could not load product."));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      isActive = false;
    };
  }, [productId]);

  if (isLoading) {
    return (
      <Card className="border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
        <CardContent className="py-12 text-center">
          <p className="text-sm font-semibold text-white">Loading product</p>
          <p className="mt-2 text-sm text-[#98A0B2]">Please wait a moment.</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !product) {
    return (
      <Card className="border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
        <CardContent className="py-12 text-center">
          <p className="text-lg font-bold text-white">{error ?? "Product not found."}</p>
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-gradient-to-r from-[#FF6A2D] to-[#FF8F40] px-4 text-sm font-bold text-white transition-colors hover:from-[#FF7A3B] hover:to-[#FF9D56]"
            href="/vendor/products"
          >
            Back to products
          </Link>
        </CardContent>
      </Card>
    );
  }

  const image = product.images?.[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="text-sm font-bold text-[#FF8E4C]" href="/vendor/products">
            Products
          </Link>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
            Product details
          </h2>
        </div>
        <ProductStatusBadge status={product.status} />
      </div>

      <Card className="overflow-hidden border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
        <CardContent className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-[#2A2E39] bg-[#241A14]">
              {image?.url ? (
                <img
                  alt={image.altText ?? product.name}
                  className="h-full w-full object-cover"
                  src={image.url}
                />
              ) : (
                <span className="text-sm font-bold text-[#FF9B5D]">No image</span>
              )}
            </div>
            {product.images && product.images.length > 1 ? (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(0, 4).map((item) => (
                  <div
                    className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-[#2A2E39] bg-[#171B23]"
                    key={item.id}
                  >
                    <img
                      alt={item.altText ?? product.name}
                      className="h-full w-full object-cover"
                      src={item.url}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[#8E96A8]">
                {shortId(product.id)}
              </p>
              <h3 className="mt-1 text-3xl font-bold text-white">{product.name}</h3>
              <p className="mt-2 text-sm text-[#8F97A8]">{product.slug}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Price" value={formatTnd(product.offerPrice ?? product.price)} />
              <InfoTile label="Stock" value={`${product.stockQuantity}`} />
              <InfoTile label="Category" value={product.category?.name ?? "Uncategorized"} />
              <InfoTile label="Created date" value={formatDate(product.createdAt)} />
            </div>

            <div>
              <p className="text-sm font-bold text-white">Description</p>
              <p className="mt-2 whitespace-pre-line rounded-lg border border-[#2A2E39] bg-[#171B23] p-4 text-sm leading-6 text-[#9CA4B5]">
                {product.description || "No description provided."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#2A2E39] bg-[#171B23] px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-[#8E96A8]">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function ProductStatusBadge({ status }: { status: Product["status"] }) {
  if (status === "PUBLISHED") {
    return (
      <Badge className="border-emerald-900/30 bg-emerald-950/20 text-emerald-300" tone="neutral">
        Published
      </Badge>
    );
  }

  if (status === "PENDING_APPROVAL") {
    return (
      <Badge className="border-[#3D2D22] bg-[#261C16] text-[#FF9B5D]" tone="neutral">
        Pending
      </Badge>
    );
  }

  if (status === "REJECTED") {
    return (
      <Badge className="border-red-900/35 bg-red-950/20 text-red-300" tone="neutral">
        Rejected
      </Badge>
    );
  }

  return <Badge className="border-[#2A2E39] bg-[#181C24] text-[#A6ADBD]">Archived</Badge>;
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-TN", {
    dateStyle: "medium",
  }).format(date);
}

function getProductError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function shortId(value: string) {
  return value.slice(0, 8);
}


