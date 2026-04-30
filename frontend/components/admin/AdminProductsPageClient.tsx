"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { formatDateTime, getErrorMessage } from "@/components/admin/adminUtils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SlideOver } from "@/components/ui/SlideOver";
import { api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type {
  AdminProductDetails,
  AdminProductListItem,
  Category,
  Product,
  VendorApplication,
} from "@/types";

type ProductStatusFilter = Product["status"] | "ALL";

type AdminMessage = {
  text: string;
  tone: "success" | "error";
};

const LIMIT = 20;

export function AdminProductsPageClient() {
  return (
    <AdminAccessGate>
      <AdminDashboardFrame>
        <AdminProductsContent />
      </AdminDashboardFrame>
    </AdminAccessGate>
  );
}

function AdminProductsContent() {
  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>("ALL");
  const [vendorFilter, setVendorFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({
    archived: 0,
    pendingReview: 0,
    published: 0,
    rejected: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<AdminMessage | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProductId, setDrawerProductId] = useState<string | null>(null);
  const [drawerProduct, setDrawerProduct] = useState<AdminProductDetails | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const [rejectDialogProduct, setRejectDialogProduct] = useState<AdminProductListItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const loadProducts = useCallback(async () => {
    setIsLoading(true);

    try {
      const [response, allVendors, allCategories] = await Promise.all([
        api.admin.products.list({
          status: statusFilter,
          vendorId: vendorFilter === "ALL" ? undefined : vendorFilter,
          category: categoryFilter === "ALL" ? undefined : categoryFilter,
          search: search.trim() || undefined,
          page,
          limit: LIMIT,
        }),
        api.admin.vendors.list(),
        api.categories.list(),
      ]);

      setItems(response.items);
      setStats(response.stats);
      setTotalPages(response.pagination.totalPages);
      setVendors(allVendors);
      setCategories(allCategories);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not load products."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, page, search, statusFilter, vendorFilter]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function openDrawer(productId: string) {
    setDrawerOpen(true);
    setDrawerProductId(productId);
    setDrawerLoading(true);
    setDrawerProduct(null);

    try {
      const product = await api.admin.products.getById(productId);
      setDrawerProduct(product);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not load product details."),
        tone: "error",
      });
    } finally {
      setDrawerLoading(false);
    }
  }

  async function approveProduct(productId: string) {
    setActiveProductId(productId);
    setMessage(null);

    try {
      await api.admin.products.approve(productId);
      setMessage({ text: "Product published.", tone: "success" });
      await refreshAfterAction(productId);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not publish product."),
        tone: "error",
      });
    } finally {
      setActiveProductId(null);
    }
  }

  async function archiveProduct(productId: string) {
    setActiveProductId(productId);
    setMessage(null);

    try {
      await api.admin.products.archive(productId);
      setMessage({ text: "Product archived.", tone: "success" });
      await refreshAfterAction(productId);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not archive product."),
        tone: "error",
      });
    } finally {
      setActiveProductId(null);
    }
  }

  async function rejectProduct() {
    const candidate = rejectDialogProduct;

    if (!candidate) {
      return;
    }

    const reason = rejectReason.trim();

    if (!reason) {
      setMessage({ text: "Rejection reason is required.", tone: "error" });
      return;
    }

    setActiveProductId(candidate.id);
    setMessage(null);

    try {
      await api.admin.products.reject(candidate.id, { reason });
      setRejectDialogProduct(null);
      setRejectReason("");
      setMessage({ text: "Product rejected.", tone: "success" });
      await refreshAfterAction(candidate.id);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not reject product."),
        tone: "error",
      });
    } finally {
      setActiveProductId(null);
    }
  }

  async function refreshAfterAction(productId: string) {
    await loadProducts();

    if (drawerProductId === productId && drawerOpen) {
      try {
        const product = await api.admin.products.getById(productId);
        setDrawerProduct(product);
      } catch {
        setDrawerProduct(null);
      }
    }
  }

  const vendorsForFilter = useMemo(
    () => vendors.filter((vendor) => vendor.isActive && vendor.status === "APPROVED"),
    [vendors],
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-market-700">Catalog moderation</p>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">Product Review</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Review vendor submissions and control marketplace visibility.
        </p>
      </div>

      {message ? <InlineMessage message={message} /> : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pending review" value={stats.pendingReview} tone="warning" />
        <MetricCard label="Published" value={stats.published} tone="success" />
        <MetricCard label="Rejected" value={stats.rejected} tone="danger" />
        <MetricCard label="Archived" value={stats.archived} tone="neutral" />
      </div>

      <Card>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_200px_220px_220px_auto] lg:items-center">
            <Input
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search by product, vendor, slug, category"
              type="search"
              value={search}
            />
            <select
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as ProductStatusFilter);
              }}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="APPROVED">Approved</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
              onChange={(event) => {
                setPage(1);
                setVendorFilter(event.target.value);
              }}
              value={vendorFilter}
            >
              <option value="ALL">All vendors</option>
              {vendorsForFilter.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.storeName}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
              onChange={(event) => {
                setPage(1);
                setCategoryFilter(event.target.value);
              }}
              value={categoryFilter}
            >
              <option value="ALL">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              {items.length} shown
            </p>
          </div>

          {isLoading ? (
            <EmptyPanel text="Loading products." />
          ) : items.length === 0 ? (
            <EmptyPanel text="No products match these filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-bold uppercase tracking-normal text-slate-600">
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Vendor</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr className="border-b align-middle" key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          {item.image ? (
                            <img alt={item.name} className="h-full w-full object-cover" src={item.image} />
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">IMG</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-950">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.vendorName}</td>
                      <td className="px-4 py-3 text-slate-700">{item.categoryName}</td>
                      <td className="px-4 py-3 font-semibold text-slate-950">
                        {formatTnd(item.price)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{item.stock}</td>
                      <td className="px-4 py-3">
                        <ProductStatusBadge status={item.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(item.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button className="h-9 px-3" onClick={() => openDrawer(item.id)} variant="secondary">
                            View
                          </Button>
                          {(item.status === "PENDING_REVIEW" || item.status === "APPROVED") && (
                            <Button
                              disabled={activeProductId === item.id}
                              onClick={() => approveProduct(item.id)}
                              className="h-9 px-3"
                            >
                              Approve
                            </Button>
                          )}
                          {item.status === "PENDING_REVIEW" && (
                            <Button
                              disabled={activeProductId === item.id}
                              onClick={() => {
                                setRejectDialogProduct(item);
                                setRejectReason("");
                              }}
                              className="h-9 px-3"
                              variant="secondary"
                            >
                              Reject
                            </Button>
                          )}
                          {item.status === "PUBLISHED" && (
                            <Button
                              disabled={activeProductId === item.id}
                              onClick={() => archiveProduct(item.id)}
                              className="h-9 px-3"
                              variant="secondary"
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              className="h-9 px-3"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              variant="secondary"
            >
              Previous
            </Button>
            <p className="text-sm font-semibold text-slate-700">
              Page {page} / {totalPages}
            </p>
            <Button
              className="h-9 px-3"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              variant="secondary"
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <SlideOver ariaLabel="Product details" isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-market-700">Product review</p>
              <h3 className="text-2xl font-bold text-slate-950">Product details</h3>
            </div>
            <Button className="h-9 px-3" onClick={() => setDrawerOpen(false)} variant="secondary">
              Close
            </Button>
          </div>

          {drawerLoading ? (
            <EmptyPanel text="Loading product details." />
          ) : !drawerProduct ? (
            <EmptyPanel text="Product details unavailable." />
          ) : (
            <AdminProductDetailsPanel
              activeProductId={activeProductId}
              onApprove={() => approveProduct(drawerProduct.id)}
              onArchive={() => archiveProduct(drawerProduct.id)}
              onReject={() => {
                setRejectDialogProduct({
                  id: drawerProduct.id,
                  name: drawerProduct.name,
                  title: drawerProduct.title,
                  image: drawerProduct.images[0]?.url ?? null,
                  slug: drawerProduct.slug,
                  price: drawerProduct.offerPrice ?? drawerProduct.price,
                  stock: drawerProduct.stock,
                  status: drawerProduct.status,
                  vendorName: drawerProduct.vendor.storeName,
                  categoryName: drawerProduct.category.name,
                  createdAt: drawerProduct.createdAt,
                  updatedAt: drawerProduct.updatedAt,
                });
                setRejectReason("");
              }}
              product={drawerProduct}
            />
          )}
        </div>
      </SlideOver>

      <RejectDialog
        isWorking={rejectDialogProduct ? activeProductId === rejectDialogProduct.id : false}
        onCancel={() => {
          setRejectDialogProduct(null);
          setRejectReason("");
        }}
        onConfirm={rejectProduct}
        onReasonChange={setRejectReason}
        product={rejectDialogProduct}
        reason={rejectReason}
      />
    </div>
  );
}

function AdminProductDetailsPanel({
  activeProductId,
  onApprove,
  onArchive,
  onReject,
  product,
}: {
  activeProductId: string | null;
  onApprove: () => void;
  onArchive: () => void;
  onReject: () => void;
  product: AdminProductDetails;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {product.images[0]?.url ? (
              <img alt={product.images[0].altText ?? product.name} className="h-full w-full object-cover" src={product.images[0].url} />
            ) : (
              <span className="text-sm font-semibold text-slate-400">No image</span>
            )}
          </div>
          {product.images.length > 1 ? (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((image) => (
                <div className="aspect-square overflow-hidden rounded-lg border border-slate-200" key={image.id}>
                  <img alt={image.altText ?? product.name} className="h-full w-full object-cover" src={image.url} />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div>
            <ProductStatusBadge status={product.status} />
            <h4 className="mt-2 text-2xl font-bold text-slate-950">{product.title ?? product.name}</h4>
            <p className="text-sm text-slate-500">{product.slug}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Fact label="Vendor" value={product.vendor.storeName} />
            <Fact label="Category" value={product.category.name} />
            <Fact label="Price" value={formatTnd(product.offerPrice ?? product.price)} />
            <Fact label="Stock" value={`${product.stock}`} />
            <Fact label="Created" value={formatDateTime(product.createdAt)} />
            <Fact label="Updated" value={formatDateTime(product.updatedAt)} />
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-800">Description</p>
        <p className="mt-2 whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-700">
          {product.description || "No description provided."}
        </p>
      </div>

      {product.rejectionReason ? (
        <div>
          <p className="text-sm font-semibold text-red-700">Rejection reason</p>
          <p className="mt-2 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm leading-6 text-red-700">
            {product.rejectionReason}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(product.status === "PENDING_REVIEW" || product.status === "APPROVED") && (
          <Button disabled={activeProductId === product.id} onClick={onApprove}>
            Approve
          </Button>
        )}
        {product.status === "PENDING_REVIEW" && (
          <Button disabled={activeProductId === product.id} onClick={onReject} variant="secondary">
            Reject
          </Button>
        )}
        {product.status === "PUBLISHED" && (
          <Button disabled={activeProductId === product.id} onClick={onArchive} variant="secondary">
            Archive
          </Button>
        )}
      </div>
    </div>
  );
}

function ProductStatusBadge({ status }: { status: Product["status"] }) {
  if (status === "DRAFT") {
    return <Badge tone="neutral">Draft</Badge>;
  }

  if (status === "PENDING_REVIEW") {
    return <Badge tone="warning">Pending review</Badge>;
  }

  if (status === "APPROVED") {
    return <Badge className="bg-blue-50 text-blue-700" tone="neutral">Approved</Badge>;
  }

  if (status === "PUBLISHED") {
    return <Badge tone="success">Published</Badge>;
  }

  if (status === "REJECTED") {
    return <Badge className="bg-red-50 text-red-700" tone="neutral">Rejected</Badge>;
  }

  return <Badge className="bg-slate-800 text-slate-100" tone="neutral">Archived</Badge>;
}

function MetricCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
  value: number;
}) {
  const toneClass = {
    danger: "border-red-200 bg-red-50 text-red-700",
    neutral: "border-slate-300 bg-slate-50 text-slate-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  }[tone];

  return (
    <Card>
      <CardContent className="space-y-2">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <div className={`inline-flex rounded-lg border px-3 py-1 text-xs font-semibold ${toneClass}`}>
          {label}
        </div>
        <p className="text-3xl font-bold text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InlineMessage({ message }: { message: AdminMessage }) {
  return (
    <p
      className={
        message.tone === "success"
          ? "rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700"
          : "rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
      }
    >
      {message.text}
    </p>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">{text}</p>;
}

function RejectDialog({
  isWorking,
  onCancel,
  onConfirm,
  onReasonChange,
  product,
  reason,
}: {
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onReasonChange: (value: string) => void;
  product: AdminProductListItem | null;
  reason: string;
}) {
  if (!product) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
        <h4 className="text-lg font-bold text-slate-950">Reject product</h4>
        <p className="mt-1 text-sm text-slate-600">
          Provide a reason for rejecting <span className="font-semibold">{product.name}</span>.
        </p>

        <div className="mt-4 space-y-2">
          <label className="text-sm font-semibold text-slate-700" htmlFor="reject-reason">
            Reason
          </label>
          <textarea
            className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
            id="reject-reason"
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Explain clearly what the vendor must fix before resubmission"
            value={reason}
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button disabled={isWorking} onClick={onConfirm}>
            {isWorking ? "Rejecting" : "Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}
