"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import type { Category, Product, VendorProductPayload } from "@/types";

type ProductFormDraft = {
  categoryId: string;
  description: string;
  imageUrls: string[];
  name: string;
  price: string;
  stockQuantity: string;
};

type ProductFormMessage = {
  text: string;
  tone: "success" | "error";
};

type SubmitIntent = "save" | "publish";

type VendorProductFormProps = {
  categories: Category[];
  mode: "create" | "edit";
  onCancel: () => void;
  onSaved: (message: string) => void | Promise<void>;
  product?: Product | null;
};

const emptyDraft: ProductFormDraft = {
  categoryId: "",
  description: "",
  imageUrls: [],
  name: "",
  price: "",
  stockQuantity: "0",
};

const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGES = 6;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export function VendorProductForm({
  categories,
  mode,
  onCancel,
  onSaved,
  product,
}: VendorProductFormProps) {
  const formId = useId();
  const [draft, setDraft] = useState<ProductFormDraft>(
    product ? toDraft(product) : emptyDraft,
  );
  const [message, setMessage] = useState<ProductFormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitIntent, setSubmitIntent] = useState<SubmitIntent>(
    mode === "create" ? "publish" : "save",
  );
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  useEffect(() => {
    setDraft(product ? toDraft(product) : emptyDraft);
    setSubmitIntent(mode === "create" ? "publish" : "save");
    setMessage(null);
  }, [mode, product?.id]);

  const imagePreviewUrls = useMemo(
    () => draft.imageUrls.map((url) => url.trim()).filter(Boolean),
    [draft.imageUrls],
  );

  const statusForDisplay = product?.status ?? "DRAFT";
  const title = mode === "create" ? "Create a product" : product?.name ?? "Edit product";
  const canPublishFromEdit =
    mode === "edit" && (product?.status === "DRAFT" || product?.status === "REJECTED");
  const isSaveDisabled = !isDraftValid(draft) || isSubmitting || isUploadingImages;

  async function uploadImages(files: FileList | File[]) {
    const selectedFiles = Array.from(files);

    if (selectedFiles.length === 0) {
      return;
    }

    if (draft.imageUrls.length + selectedFiles.length > MAX_IMAGES) {
      setMessage({
        text: `You can upload up to ${MAX_IMAGES} images per product.`,
        tone: "error",
      });
      return;
    }

    setIsUploadingImages(true);
    setMessage(null);

    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        if (!isSupportedImageFile(file)) {
          throw new Error("Only PNG, JPG, JPEG, WEBP, or GIF images are supported.");
        }

        if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
          throw new Error("Image is too large. Please upload a smaller image.");
        }

        const response = await api.vendors.products.uploadImage(file);
        uploadedUrls.push(normalizeImageUrlForPayload(response.url));
      }

      setDraft((current) => {
        const mergedUrls = [...current.imageUrls, ...uploadedUrls];
        const uniqueUrls = mergedUrls.filter((url, index) => mergedUrls.indexOf(url) === index);

        return {
          ...current,
          imageUrls: uniqueUrls,
        };
      });
    } catch (error) {
      setMessage({
        text: getImageUploadError(error),
        tone: "error",
      });
    } finally {
      setIsUploadingImages(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSaveDisabled) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = toPayload(draft);
      const intent = submitIntent;

      if (mode === "create") {
        const createdProduct = await api.vendors.products.create(payload);

        if (intent === "publish") {
          await api.vendors.products.publish(createdProduct.id);
          await onSaved("Product submitted for admin review");
          return;
        }

        await onSaved("Product saved as draft.");
        return;
      }

      if (!product) {
        throw new Error("Product is missing.");
      }

      const updatedProduct = await api.vendors.products.update(product.id, payload);

      if (intent === "publish" && canPublishFromEdit) {
        await api.vendors.products.publish(updatedProduct.id);
        await onSaved("Product submitted for admin review");
        return;
      }

      await onSaved("Product updated.");
    } catch (error) {
      setMessage({
        text: getProductFormError(error, "Could not save product."),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const saveLabel = mode === "create" ? "Save as draft" : "Save changes";
  const publishLabel = mode === "create" ? "Publish" : "Publish for review";

  return (
    <div className="vendor-editor flex h-full min-h-0 flex-col">
      <div className="vendor-topbar sticky top-0 z-20 border-b px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              aria-label="Close product editor"
              className="vendor-icon-button mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg font-bold transition-colors focus-visible:outline-none focus-visible:ring-2"
              onClick={onCancel}
              type="button"
            >
              x
            </button>
            <div className="min-w-0">
              <p className="vendor-muted text-xs font-semibold uppercase tracking-normal">
                Product editor
              </p>
              <h2 className="vendor-title truncate text-xl font-bold">{title}</h2>
              {mode === "edit" && product ? (
                <p className="vendor-muted mt-1 truncate text-xs">{product.slug}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ProductStatusBadge status={statusForDisplay} />
            <Button
              className="vendor-secondary-action h-10 px-4"
              disabled={isSaveDisabled}
              form={formId}
              onClick={() => setSubmitIntent("save")}
              type="submit"
              variant="secondary"
            >
              {isSubmitting && submitIntent === "save" ? "Saving" : saveLabel}
            </Button>
            {mode === "create" || canPublishFromEdit ? (
              <Button
                className="vendor-primary-action h-10 px-5"
                disabled={isSaveDisabled}
                form={formId}
                onClick={() => setSubmitIntent("publish")}
                type="submit"
              >
                {isSubmitting && submitIntent === "publish" ? "Publishing" : publishLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
        <div className="space-y-4">
          {message ? <InlineMessage message={message} /> : null}

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
            <form className="space-y-4" id={formId} onSubmit={handleSubmit}>
              <Card className="vendor-card overflow-hidden">
                <SectionHeader eyebrow="Details" title="Product identity" />
                <CardContent className="space-y-5">
                  <ImagePickerEditor
                    imageUrls={draft.imageUrls}
                    isUploading={isUploadingImages}
                    onAddFiles={(files) => {
                      void uploadImages(files);
                    }}
                    onRemove={(index) =>
                      setDraft((current) => ({
                        ...current,
                        imageUrls: current.imageUrls.filter((_, currentIndex) => currentIndex !== index),
                      }))
                    }
                  />

                  <Field label="Product title" name="name">
                    <Input
                      className="vendor-input"
                      id="name"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, name: event.target.value }))
                      }
                      placeholder="Product title"
                      required
                      value={draft.name}
                    />
                  </Field>

                  <Field label="Category" name="categoryId">
                    <select
                      className="vendor-select h-10 w-full rounded-lg px-3 text-sm outline-none transition focus:ring-2"
                      id="categoryId"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, categoryId: event.target.value }))
                      }
                      required
                      value={draft.categoryId}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </CardContent>
              </Card>

              <Card className="vendor-card overflow-hidden">
                <SectionHeader eyebrow="Pricing" title="Selling price" />
                <CardContent className="space-y-4">
                  <Field label="Price" name="price">
                    <Input
                      className="vendor-input"
                      id="price"
                      min="0.001"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, price: event.target.value }))
                      }
                      placeholder="0.000"
                      required
                      step="0.001"
                      type="number"
                      value={draft.price}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card className="vendor-card overflow-hidden">
                <SectionHeader eyebrow="Inventory" title="Stock quantity" />
                <CardContent className="space-y-4">
                  <Field label="Stock quantity" name="stockQuantity">
                    <Input
                      className="vendor-input"
                      id="stockQuantity"
                      min={0}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          stockQuantity: event.target.value,
                        }))
                      }
                      required
                      type="number"
                      value={draft.stockQuantity}
                    />
                  </Field>
                </CardContent>
              </Card>

              <Card className="vendor-card overflow-hidden">
                <SectionHeader eyebrow="Description" title="Buyer-facing content" />
                <CardContent>
                  <textarea
                    className="vendor-input min-h-44 w-full resize-y rounded-lg px-3 py-3 text-sm leading-6 outline-none transition focus:ring-2"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, description: event.target.value }))
                    }
                    placeholder="Write a clear buyer-facing product description."
                    value={draft.description}
                  />
                </CardContent>
              </Card>
            </form>

            <ProductPreviewCard
              draft={draft}
              imageUrl={imagePreviewUrls[0]}
              productStatus={statusForDisplay}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="vendor-divider border-b px-4 py-4 sm:px-5">
      <p className="vendor-accent-text text-xs font-semibold uppercase tracking-normal">
        {eyebrow}
      </p>
      <h3 className="vendor-title mt-1 text-lg font-bold">{title}</h3>
    </div>
  );
}

