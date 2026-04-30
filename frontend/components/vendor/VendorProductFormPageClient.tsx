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

type ProductAvailability = "SHOWN" | "HIDDEN" | "OUT_OF_STOCK";

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
  imageUrls: [""],
  name: "",
  price: "",
  stockQuantity: "0",
};

const MAX_IMAGE_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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
  const [availability, setAvailability] = useState<ProductAvailability>(
    deriveAvailability(product),
  );
  const [message, setMessage] = useState<ProductFormMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDraft(product ? toDraft(product) : emptyDraft);
    setAvailability(deriveAvailability(product));
    setMessage(null);
  }, [mode, product?.id]);

  const imagePreviewUrls = useMemo(
    () => draft.imageUrls.map((url) => url.trim()).filter(Boolean),
    [draft.imageUrls],
  );
  const title = mode === "create" ? "Create a product" : product?.name ?? "Edit product";
  const submitLabel = isSubmitting ? "Saving" : "Save";
  const showVisibilityTodo = availability === "HIDDEN";
  const isSaveDisabled = !isDraftValid(draft, availability) || isSubmitting;

  async function importImageAt(index: number, file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage({
        text: "Please select a valid image file.",
        tone: "error",
      });
      return;
    }

    if (file.size > MAX_IMAGE_FILE_SIZE_BYTES) {
      setMessage({
        text: "Image is too large. Please use an image smaller than 5MB.",
        tone: "error",
      });
      return;
    }

    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setDraft((current) => {
        const nextImageUrls = [...current.imageUrls];

        while (nextImageUrls.length <= index) {
          nextImageUrls.push("");
        }

        nextImageUrls[index] = dataUrl;
        return {
          ...current,
          imageUrls: nextImageUrls,
        };
      });
      setMessage(null);
    } catch {
      setMessage({
        text: "Could not import image from your computer.",
        tone: "error",
      });
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
      const nextDraft =
        availability === "OUT_OF_STOCK"
          ? { ...draft, stockQuantity: "0" }
          : draft;
      const payload = toPayload(nextDraft);

      if (mode === "create") {
        await api.vendors.products.create(payload);
        await onSaved(
          showVisibilityTodo
            ? "Product created. Hidden visibility needs backend support."
            : "Product created.",
        );
        return;
      }

      if (!product) {
        throw new Error("Product is missing.");
      }

      await api.vendors.products.update(product.id, payload);

      // TODO: Persist Hidden visibility when the backend exposes a vendor visibility field.
      await onSaved(
        showVisibilityTodo
          ? "Product updated. Hidden visibility is simulated until backend support is added."
          : "Product updated.",
      );
    } catch (error) {
      setMessage({
        text: getProductFormError(error, "Could not save product."),
        tone: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[#0F1218]">
      <div className="sticky top-0 z-20 border-b border-[#242833] bg-[#11141B] px-4 py-4 shadow-lg shadow-black/35 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <button
              aria-label="Close product editor"
              className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#2A2E39] bg-[#171B23] text-lg font-bold text-[#A5ADBE] transition-colors hover:border-[#4B3628] hover:bg-[#241A14] hover:text-[#FF9B5D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A2D]/30"
              onClick={onCancel}
              type="button"
            >
              x
            </button>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-[#8E96A8]">
                Product editor
              </p>
              <h2 className="truncate text-xl font-bold text-white">{title}</h2>
              {mode === "edit" && product ? (
                <p className="mt-1 truncate text-xs text-[#8E96A8]">{product.slug}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Product visibility"
              className="h-10 rounded-lg border border-[#2A2E39] bg-[#171B23] px-3 text-sm font-bold text-[#EEF0F4] outline-none transition focus:border-[#FF6A2D] focus:ring-2 focus:ring-[#FF6A2D]/20"
              onChange={(event) =>
                setAvailability(event.target.value as ProductAvailability)
              }
              value={availability}
            >
              <option value="SHOWN">Shown</option>
              <option value="HIDDEN">Hidden</option>
              <option value="OUT_OF_STOCK">Out of stock</option>
            </select>
            <Button
              className="h-10 bg-gradient-to-r from-[#FF6A2D] to-[#FF8F40] px-5 shadow-lg shadow-orange-950/35 hover:from-[#FF7A3B] hover:to-[#FF9D56] focus-visible:ring-[#FF6A2D]/30"
              disabled={isSaveDisabled}
              form={formId}
              type="submit"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 p-4 sm:p-5">
        {message ? <InlineMessage message={message} /> : null}

        {showVisibilityTodo ? (
          <div className="rounded-lg border border-[#3D2D22] bg-[#261C16] px-4 py-3 text-sm leading-6 text-[#FFB07E]">
            Hidden is a visibility state, not archive. The backend does not persist
            vendor visibility yet, so this is simulated in the editor for now.
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <form className="space-y-4" id={formId} onSubmit={handleSubmit}>
            <Card className="overflow-hidden border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
              <SectionHeader eyebrow="Details" title="Product identity" />
              <CardContent className="space-y-5">
                <ImageUrlEditor
                  imageUrls={draft.imageUrls}
                  onAdd={() =>
                    setDraft((current) => ({
                      ...current,
                      imageUrls: [...current.imageUrls, ""],
                    }))
                  }
                  onChange={(index, value) =>
                    setDraft((current) => ({
                      ...current,
                      imageUrls: current.imageUrls.map((url, currentIndex) =>
                        currentIndex === index ? value : url,
                      ),
                    }))
                  }
                  onImport={(index, file) => {
                    void importImageAt(index, file);
                  }}
                  onRemove={(index) =>
                    setDraft((current) => ({
                      ...current,
                      imageUrls:
                        current.imageUrls.length === 1
                          ? [""]
                          : current.imageUrls.filter((_, currentIndex) => currentIndex !== index),
                    }))
                  }
                  previewUrls={imagePreviewUrls}
                />

                <Field label="Product title" name="name">
                  <Input
                    className="border-[#2A2E39] bg-[#171B23] text-[#EEF0F4] placeholder:text-[#737B8D] focus:border-[#FF6A2D] focus:ring-[#FF6A2D]/20"
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
                    className="h-10 w-full rounded-lg border border-[#2A2E39] bg-[#171B23] px-3 text-sm text-[#EEF0F4] outline-none transition focus:border-[#FF6A2D] focus:ring-2 focus:ring-[#FF6A2D]/20"
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

            <Card className="overflow-hidden border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
              <SectionHeader eyebrow="Pricing" title="Selling price" />
              <CardContent className="space-y-4">
                <Field label="Price" name="price">
                  <Input
                    className="border-[#2A2E39] bg-[#171B23] text-[#EEF0F4] placeholder:text-[#737B8D] focus:border-[#FF6A2D] focus:ring-[#FF6A2D]/20"
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

            <Card className="overflow-hidden border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
              <SectionHeader eyebrow="Inventory" title="Stock quantity" />
              <CardContent className="space-y-4">
                <Field label="Stock quantity" name="stockQuantity">
                  <Input
                    className="border-[#2A2E39] bg-[#171B23] text-[#EEF0F4] placeholder:text-[#737B8D] focus:border-[#FF6A2D] focus:ring-[#FF6A2D]/20"
                    disabled={availability === "OUT_OF_STOCK"}
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
                    value={availability === "OUT_OF_STOCK" ? "0" : draft.stockQuantity}
                  />
                </Field>
                <div className="rounded-lg border border-[#2A2E39] bg-[#171B23] px-4 py-3 text-sm leading-6 text-[#98A0B2]">
                  Out of stock keeps the product record visible but saves stock as 0.
                  Archive remains a separate catalog action.
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
              <SectionHeader eyebrow="Description" title="Buyer-facing content" />
              <CardContent>
                <textarea
                  className="min-h-44 w-full resize-y rounded-lg border border-[#2A2E39] bg-[#171B23] px-3 py-3 text-sm leading-6 text-[#EEF0F4] outline-none transition placeholder:text-[#737B8D] focus:border-[#FF6A2D] focus:ring-2 focus:ring-[#FF6A2D]/20"
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
            availability={availability}
            draft={draft}
            imageUrl={imagePreviewUrls[0]}
            productStatus={product?.status}
          />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-[#242833] bg-[#11141B] px-4 py-3 shadow-[0_-10px_30px_rgba(0,0,0,0.45)] sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <Button
            className="border-[#2A2E39] bg-[#171B23] text-[#D2D7E0] hover:border-[#353A48] hover:bg-[#1D212B]"
            onClick={onCancel}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-[#FF6A2D] to-[#FF8F40] hover:from-[#FF7A3B] hover:to-[#FF9D56] focus-visible:ring-[#FF6A2D]/30"
            disabled={isSaveDisabled}
            form={formId}
            type="submit"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="border-b border-[#242833] px-4 py-4 text-white sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-normal text-[#FF9B5D]">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-lg font-bold">{title}</h3>
    </div>
  );
}

function ImageUrlEditor({
  imageUrls,
  onAdd,
  onChange,
  onImport,
  onRemove,
  previewUrls,
}: {
  imageUrls: string[];
  onAdd: () => void;
  onChange: (index: number, value: string) => void;
  onImport: (index: number, file: File) => void;
  onRemove: (index: number) => void;
  previewUrls: string[];
}) {
  const primaryPreview = previewUrls[0];
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const [targetIndex, setTargetIndex] = useState<number>(0);

  function openFilePicker(index: number) {
    setTargetIndex(index);
    filePickerRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onImport(targetIndex, file);
    event.target.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold text-[#E8EBF2]" htmlFor="imageUrl-0">
          Images
        </label>
        <Button
          className="h-9 border-[#4B3628] bg-[#241A14] px-3 text-xs text-[#FF9B5D] hover:border-[#664735] hover:bg-[#2B1F17]"
          onClick={onAdd}
          variant="secondary"
        >
          Add photo slot
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)]">
        <div className="space-y-2">
          <button
            className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#4B3628] bg-[#241A14] transition hover:bg-[#2E2119] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A2D]/30"
            onClick={() => openFilePicker(0)}
            type="button"
          >
            {primaryPreview ? (
              <img
                alt="Primary product preview"
                className="h-full w-full object-cover"
                src={primaryPreview}
              />
            ) : (
              <span className="text-center text-xs font-bold text-[#FF9B5D]">
                Import photo
                <br />
                800 x 800
              </span>
            )}
          </button>
          {previewUrls.length > 1 ? (
            <div className="grid grid-cols-3 gap-2">
              {previewUrls.slice(1, 4).map((url) => (
                <div
                  className="flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-[#2A2E39] bg-[#171B23]"
                  key={url}
                >
                  <img alt="Product preview" className="h-full w-full object-cover" src={url} />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          {imageUrls.map((url, index) => (
            <div className="flex gap-2" key={index}>
              <Input
                className="border-[#2A2E39] bg-[#171B23] text-[#EEF0F4] placeholder:text-[#737B8D] focus:border-[#FF6A2D] focus:ring-[#FF6A2D]/20"
                id={`imageUrl-${index}`}
                onChange={(event) => onChange(index, event.target.value)}
                placeholder="https://example.com/product-image.jpg or imported image"
                value={url}
              />
              <button
                className="h-10 rounded-lg border border-[#4B3628] bg-[#241A14] px-3 text-xs font-bold text-[#FF9B5D] transition-colors hover:border-[#664735] hover:bg-[#2B1F17] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A2D]/30"
                onClick={() => openFilePicker(index)}
                type="button"
              >
                Import
              </button>
              <button
                aria-label={`Remove image URL ${index + 1}`}
                className="h-10 rounded-lg border border-[#2A2E39] bg-[#171B23] px-3 text-xs font-bold text-[#9FA6B7] transition-colors hover:border-red-900/40 hover:bg-red-950/20 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A2D]/30"
                onClick={() => onRemove(index)}
                type="button"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <input
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        ref={filePickerRef}
        type="file"
      />
    </div>
  );
}

function ProductPreviewCard({
  availability,
  draft,
  imageUrl,
  productStatus,
}: {
  availability: ProductAvailability;
  draft: ProductFormDraft;
  imageUrl?: string;
  productStatus?: Product["status"];
}) {
  return (
    <aside className="space-y-3 xl:sticky xl:top-28 xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-normal text-[#8E96A8]">
        Live preview
      </p>
      <Card className="overflow-hidden border-[#242833] bg-[#11141B] shadow-xl shadow-black/30">
        <div className="flex aspect-square items-center justify-center bg-[#241A14]">
          {imageUrl ? (
            <img alt="Product preview" className="h-full w-full object-cover" src={imageUrl} />
          ) : (
            <span className="text-sm font-bold text-[#FF9B5D]">Product image</span>
          )}
        </div>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="line-clamp-2 font-bold text-white">
                {draft.name.trim() || "Product title"}
              </p>
              <p className="mt-1 text-sm font-bold text-[#FF6A2D]">
                {formatTnd(draft.price)}
              </p>
            </div>
            <AvailabilityBadge availability={availability} status={productStatus} />
          </div>
          <div className="rounded-lg border border-[#2A2E39] bg-[#171B23] px-3 py-2 text-sm text-[#9CA4B5]">
            Stock:{" "}
            <span className="font-bold text-[#EEF0F4]">
              {availability === "OUT_OF_STOCK" ? "0" : draft.stockQuantity || "0"}
            </span>
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
      <label className="text-sm font-bold text-[#E8EBF2]" htmlFor={name}>
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
          ? "rounded-lg border border-emerald-900/35 bg-emerald-950/20 px-3 py-2 text-sm font-medium text-emerald-300"
          : "rounded-lg border border-red-900/35 bg-red-950/20 px-3 py-2 text-sm font-medium text-red-300"
      }
    >
      {message.text}
    </p>
  );
}

function ProductStatusBadge({ status }: { status?: Product["status"] }) {
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

  if (status === "ARCHIVED") {
    return <Badge className="border-[#2A2E39] bg-[#181C24] text-[#A6ADBD]">Archived</Badge>;
  }

  return (
    <Badge className="border-[#3D2D22] bg-[#261C16] text-[#FF9B5D]" tone="neutral">
      Pending approval
    </Badge>
  );
}

function AvailabilityBadge({
  availability,
  status,
}: {
  availability: ProductAvailability;
  status?: Product["status"];
}) {
  if (availability === "HIDDEN") {
    return (
      <Badge className="border-[#2A2E39] bg-[#181C24] text-[#A6ADBD]" tone="neutral">
        Hidden
      </Badge>
    );
  }

  if (availability === "OUT_OF_STOCK") {
    return (
      <Badge className="border-red-900/35 bg-red-950/20 text-red-300" tone="neutral">
        Out
      </Badge>
    );
  }

  return <ProductStatusBadge status={status} />;
}

function toDraft(product: Product): ProductFormDraft {
  const imageUrls = product.images?.map((image) => image.url) ?? [];

  return {
    categoryId: product.categoryId,
    description: product.description,
    imageUrls: imageUrls.length > 0 ? imageUrls : [""],
    name: product.name,
    price: String(product.price),
    stockQuantity: String(product.stockQuantity),
  };
}

function toPayload(draft: ProductFormDraft): VendorProductPayload {
  return {
    categoryId: draft.categoryId,
    description: draft.description.trim() || undefined,
    imageUrls: draft.imageUrls.map((url) => url.trim()).filter(Boolean),
    name: draft.name.trim(),
    price: Number(draft.price),
    stockQuantity: Number(draft.stockQuantity),
  };
}

function readImageFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Invalid file payload"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function deriveAvailability(product?: Product | null): ProductAvailability {
  if (!product) {
    return "SHOWN";
  }

  if (product.stockQuantity <= 0) {
    return "OUT_OF_STOCK";
  }

  return "SHOWN";
}

function isDraftValid(draft: ProductFormDraft, availability: ProductAvailability) {
  const price = Number(draft.price);
  const stock = availability === "OUT_OF_STOCK" ? 0 : Number(draft.stockQuantity);

  return (
    draft.name.trim().length > 0 &&
    draft.categoryId.length > 0 &&
    Number.isFinite(price) &&
    price > 0 &&
    Number.isFinite(stock) &&
    stock >= 0
  );
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


