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
      {({ user, vendor }) => (
        <VendorDashboardFrame user={user} vendor={vendor}>
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
      <Card className="vendor-card">
        <CardContent className="py-12 text-center">
          <p className="vendor-title text-sm font-semibold">Loading product</p>
          <p className="vendor-muted mt-2 text-sm">Please wait a moment.</p>
        </CardContent>
      </Card>
    );
  }

  if (error || !product) {
    return (
      <Card className="vendor-card">
        <CardContent className="py-12 text-center">
          <p className="vendor-title text-lg font-bold">{error ?? "Product not found."}</p>
          <Link
            className="vendor-primary-action mt-5 inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-bold transition-colors"
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
          <Link className="vendor-accent-text text-sm font-bold" href="/vendor/products">
            Products
          </Link>
          <h2 className="vendor-title mt-2 text-2xl font-bold sm:text-3xl">
            Product details
          </h2>
        </div>
        <ProductStatusBadge status={product.status} />
      </div>

      <Card className="vendor-card overflow-hidden">
        <CardContent className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="vendor-upload-zone flex aspect-square items-center justify-center overflow-hidden rounded-lg border">
              {image?.url ? (
                <img
                  alt={image.altText ?? product.name}
                  className="h-full w-full object-cover"
                  src={image.url}
                />
              ) : (
                <span className="vendor-accent-text text-sm font-bold">No image</span>
              )}
            </div>
            {product.images && product.images.length > 1 ? (
              <div className="grid grid-cols-4 gap-2">
                {product.images.slice(0, 4).map((item) => (
                  <div
                    className="vendor-image-cell flex aspect-square items-center justify-center overflow-hidden rounded-lg border"
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
              <p className="vendor-muted text-xs font-semibold uppercase tracking-normal">
                {shortId(product.id)}
              </p>
              <h3 className="vendor-title mt-1 text-3xl font-bold">{product.name}</h3>
              <p className="vendor-muted mt-2 text-sm">{product.slug}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="Price" value={formatTnd(product.offerPrice ?? product.price)} />
              <InfoTile label="Stock" value={`${product.stockQuantity}`} />
              <InfoTile label="Category" value={product.category?.name ?? "Uncategorized"} />
              <InfoTile label="Created date" value={formatDate(product.createdAt)} />
            </div>

            <div>
              <p className="vendor-title text-sm font-bold">Description</p>
              <p className="vendor-panel-inset mt-2 whitespace-pre-line rounded-lg border p-4 text-sm leading-6">
                {product.description || "No description provided."}
              </p>
            </div>

            {product.rejectionReason ? (
              <div>
                <p className="text-sm font-bold text-red-600">Rejection reason</p>
                <p className="mt-2 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                  {product.rejectionReason}
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="vendor-panel-inset rounded-lg border px-4 py-3">
      <p className="vendor-muted text-xs font-semibold uppercase tracking-normal">{label}</p>
      <p className="vendor-title mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function ProductStatusBadge({ status }: { status: Product["status"] }) {
  if (status === "DRAFT") {
    return (
      <Badge className="vendor-status-neutral" tone="neutral">
        Draft
      </Badge>
    );
  }

  if (status === "PUBLISHED") {
    return (
      <Badge className="vendor-status-success" tone="neutral">
        Published
      </Badge>
    );
  }

  if (status === "PENDING_REVIEW") {
    return (
      <Badge className="vendor-status-warning" tone="neutral">
        Pending review
      </Badge>
    );
  }

  if (status === "REJECTED") {
    return (
      <Badge className="vendor-status-danger" tone="neutral">
        Rejected
      </Badge>
    );
  }

  return <Badge className="vendor-status-neutral">Archived</Badge>;
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
