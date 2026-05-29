"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { formatDateTime, getErrorMessage } from "@/components/admin/adminUtils";
import { DashboardDrawer } from "@/components/dashboard/DashboardDrawer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
const DELETE_CONFIRMATION_TEXT = "Delete this product permanently? This cannot be undone.";
const DELETE_CAN_DELETE_TITLE = "Delete permanently";
const DELETE_ORDER_HISTORY_REASON = "Cannot delete: this product is linked to orders. Archive it instead.";
const DELETE_UNKNOWN_REASON = "Delete availability unknown.";
const PRODUCT_TABLE_HEADER_CELL_CLASS =
  "sticky top-0 z-20 whitespace-nowrap bg-slate-50";
const PRODUCT_TABLE_COLUMNS = [
  {
    cellClass: "text-center",
    contentClass: "mx-auto flex w-full justify-center",
    headerClass: "text-center",
    key: "image",
    label: "Image",
    width: "5%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[128px] min-w-0",
    headerClass: "text-center",
    key: "product",
    label: "Product",
    width: "12.5%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[116px] min-w-0 text-center",
    headerClass: "text-center",
    key: "vendor",
    label: "Seller",
    width: "10.5%",
  },
  {
    cellClass: "min-w-0 text-center",
    contentClass: "mx-auto block w-full max-w-[136px] min-w-0 text-center",
    headerClass: "text-center",
    key: "category",
    label: "Category",
    width: "12%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "price",
    label: "Price",
    width: "8%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "stock",
    label: "Stock",
    width: "5.5%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto flex w-full justify-center",
    headerClass: "text-center",
    key: "status",
    label: "Status",
    width: "10.5%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto block w-full text-center",
    headerClass: "text-center",
    key: "created",
    label: "Created",
    width: "9.5%",
  },
  {
    cellClass: "text-center",
    contentClass: "mx-auto flex w-full justify-center",
    headerClass: "text-center",
    key: "actions",
    label: "Actions",
    width: "26.5%",
  },
] as const;
const PRODUCT_TABLE_COLUMN = {
  actions: PRODUCT_TABLE_COLUMNS[8],
  category: PRODUCT_TABLE_COLUMNS[3],
  created: PRODUCT_TABLE_COLUMNS[7],
  image: PRODUCT_TABLE_COLUMNS[0],
  price: PRODUCT_TABLE_COLUMNS[4],
  product: PRODUCT_TABLE_COLUMNS[1],
  status: PRODUCT_TABLE_COLUMNS[6],
  stock: PRODUCT_TABLE_COLUMNS[5],
  vendor: PRODUCT_TABLE_COLUMNS[2],
} as const;

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
  const [deleteDialogProduct, setDeleteDialogProduct] = useState<AdminProductListItem | null>(null);

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

  async function republishProduct(productId: string) {
    setActiveProductId(productId);
    setMessage(null);

    try {
      await api.admin.products.republish(productId);
      setMessage({ text: "Product republished.", tone: "success" });
      await refreshAfterAction(productId);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not republish product."),
        tone: "error",
      });
    } finally {
      setActiveProductId(null);
    }
  }

  async function deleteProductPermanently() {
    const candidate = deleteDialogProduct;

    if (!candidate) {
      return;
    }

    const deleteAvailability = getDeleteAvailability(candidate.orderItemCount);

    if (!deleteAvailability.canDelete) {
      setDeleteDialogProduct(null);
      setMessage({
        text: deleteAvailability.reason,
        tone: "error",
      });
      return;
    }

    setActiveProductId(candidate.id);
    setMessage(null);

    try {
      await api.admin.products.deletePermanent(candidate.id);
      setDeleteDialogProduct(null);
      setMessage({ text: "Product permanently deleted.", tone: "success" });

      if (drawerProductId === candidate.id) {
        setDrawerOpen(false);
        setDrawerProductId(null);
        setDrawerProduct(null);
      }

      await loadProducts();
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not permanently delete product."),
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

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setVendorFilter("ALL");
    setCategoryFilter("ALL");
    setPage(1);
  }

  const vendorsForFilter = useMemo(
    () => vendors.filter((vendor) => vendor.isActive && vendor.status === "APPROVED"),
    [vendors],
  );
  const hasFilters =
    search.trim().length > 0 ||
    statusFilter !== "ALL" ||
    vendorFilter !== "ALL" ||
    categoryFilter !== "ALL";

  return (
    <div className="admin-page-shell">
      <div className="admin-page-header">
        <div className="space-y-2">
          <p className="admin-page-eyebrow">Catalog moderation</p>
          <h2 className="admin-page-title">Product Review</h2>
          <p className="admin-page-description">
            Review vendor submissions and control marketplace visibility.
          </p>
        </div>
        <div className="admin-header-badge">
          {stats.pendingReview} pending
        </div>
      </div>

      {message ? <InlineMessage message={message} /> : null}

      <div className="admin-kpi-grid">
        <MetricCard label="Pending review" value={stats.pendingReview} tone="warning" />
        <MetricCard label="Published" value={stats.published} tone="success" />
        <MetricCard label="Rejected" value={stats.rejected} tone="danger" />
        <MetricCard label="Archived" value={stats.archived} tone="neutral" />
      </div>

      <Card className="admin-surface-card">
        <CardContent className="space-y-3 p-4">
          <div className="admin-filter-bar grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(300px,1fr)_155px_minmax(160px,190px)_minmax(160px,190px)_auto] xl:items-center">
            <div className="relative md:col-span-2 xl:col-span-1">
              <Input
                aria-label="Search products"
                className="pl-9"
                onChange={(event) => {
                  setPage(1);
                  setSearch(event.target.value);
                }}
                placeholder="Search by product, vendor, slug, category"
                type="search"
                value={search}
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </span>
            </div>
            <select
              aria-label="Filter product status"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value as ProductStatusFilter);
              }}
              value={statusFilter}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_REVIEW">Pending review</option>
              <option value="PUBLISHED">Published</option>
              <option value="REJECTED">Rejected</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select
              aria-label="Filter product vendor"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
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
              aria-label="Filter product category"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
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
            <div className="grid grid-cols-[1fr_auto] gap-3 xl:grid-cols-[auto_auto]">
              <div className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-slate-100 px-3 text-sm font-bold text-slate-700">
                {items.length} shown
              </div>
              <Button
                className="h-10 border-slate-200 px-3"
                disabled={!hasFilters}
                onClick={clearFilters}
                variant="secondary"
              >
                Clear
              </Button>
            </div>
          </div>

          {isLoading ? (
            <EmptyPanel text="Loading products." />
          ) : items.length === 0 ? (
            <EmptyPanel text="No products match these filters." />
          ) : (
            <div
              className="admin-table-shell overflow-auto bg-white"
              style={{ maxHeight: "clamp(420px, calc(100vh - 390px), 620px)" }}
            >
              <table className="admin-table min-w-[1180px] table-fixed xl:min-w-full">
                <colgroup>
                  {PRODUCT_TABLE_COLUMNS.map((column) => (
                    <col key={column.label} style={{ width: column.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {PRODUCT_TABLE_COLUMNS.map((column) => (
                      <th
                        className={`${PRODUCT_TABLE_HEADER_CELL_CLASS} ${column.headerClass}`}
                        key={column.key}
                      >
                        <span className={column.contentClass}>
                          {column.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr className="align-middle" key={item.id}>
                      <td className={PRODUCT_TABLE_COLUMN.image.cellClass}>
                        <div className={PRODUCT_TABLE_COLUMN.image.contentClass}>
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            {item.image ? (
                              <img alt={item.name} className="h-full w-full object-cover" src={item.image} />
                            ) : (
                              <span className="text-xs font-semibold text-slate-400">IMG</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={PRODUCT_TABLE_COLUMN.product.cellClass}>
                        <div className={PRODUCT_TABLE_COLUMN.product.contentClass}>
                          <p className="block max-w-full truncate text-left font-bold text-slate-950">{item.name}</p>
                          <p className="block max-w-full truncate text-left text-xs text-slate-500">{item.slug}</p>
                        </div>
                      </td>
                      <td className={PRODUCT_TABLE_COLUMN.vendor.cellClass}>
                        <p className={`truncate text-slate-700 ${PRODUCT_TABLE_COLUMN.vendor.contentClass}`}>
                          {item.vendorName}
                        </p>
                      </td>
                      <td className={PRODUCT_TABLE_COLUMN.category.cellClass}>
                        <p className={`truncate text-slate-700 ${PRODUCT_TABLE_COLUMN.category.contentClass}`}>
                          {item.categoryName}
                        </p>
                      </td>
                      <td className={`whitespace-nowrap font-semibold tabular-nums text-slate-950 ${PRODUCT_TABLE_COLUMN.price.cellClass}`}>
                        <span className={PRODUCT_TABLE_COLUMN.price.contentClass}>
                          {formatTnd(item.price)}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap tabular-nums text-slate-700 ${PRODUCT_TABLE_COLUMN.stock.cellClass}`}>
                        <span className={PRODUCT_TABLE_COLUMN.stock.contentClass}>
                          {item.stock}
                        </span>
                      </td>
                      <td className={PRODUCT_TABLE_COLUMN.status.cellClass}>
                        <div className={PRODUCT_TABLE_COLUMN.status.contentClass}>
                          <ProductStatusBadge status={item.status} />
                        </div>
                      </td>
                      <td className={`whitespace-nowrap text-slate-700 ${PRODUCT_TABLE_COLUMN.created.cellClass}`}>
                        <span className={PRODUCT_TABLE_COLUMN.created.contentClass}>
                          {formatProductTableDate(item.createdAt)}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap ${PRODUCT_TABLE_COLUMN.actions.cellClass}`}>
                        <div className={PRODUCT_TABLE_COLUMN.actions.contentClass}>
                          <ProductActionButtons
                            isWorking={activeProductId === item.id}
                            mode="row"
                            onApprove={() => approveProduct(item.id)}
                            onArchive={() => archiveProduct(item.id)}
                            onDelete={() => setDeleteDialogProduct(item)}
                            onReject={() => {
                              setRejectDialogProduct(item);
                              setRejectReason("");
                            }}
                            onRepublish={() => republishProduct(item.id)}
                            onView={() => openDrawer(item.id)}
                            product={item}
                          />
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

      <DashboardDrawer
        description="Review vendor submission details and control marketplace visibility."
        eyebrow="Product review"
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              className="h-9 shrink-0 border-slate-200 px-3"
              onClick={() => setDrawerOpen(false)}
              variant="secondary"
            >
              Close
            </Button>
            {drawerProduct ? (
              <ProductActionButtons
                isWorking={activeProductId === drawerProduct.id}
                mode="drawer"
                onApprove={() => approveProduct(drawerProduct.id)}
                onArchive={() => archiveProduct(drawerProduct.id)}
                onDelete={() => setDeleteDialogProduct(toListItemFromDetails(drawerProduct))}
                onReject={() => {
                  setRejectDialogProduct(toListItemFromDetails(drawerProduct));
                  setRejectReason("");
                }}
                onRepublish={() => republishProduct(drawerProduct.id)}
                product={drawerProduct}
                showView={false}
              />
            ) : null}
          </div>
        }
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        title="Product details"
        width="xl"
      >
        {drawerLoading ? (
          <EmptyPanel text="Loading product details." />
        ) : !drawerProduct ? (
          <EmptyPanel text="Product details unavailable." />
        ) : (
          <AdminProductDetailsPanel
            product={drawerProduct}
          />
        )}
      </DashboardDrawer>

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

      <DeleteProductDialog
        isWorking={deleteDialogProduct ? activeProductId === deleteDialogProduct.id : false}
        onCancel={() => setDeleteDialogProduct(null)}
        onConfirm={deleteProductPermanently}
        product={deleteDialogProduct}
      />
    </div>
  );
}

function AdminProductDetailsPanel({
  product,
}: {
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

      <ProductDeleteHistoryNote orderItemCount={product.orderItemCount} />
    </div>
  );
}

function ProductActionButtons({
  isWorking,
  mode = "row",
  onApprove,
  onArchive,
  onDelete,
  onReject,
  onRepublish,
  onView,
  product,
  showView = true,
}: {
  isWorking: boolean;
  mode?: "drawer" | "row";
  onApprove: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onReject: () => void;
  onRepublish: () => void;
  onView?: () => void;
  product: { id: string; orderItemCount?: number; status: Product["status"] };
  showView?: boolean;
}) {
  const isRow = mode === "row";
  const buttonSizeClass = isRow ? "!h-8 !text-[11px]" : "h-9";
  const buttonPaddingClass = isRow ? "!gap-1 !px-2" : "px-3";

  return (
    <div
      className={
        isRow
          ? "flex w-max max-w-full items-center justify-center gap-1 whitespace-nowrap"
          : "flex flex-wrap items-center justify-end gap-2"
      }
    >
      {showView && onView ? (
        <Button className={`${buttonSizeClass} border-slate-200 ${buttonPaddingClass}`} onClick={onView} variant="secondary">
          <EyeIcon />
          View
        </Button>
      ) : null}

      {product.status === "PENDING_REVIEW" ? (
        <Button
          className={`${buttonSizeClass} bg-market-600 ${buttonPaddingClass} shadow-sm shadow-market-600/20 hover:bg-market-700`}
          disabled={isWorking}
          onClick={onApprove}
        >
          <CheckIcon />
          Approve
        </Button>
      ) : null}

      {product.status === "PENDING_REVIEW" ? (
        <Button
          className={`${buttonSizeClass} border-red-200 bg-white ${buttonPaddingClass} text-red-700 hover:border-red-300 hover:bg-red-50`}
          disabled={isWorking}
          onClick={onReject}
          variant="secondary"
        >
          <XCircleIcon />
          Reject
        </Button>
      ) : null}

      {product.status === "PUBLISHED" ? (
        <Button
          className={`${buttonSizeClass} border-slate-300 ${buttonPaddingClass} text-slate-700 hover:border-slate-400 hover:bg-slate-100`}
          disabled={isWorking}
          onClick={onArchive}
          variant="secondary"
        >
          <ArchiveIcon />
          Archive
        </Button>
      ) : null}

      {product.status === "ARCHIVED" ? (
        <Button
          className={`${buttonSizeClass} border-market-200 bg-market-50 ${buttonPaddingClass} text-market-800 hover:border-market-300 hover:bg-market-100`}
          disabled={isWorking}
          onClick={onRepublish}
          variant="secondary"
        >
          <RotateCcwIcon />
          Republish
        </Button>
      ) : null}

      <ProductDeleteAction
        isWorking={isWorking}
        mode={mode}
        onDelete={onDelete}
        orderItemCount={product.orderItemCount}
      />
    </div>
  );
}

function ProductDeleteAction({
  isWorking,
  mode,
  onDelete,
  orderItemCount,
}: {
  isWorking: boolean;
  mode: "drawer" | "row";
  onDelete: () => void;
  orderItemCount?: number;
}) {
  const deleteAvailability = getDeleteAvailability(orderItemCount);
  const isDisabled = isWorking || !deleteAvailability.canDelete;
  const title = deleteAvailability.title;
  const drawerDeleteClass = deleteAvailability.canDelete
    ? "h-9 border-red-600 bg-red-600 px-3 text-white shadow-md shadow-red-600/20 hover:border-red-700 hover:bg-red-700 hover:text-white"
    : "h-9 border-red-200 bg-red-50 px-3 text-red-700 shadow-none hover:border-red-200 hover:bg-red-50 hover:text-red-700";

  if (mode === "row") {
    return (
      <span className="inline-flex" title={title}>
        <button
          aria-label={title}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/25 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          disabled={isDisabled}
          onClick={deleteAvailability.canDelete ? onDelete : undefined}
          type="button"
        >
          <Trash2Icon />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex" title={title}>
      <Button
        className={drawerDeleteClass}
        disabled={isDisabled}
        onClick={deleteAvailability.canDelete ? onDelete : undefined}
        variant="secondary"
      >
        <Trash2Icon />
        Delete
      </Button>
    </span>
  );
}

function getDeleteAvailability(orderItemCount: number | undefined) {
  if (orderItemCount === 0) {
    return {
      canDelete: true,
      title: DELETE_CAN_DELETE_TITLE,
      reason: DELETE_CONFIRMATION_TEXT,
    };
  }

  if (typeof orderItemCount === "number" && orderItemCount > 0) {
    return {
      canDelete: false,
      title: DELETE_ORDER_HISTORY_REASON,
      reason: DELETE_ORDER_HISTORY_REASON,
    };
  }

  return {
    canDelete: false,
    title: DELETE_UNKNOWN_REASON,
    reason: DELETE_UNKNOWN_REASON,
  };
}

function ProductDeleteHistoryNote({
  orderItemCount,
}: {
  orderItemCount?: number;
}) {
  if (typeof orderItemCount !== "number") {
    return null;
  }

  if (orderItemCount > 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm leading-6 text-amber-900">
        This product is linked to {orderItemCount} order(s), so it cannot be
        permanently deleted. Archive it to hide it from the marketplace while
        preserving order history.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm leading-6 text-slate-600">
      This product has no order history and can be permanently deleted if needed.
    </div>
  );
}

function formatProductTableDate(value: string | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function toListItemFromDetails(product: AdminProductDetails): AdminProductListItem {
  return {
    id: product.id,
    image: product.images[0]?.url ?? null,
    name: product.name,
    title: product.title,
    slug: product.slug,
    price: product.offerPrice ?? product.price,
    stock: product.stock,
    status: product.status,
    vendorName: product.vendor.storeName,
    categoryName: product.category.name,
    orderItemCount: product.orderItemCount,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function ProductStatusBadge({ status }: { status: Product["status"] }) {
  const badgeClass = "px-2 py-1 text-[11px]";

  if (status === "DRAFT") {
    return <Badge className={badgeClass} tone="neutral">Draft</Badge>;
  }

  if (status === "PENDING_REVIEW") {
    return <Badge className={badgeClass} tone="warning">Pending review</Badge>;
  }

  if (status === "PUBLISHED") {
    return <Badge className={badgeClass} tone="success">Published</Badge>;
  }

  if (status === "REJECTED") {
    return <Badge className={`bg-red-50 text-red-700 ${badgeClass}`} tone="neutral">Rejected</Badge>;
  }

  return <Badge className={`!border-slate-800 !bg-slate-900 !text-white ${badgeClass}`} tone="neutral">Archived</Badge>;
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
    <Card className="admin-kpi-card">
      <CardContent className="admin-kpi-card-content">
        <div>
          <p className="admin-kpi-label">{label}</p>
          <p className="admin-kpi-value">{value}</p>
        </div>
        <span className={`admin-kpi-dot ${toneClass}`} />
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4">
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

function DeleteProductDialog({
  isWorking,
  onCancel,
  onConfirm,
  product,
}: {
  isWorking: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  product: AdminProductListItem | null;
}) {
  if (!product) {
    return null;
  }

  const deleteAvailability = getDeleteAvailability(product.orderItemCount);
  const canDelete = deleteAvailability.canDelete;

  return (
    <div
      aria-label="Delete product confirmation"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-lg rounded-lg border border-red-100 bg-white p-5 shadow-2xl shadow-slate-950/25">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700">
            <Trash2Icon />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-950">
              {DELETE_CONFIRMATION_TEXT}
            </h4>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Products with order history cannot be permanently deleted and
              should be archived instead.
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {product.title ?? product.name}
            </p>
            {!canDelete ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                {deleteAvailability.reason}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700"
            disabled={isWorking || !canDelete}
            onClick={onConfirm}
          >
            <Trash2Icon />
            {isWorking ? "Deleting" : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
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

function ArchiveIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M6 7v12h12V7M9 11h6M5 4h14v3H5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function RotateCcwIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 7v5h5M3.5 12a8.5 8.5 0 1 0 2.49-6.01L3 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function Trash2Icon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m5 12 4 4L19 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15 9l-6 6M9 9l6 6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
