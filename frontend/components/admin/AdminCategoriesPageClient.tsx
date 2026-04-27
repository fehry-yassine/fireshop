"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { getErrorMessage } from "@/components/admin/adminUtils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import type { Category } from "@/types";

type CategoryDraft = {
  description: string;
  isActive: boolean;
  name: string;
  parentId: string;
  slug: string;
};

type CategoryMessage = {
  categoryId?: string;
  text: string;
  tone: "success" | "error";
};

export function AdminCategoriesPageClient() {
  return (
    <AdminAccessGate>
      <AdminDashboardFrame>
        <AdminCategoriesContent />
      </AdminDashboardFrame>
    </AdminAccessGate>
  );
}

function AdminCategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CategoryDraft>>({});
  const [message, setMessage] = useState<CategoryMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  useEffect(() => {
    void loadCategories();
  }, []);

  async function loadCategories() {
    setIsLoading(true);
    setMessage(null);

    try {
      const response = await api.admin.categories.list();
      setCategories(response);
      setDrafts(Object.fromEntries(response.map((category) => [category.id, toDraft(category)])));
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not load categories."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();

    if (!name) {
      setMessage({ text: "Category name is required.", tone: "error" });
      return;
    }

    try {
      await api.admin.categories.create({
        name,
        description: cleanOptional(String(formData.get("description") ?? "")),
        isActive: formData.get("isActive") === "on",
        parentId: cleanNullable(String(formData.get("parentId") ?? "")),
        slug: cleanOptional(String(formData.get("slug") ?? "")),
      });
      event.currentTarget.reset();
      setMessage({ text: "Category created.", tone: "success" });
      await loadCategories();
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not create category."),
        tone: "error",
      });
    }
  }

  async function updateCategory(category: Category) {
    const draft = drafts[category.id];

    if (!draft) {
      return;
    }

    setActiveCategoryId(category.id);
    setMessage(null);

    try {
      await api.admin.categories.update(category.id, {
        name: draft.name.trim(),
        description: cleanOptional(draft.description),
        isActive: draft.isActive,
        parentId: cleanNullable(draft.parentId),
        slug: cleanOptional(draft.slug),
      });
      setMessage({
        categoryId: category.id,
        text: "Category updated.",
        tone: "success",
      });
      await loadCategories();
    } catch (error) {
      setMessage({
        categoryId: category.id,
        text: getErrorMessage(error, "Could not update category."),
        tone: "error",
      });
    } finally {
      setActiveCategoryId(null);
    }
  }

  async function deleteCategory(category: Category) {
    setActiveCategoryId(category.id);
    setMessage(null);

    try {
      await api.admin.categories.delete(category.id);
      setMessage({
        categoryId: category.id,
        text: "Category archived.",
        tone: "success",
      });
      await loadCategories();
    } catch (error) {
      setMessage({
        categoryId: category.id,
        text: getErrorMessage(error, "Could not archive category."),
        tone: "error",
      });
    } finally {
      setActiveCategoryId(null);
    }
  }

  const rootCategories = categories.filter((category) => !category.parentId);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-market-700">Catalog structure</p>
        <h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">
          Categories
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Add, edit, and archive marketplace categories. The backend currently exposes
          the public category list for reads and admin endpoints for mutations.
        </p>
      </div>

      {message && !message.categoryId ? <InlineMessage message={message} /> : null}

      <Card>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Create category</h3>
            <p className="text-sm text-slate-500">Use a parent only for subcategories.</p>
          </div>

          <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end" onSubmit={createCategory}>
            <Field label="Name" name="name">
              <Input id="name" name="name" required />
            </Field>
            <Field label="Slug" name="slug">
              <Input id="slug" name="slug" placeholder="Optional" />
            </Field>
            <Field label="Parent" name="parentId">
              <select
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                id="parentId"
                name="parentId"
              >
                <option value="">Main category</option>
                {rootCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="submit">Create</Button>
            <div className="lg:col-span-3">
              <Field label="Description" name="description">
                <Input id="description" name="description" placeholder="Optional" />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input className="h-4 w-4 rounded border-slate-300" defaultChecked name="isActive" type="checkbox" />
              Active
            </label>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950">Manage categories</h3>
              <p className="text-sm text-slate-500">Update active categories and archive unused ones.</p>
            </div>
            <Badge tone="neutral">{categories.length} visible</Badge>
          </div>

          {isLoading ? (
            <EmptyPanel text="Loading categories." />
          ) : categories.length === 0 ? (
            <EmptyPanel text="No categories found." />
          ) : (
            <div className="space-y-4">
              {categories.map((category) => (
                <CategoryEditor
                  activeCategoryId={activeCategoryId}
                  category={category}
                  draft={drafts[category.id] ?? toDraft(category)}
                  key={category.id}
                  message={message?.categoryId === category.id ? message : null}
                  onArchive={() => deleteCategory(category)}
                  onDraftChange={(draft) =>
                    setDrafts((current) => ({ ...current, [category.id]: draft }))
                  }
                  onUpdate={() => updateCategory(category)}
                  rootCategories={rootCategories.filter((root) => root.id !== category.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryEditor({
  activeCategoryId,
  category,
  draft,
  message,
  onArchive,
  onDraftChange,
  onUpdate,
  rootCategories,
}: {
  activeCategoryId: string | null;
  category: Category;
  draft: CategoryDraft;
  message: CategoryMessage | null;
  onArchive: () => void;
  onDraftChange: (draft: CategoryDraft) => void;
  onUpdate: () => void;
  rootCategories: Category[];
}) {
  const isActive = activeCategoryId === category.id;

  return (
    <div className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-950">{category.name}</h4>
          <p className="break-all text-xs text-slate-500">{category.slug}</p>
        </div>
        <Badge tone={category.parentId ? "neutral" : "success"}>
          {category.parentId ? "Subcategory" : "Main category"}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Name" name={`name-${category.id}`}>
          <Input
            id={`name-${category.id}`}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            value={draft.name}
          />
        </Field>
        <Field label="Slug" name={`slug-${category.id}`}>
          <Input
            id={`slug-${category.id}`}
            onChange={(event) => onDraftChange({ ...draft, slug: event.target.value })}
            value={draft.slug}
          />
        </Field>
        <Field label="Parent" name={`parent-${category.id}`}>
          <select
            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
            id={`parent-${category.id}`}
            onChange={(event) => onDraftChange({ ...draft, parentId: event.target.value })}
            value={draft.parentId}
          >
            <option value="">Main category</option>
            {rootCategories.map((root) => (
              <option key={root.id} value={root.id}>
                {root.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end text-sm font-semibold text-slate-700">
          <input
            checked={draft.isActive}
            className="h-4 w-4 rounded border-slate-300"
            onChange={(event) => onDraftChange({ ...draft, isActive: event.target.checked })}
            type="checkbox"
          />
          Active
        </label>
      </div>

      <Field label="Description" name={`description-${category.id}`}>
        <Input
          id={`description-${category.id}`}
          onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
          value={draft.description}
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        <Button disabled={isActive} onClick={onUpdate}>
          {isActive ? "Saving" : "Save"}
        </Button>
        <Button disabled={isActive} onClick={onArchive} variant="secondary">
          Archive
        </Button>
      </div>

      {message ? <InlineMessage message={message} /> : null}
    </div>
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

function InlineMessage({ message }: { message: CategoryMessage }) {
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

function toDraft(category: Category): CategoryDraft {
  return {
    description: category.description ?? "",
    isActive: category.isActive ?? true,
    name: category.name,
    parentId: category.parentId ?? "",
    slug: category.slug,
  };
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
