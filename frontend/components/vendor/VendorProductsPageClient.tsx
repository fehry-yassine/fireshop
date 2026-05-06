"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SlideOver } from "@/components/ui/SlideOver";
import { VendorAccessGate } from "@/components/vendor/VendorAccessGate";
import { VendorDashboardFrame } from "@/components/vendor/VendorDashboardFrame";
import { VendorProductForm } from "@/components/vendor/VendorProductFormPageClient";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Category, Product } from "@/types";

type ProductStatusFilter =
  | "ALL"
  | "DRAFT"
  | "PUBLISHED"
  | "PENDING_REVIEW"
  | "REJECTED"
  | "ARCHIVED";

type ProductMessage = {
  text: string;
  tone: "success" | "error";
};

type ProductPanelState =
  | { mode: "create" }
  | { mode: "edit"; product: Product }
  | null;

type LoadProductsOptions = {
  clearMessage?: boolean;
  showLoading?: boolean;
  successText?: string;
};

export function VendorProductsPageClient() {
  return (
    <VendorAccessGate>
      {({ user, vendor }) => (
        <VendorDashboardFrame user={user} vendor={vendor}>
          <VendorProductsContent />
        </VendorDashboardFrame>
      )}
    </VendorAccessGate>
  );
}

function VendorProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [message, setMessage] = useState<ProductMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [panelState, setPanelState] = useState<ProductPanelState>(null);
  const [archiveCandidate, setArchiveCandidate] = useState<Product | null>(null);

  const loadProducts = useCallback(
    async ({
      clearMessage = false,
      showLoading = false,
      successText,
    }: LoadProductsOptions = {}) => {
      if (showLoading) {
        setIsLoading(true);
      }

      if (clearMessage) {
        setMessage(null);
      }

      try {
        const [nextProducts, nextCategories] = await Promise.all([
          api.vendors.products.list(),
          api.categories.list(),
        ]);

        setProducts(nextProducts);
        setCategories(nextCategories);

        if (successText) {
          setMessage({
            text: successText,
            tone: "success",
          });
        }
      } catch (error) {
        setMessage({
          text: getProductError(error, "Could not load vendor products."),
          tone: "error",
        });
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadProducts({ clearMessage: true, showLoading: true });
  }, [loadProducts]);

  const stats = useMemo(() => {
    const published = products.filter((product) => product.status === "PUBLISHED").length;
    const pending = products.filter((product) => product.status === "PENDING_REVIEW").length;
    const outOfStock = products.filter((product) => product.stockQuantity <= 0).length;
    return {
      outOfStock,
      pending,
      published,
      total: products.length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.slug.toLowerCase().includes(normalizedSearch) ||
        product.category?.name.toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        statusFilter === "ALL" || product.status === statusFilter;
      const matchesCategory =
        categoryFilter === "ALL" || product.categoryId === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, products, search, statusFilter]);

  async function archiveProduct(product: Product) {
    setActiveProductId(product.id);
    setMessage(null);
    setArchiveCandidate(null);

    try {
      const archivedProduct = await api.vendors.products.archive(product.id);
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? archivedProduct : item)),
      );
      setMessage({
        text: "Product archived.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        text: getProductError(error, "Could not archive product."),
        tone: "error",
      });
    } finally {
      setActiveProductId(null);
    }
  }

  async function publishProduct(product: Product) {
    const previousProduct = product;
    setActiveProductId(product.id);
    setMessage(null);

    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? { ...item, status: "PENDING_REVIEW" } : item,
      ),
    );

    try {
      const publishedProduct = await api.vendors.products.publish(product.id);
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? publishedProduct : item)),
      );
      setMessage({
        text: "Product submitted for admin review.",
        tone: "success",
      });
    } catch (error) {
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? previousProduct : item)),
      );
      setMessage({
        text: getProductError(error, "Could not publish product."),
        tone: "error",
      });
    } finally {
      setActiveProductId(null);
    }
  }

  async function handleProductSaved(successText: string) {
    setPanelState(null);
    await loadProducts({ successText });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          className="vendor-primary-action h-11 px-5"
          onClick={() => setPanelState({ mode: "create" })}
        >
          + Add Product
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InventoryMetric label="Total Products" value={isLoading ? "--" : `${stats.total}`} />
        <InventoryMetric label="Published" tone="success" value={isLoading ? "--" : `${stats.published}`} />
        <InventoryMetric label="Pending Review" tone="warning" value={isLoading ? "--" : `${stats.pending}`} />
        <InventoryMetric label="Out of Stock" tone="danger" value={isLoading ? "--" : `${stats.outOfStock}`} />
      </div>

      <Card className="vendor-card overflow-hidden">
        <div className="vendor-toolbar border-b px-4 py-4 sm:px-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_200px_200px_auto] lg:items-center">
            <Input
              aria-label="Search products"
              className="vendor-input h-12 text-base"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              type="search"
              value={search}
            />

            <select
              className="vendor-select h-12 rounded-lg px-3 text-sm font-semibold outline-none transition focus:ring-2"
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={categoryFilter}
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              className="vendor-select h-12 rounded-lg px-3 text-sm font-semibold outline-none transition focus:ring-2"
              onChange={(event) => setStatusFilter(event.target.value as ProductStatusFilter)}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <div className="vendor-chip rounded-lg px-4 py-3 text-sm font-semibold">
              {filteredProducts.length} shown
            </div>
          </div>
        </div>

        {isLoading ? (
          <CardContent className="py-12 text-center">
            <p className="vendor-title text-sm font-semibold">Loading products</p>
            <p className="vendor-muted mt-2 text-sm">Please wait a moment.</p>
          </CardContent>
        ) : products.length === 0 ? (
          <EmptyProductsState onAdd={() => setPanelState({ mode: "create" })} />
        ) : filteredProducts.length === 0 ? (
          <CardContent className="py-12 text-center">
            <p className="vendor-title text-lg font-bold">No matching products</p>
            <p className="vendor-muted mt-2 text-sm">
              Adjust search or filters to see more inventory.
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead>
                <tr className="vendor-table-head border-b text-left text-xs font-bold uppercase tracking-normal">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Product Image</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <ProductRow
                    isActive={activeProductId === product.id}
                    key={product.id}
                    onArchive={() => setArchiveCandidate(product)}
                    onEdit={() => setPanelState({ mode: "edit", product })}
                    onPublish={() => publishProduct(product)}
                    product={product}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Toast message={message} onClose={() => setMessage(null)} />

      <ArchiveConfirmDialog
        isArchiving={archiveCandidate ? activeProductId === archiveCandidate.id : false}
        onCancel={() => setArchiveCandidate(null)}
        onConfirm={() => archiveCandidate && archiveProduct(archiveCandidate)}
        product={archiveCandidate}
      />

      <SlideOver
        ariaLabel={panelState?.mode === "edit" ? "Edit product" : "Create product"}
        isOpen={panelState !== null}
        onClose={() => setPanelState(null)}
      >
        {panelState ? (
          <VendorProductForm
            categories={categories}
            mode={panelState.mode}
            onCancel={() => setPanelState(null)}
            onSaved={handleProductSaved}
            product={panelState.mode === "edit" ? panelState.product : null}
          />
        ) : null}
      </SlideOver>
    </div>
  );
}

function InventoryMetric({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "danger" | "neutral" | "success" | "warning";
  value: string;
}) {
  const accentClass = {
    danger: "border border-red-900/35 bg-red-950/20 text-red-300",
    neutral: "border border-[#3D2D22] bg-[#261C16] text-[#FF9B5D]",
    success: "border border-emerald-900/30 bg-emerald-950/20 text-emerald-300",
    warning: "border border-amber-900/30 bg-amber-950/20 text-amber-300",
  }[tone];

  return (
    <Card className="vendor-metric-card">
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="vendor-muted text-sm font-semibold">
            {label}
          </p>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-black ${accentClass}`}
          >
            {label.slice(0, 1)}
          </div>
        </div>
        <p className="vendor-title text-4xl font-bold leading-none">{value}</p>
      </CardContent>
    </Card>
  );
}

function ProductRow({
  isActive,
  onArchive,
  onEdit,
  onPublish,
  product,
}: {
  isActive: boolean;
  onArchive: () => void;
  onEdit: () => void;
  onPublish: () => void;
  product: Product;
}) {
  const image = product.images?.[0];
  const canEdit = product.status === "DRAFT" || product.status === "REJECTED" || product.status === "PUBLISHED";
  const canPublish = product.status === "DRAFT" || product.status === "REJECTED";
  const canArchive = product.status === "DRAFT" || product.status === "PUBLISHED";
  const isUnderReview = product.status === "PENDING_REVIEW";

  return (
    <>
      <tr className="vendor-table-row border-b align-middle transition-colors">
        <td className="vendor-title px-6 py-5 font-bold">
          {shortId(product.id)}
        </td>
        <td className="px-6 py-5">
          <div className="vendor-image-cell flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border">
            {image?.url ? (
              <img
                alt={image.altText ?? product.name}
                className="h-full w-full object-cover"
                src={image.url}
              />
            ) : (
              <span className="vendor-subtle text-xs font-bold">IMG</span>
            )}
          </div>
        </td>
        <td className="max-w-xs px-6 py-5">
          <p className="vendor-title line-clamp-2 font-bold">{product.name}</p>
          <p className="vendor-muted mt-1 break-all text-xs">{product.slug}</p>
          {product.status === "REJECTED" ? (
            <p className="mt-2 text-xs font-semibold text-red-500">
              {product.rejectionReason
                ? `Rejection reason: ${product.rejectionReason}`
                : "Product rejected. Fix required fields and publish again."}
            </p>
          ) : null}
        </td>
        <td className="vendor-title px-6 py-5 font-bold">
          {formatTnd(product.offerPrice ?? product.price)}
        </td>
        <td className="px-6 py-5">
          <span className="vendor-title font-bold">{product.stockQuantity}</span>
        </td>
        <td className="px-6 py-5">
          <ProductStatusBadge status={product.status} />
        </td>
        <td className="vendor-muted px-6 py-5">
          {formatDate(product.createdAt)}
        </td>
        <td className="px-6 py-5">
          <div className="flex justify-end gap-2">
            <IconLink
              href={`/vendor/products/${product.id}`}
              label={`View ${product.name}`}
            >
              <EyeIcon />
            </IconLink>
            <IconButton
              disabled={isActive || !canEdit}
              label={`Edit ${product.name}`}
              onClick={onEdit}
            >
              <PencilIcon />
            </IconButton>
            {canPublish ? (
              <IconButton
                disabled={isActive}
                label={`Publish ${product.name}`}
                onClick={onPublish}
              >
                <PublishIcon />
              </IconButton>
            ) : null}
            <IconButton
              disabled={isActive || !canArchive}
              label={
                product.status === "ARCHIVED"
                  ? `${product.name} is archived`
                  : isUnderReview
                    ? `${product.name} is under review`
                  : `Archive ${product.name}`
              }
              onClick={onArchive}
            >
              <ArchiveIcon />
            </IconButton>
          </div>
        </td>
      </tr>
    </>
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

function IconLink({
  children,
  href,
  label,
}: {
  children: ReactNode;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-label={label}
      className="vendor-icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
      href={href}
      title={label}
    >
      {children}
    </Link>
  );
}

function IconButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="vendor-icon-button inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="m14 7 3 3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path
        d="M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PublishIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 19V5m0 0-5 5m5-5 5 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M5 19h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function EmptyProductsState({ onAdd }: { onAdd?: () => void }) {
  return (
    <CardContent className="py-14 text-center">
      <div className="vendor-soft-pill mx-auto flex h-16 w-16 items-center justify-center rounded-lg text-xl font-bold">
        +
      </div>
      <h3 className="vendor-title mt-5 text-2xl font-bold">No products yet</h3>
      <p className="vendor-muted mx-auto mt-2 max-w-md text-sm leading-6">
        Add your first product, publish it for review, then track status and
        stock from this seller dashboard.
      </p>
      <Button
        className="vendor-primary-action mt-5 h-11 px-5"
        onClick={onAdd}
      >
        Add first product
      </Button>
    </CardContent>
  );
}

function Toast({
  message,
  onClose,
}: {
  message: ProductMessage | null;
  onClose: () => void;
}) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={
        message.tone === "success"
          ? "vendor-toast vendor-toast-success fixed bottom-5 right-5 z-40 flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold"
          : "vendor-toast vendor-toast-error fixed bottom-5 right-5 z-40 flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 text-sm font-semibold"
      }
    >
      <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-current" />
      <span className="leading-5">{message.text}</span>
      <button
        aria-label="Dismiss notification"
        className="vendor-muted ml-2 transition-colors hover:opacity-80"
        onClick={onClose}
        type="button"
      >
        x
      </button>
    </div>
  );
}

function ArchiveConfirmDialog({
  isArchiving,
  onCancel,
  onConfirm,
  product,
}: {
  isArchiving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  product: Product | null;
}) {
  if (!product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="vendor-dialog w-full max-w-md rounded-lg border p-5">
        <p className="vendor-title text-lg font-bold">Archive product?</p>
        <p className="vendor-muted mt-2 text-sm leading-6">
          {product.name} will be removed from the public marketplace catalog. This
          is different from Hidden visibility.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button
            className="vendor-secondary-action"
            onClick={onCancel}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            className="vendor-primary-action"
            disabled={isArchiving}
            onClick={onConfirm}
          >
            {isArchiving ? "Archiving" : "Archive"}
          </Button>
        </div>
      </div>
    </div>
  );
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

function shortId(value: string) {
  return value.slice(0, 8);
}