function ImagePickerEditor({
  imageUrls,
  isUploading,
  onAddFiles,
  onRemove,
}: {
  imageUrls: string[];
  isUploading: boolean;
  onAddFiles: (files: FileList) => void;
  onRemove: (index: number) => void;
}) {
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const primaryImageUrl = imageUrls[0];
  const galleryImageUrls = imageUrls.slice(1);

  function openFilePicker() {
    filePickerRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;

    if (!files || files.length === 0) {
      return;
    }

    onAddFiles(files);
    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="vendor-title text-sm font-bold">Images</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <div className="vendor-image-cell relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-dashed">
          <button
            className="flex h-full w-full items-center justify-center bg-transparent transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/25"
            disabled={isUploading}
            onClick={openFilePicker}
            type="button"
          >
            {primaryImageUrl ? (
              <img
                alt="Primary product preview"
                className="h-full w-full object-cover"
                src={primaryImageUrl}
              />
            ) : (
              <span className="px-2 text-center text-xs">
                <span className="vendor-title block font-semibold">Click to add photos</span>
                <span className="vendor-muted block font-medium">PNG JPG WEBP GIF</span>
              </span>
            )}
          </button>
          {primaryImageUrl ? (
            <button
              aria-label="Remove image 1"
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-xs font-bold text-white transition hover:bg-slate-950"
              onClick={() => onRemove(0)}
              type="button"
            >
              x
            </button>
          ) : null}
        </div>

        {galleryImageUrls.map((url, index) => {
          const imageIndex = index + 1;

          return (
            <div
              className="vendor-image-cell relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border"
              key={`${url}-${imageIndex}`}
            >
              <button
                aria-label={`Add more photos from image ${imageIndex + 1}`}
                className="h-full w-full"
                disabled={isUploading}
                onClick={openFilePicker}
                type="button"
              >
                <img alt={`Product preview ${imageIndex + 1}`} className="h-full w-full object-cover" src={url} />
              </button>
              <button
                aria-label={`Remove image ${imageIndex + 1}`}
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/75 text-xs font-bold text-white transition hover:bg-slate-950"
                onClick={() => onRemove(imageIndex)}
                type="button"
              >
                x
              </button>
            </div>
          );
        })}

        {imageUrls.length < MAX_IMAGES ? (
          <div className="vendor-image-cell flex aspect-square items-center justify-center rounded-lg border border-dashed">
            <button
              className="h-full w-full text-xs font-semibold transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/25"
              disabled={isUploading}
              onClick={openFilePicker}
              type="button"
            >
              <span className="vendor-accent-text">+ Add photo</span>
            </button>
          </div>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">Up to {MAX_IMAGES} images, max 5MB each.</p>

      <input
        accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        multiple
        onChange={handleFileChange}
        ref={filePickerRef}
        type="file"
      />
    </div>
  );
}

function ProductPreviewCard({
  draft,
  imageUrl,
  productStatus,
}: {
  draft: ProductFormDraft;
  imageUrl?: string;
  productStatus: Product["status"];
}) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-28 xl:self-start">
      <p className="vendor-muted text-xs font-semibold uppercase tracking-normal">
        Live preview
      </p>
      <Card className="vendor-card overflow-hidden">
        <div className="vendor-upload-zone flex aspect-square items-center justify-center">
          {imageUrl ? (
            <img alt="Product preview" className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <span className="vendor-accent-text text-sm font-bold">Product image</span>
          )}
        </div>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="vendor-title line-clamp-2 font-bold">
                {draft.name.trim() || "Product title"}
              </p>
              <p className="vendor-accent-text mt-1 text-sm font-bold">
                {formatTnd(draft.price)}
              </p>
            </div>
            <ProductStatusBadge status={productStatus} />
          </div>
          <div className="vendor-panel-inset rounded-lg border px-3 py-2 text-sm">
            Stock: <span className="vendor-title font-bold">{draft.stockQuantity || "0"}</span>
          </div>
        </CardContent>
      </Card>
    </aside>
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
      <label className="vendor-title text-sm font-bold" htmlFor={name}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InlineMessage({ message }: { message: ProductFormMessage }) {
  return (
    <p
      className={
        message.tone === "success"
          ? "vendor-alert-success rounded-lg px-3 py-2 text-sm font-medium"
          : "vendor-alert-error rounded-lg px-3 py-2 text-sm font-medium"
      }
    >
      {message.text}
    </p>
  );
}

function ProductStatusBadge({ status }: { status?: Product["status"] }) {
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

  if (status === "ARCHIVED") {
    return <Badge className="vendor-status-neutral">Archived</Badge>;
  }

  return (
    <Badge className="vendor-status-neutral" tone="neutral">
      Draft
    </Badge>
  );
}

function toDraft(product: Product): ProductFormDraft {
  const imageUrls = product.images?.map((image) => image.url) ?? [];

  return {
    categoryId: product.categoryId,
    description: product.description,
    imageUrls,
    name: product.name,
    price: String(product.price),
    stockQuantity: String(product.stockQuantity),
  };
}

function toPayload(draft: ProductFormDraft): VendorProductPayload {
  return {
    categoryId: draft.categoryId,
    description: draft.description.trim() || undefined,
    imageUrls: draft.imageUrls
      .map((url) => normalizeImageUrlForPayload(url))
      .filter(Boolean),
    name: draft.name.trim(),
    price: Number(draft.price),
    stockQuantity: Number(draft.stockQuantity),
  };
}

function isDraftValid(draft: ProductFormDraft) {
  const price = Number(draft.price);
  const stock = Number(draft.stockQuantity);

  return (
    draft.name.trim().length > 0 &&
    draft.categoryId.length > 0 &&
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(stock) &&
    stock >= 0
  );
}

function getImageUploadError(error: unknown) {
  if (error instanceof ApiError) {
    const text = error.message.toLowerCase();
    if (error.status === 413 || text.includes("too large") || text.includes("file too large")) {
      return "Image is too large. Please upload a smaller image.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("too large")) {
      return "Image is too large. Please upload a smaller image.";
    }

    return error.message;
  }

  return "Could not upload image.";
}

function isSupportedImageFile(file: File) {
  const normalizedType = file.type.toLowerCase();

  if (ALLOWED_IMAGE_MIME_TYPES.has(normalizedType)) {
    return true;
  }

  return /\.(png|jpe?g|webp|gif)$/i.test(file.name);
}

function normalizeImageUrlForPayload(url: string) {
  const trimmed = url.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  if (trimmed.startsWith("/api/uploads/product-images/")) {
    return trimmed;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (typeof window !== "undefined") {
    return new URL(trimmed, window.location.origin).toString();
  }

  return trimmed;
}

function getProductFormError(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
