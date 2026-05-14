"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AdminAccessGate } from "@/components/admin/AdminAccessGate";
import { AdminDashboardFrame } from "@/components/admin/AdminDashboardFrame";
import { getErrorMessage } from "@/components/admin/adminUtils";
import { DashboardDrawer } from "@/components/dashboard/DashboardDrawer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
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

type CategoryPanelState =
  | { mode: "create"; parentId: string }
  | { category: Category; mode: "edit" }
  | null;

type StatusFilter = "ALL" | "ACTIVE" | "DISABLED";
type TypeFilter = "ALL" | "MAIN" | "SUB";

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
  const [message, setMessage] = useState<CategoryMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [isPanelSaving, setIsPanelSaving] = useState(false);
  const [panelState, setPanelState] = useState<CategoryPanelState>(null);
  const [panelDraft, setPanelDraft] = useState<CategoryDraft>(emptyCategoryDraft());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");

  useEffect(() => {
    void loadCategories({ clearMessage: true });
  }, []);

  async function loadCategories({
    clearMessage = false,
  }: { clearMessage?: boolean } = {}) {
    setIsLoading(true);

    if (clearMessage) {
      setMessage(null);
    }

    try {
      const response = await api.admin.categories.list();
      setCategories(response);
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not load categories."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function openCreatePanel(parentId = "") {
    setMessage(null);
    setPanelDraft(emptyCategoryDraft(parentId));
    setPanelState({ mode: "create", parentId });
  }

  function openEditPanel(category: Category) {
    setMessage(null);
    setPanelDraft(toDraft(category));
    setPanelState({ category, mode: "edit" });
  }

  function closePanel() {
    if (!isPanelSaving) {
      setPanelState(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  }

  async function saveCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const name = panelDraft.name.trim();

    if (!name) {
      setMessage({ text: "Category name is required.", tone: "error" });
      return;
    }

    setIsPanelSaving(true);

    try {
      if (panelState?.mode === "edit") {
        await api.admin.categories.update(panelState.category.id, {
          name,
          description: cleanOptional(panelDraft.description),
          isActive: panelDraft.isActive,
          parentId: cleanNullable(panelDraft.parentId),
          slug: cleanOptional(panelDraft.slug),
        });
        setMessage({
          categoryId: panelState.category.id,
          text: "Category updated.",
          tone: "success",
        });
      } else {
        await api.admin.categories.create({
          name,
          description: cleanOptional(panelDraft.description),
          isActive: panelDraft.isActive,
          parentId: cleanNullable(panelDraft.parentId),
          slug: cleanOptional(panelDraft.slug),
        });
        setMessage({ text: "Category created.", tone: "success" });
      }

      setPanelState(null);
      await loadCategories();
    } catch (error) {
      setMessage({
        categoryId: panelState?.mode === "edit" ? panelState.category.id : undefined,
        text: getErrorMessage(
          error,
          panelState?.mode === "edit"
            ? "Could not update category."
            : "Could not create category.",
        ),
        tone: "error",
      });
    } finally {
      setIsPanelSaving(false);
    }
  }

  async function toggleCategoryStatus(category: Category) {
    const nextIsActive = !isCategoryActive(category);
    setActiveCategoryId(category.id);
    setMessage(null);

    try {
      await api.admin.categories.update(category.id, {
        isActive: nextIsActive,
      });
      setMessage({
        categoryId: category.id,
        text: nextIsActive ? "Category enabled." : "Category disabled.",
        tone: "success",
      });
      await loadCategories();
    } catch (error) {
      setMessage({
        categoryId: category.id,
        text: getErrorMessage(
          error,
          nextIsActive ? "Could not enable category." : "Could not disable category.",
        ),
        tone: "error",
      });
    } finally {
      setActiveCategoryId(null);
    }
  }

  async function deleteCategoryPermanently(category: Category) {
    const productCount = getProductCount(category);
    const subcategoryCount = categories.filter(
      (child) => child.parentId === category.id,
    ).length;

    if (productCount > 0 || subcategoryCount > 0) {
      setMessage({
        categoryId: category.id,
        text:
          productCount > 0
            ? "Cannot permanently delete a category with products."
            : "Cannot permanently delete a category with subcategories.",
        tone: "error",
      });
      return;
    }

    if (
      !window.confirm(
        "Delete this category permanently? This is only safe for test or mistaken categories with no products and no subcategories.",
      )
    ) {
      return;
    }

    setActiveCategoryId(category.id);
    setMessage(null);

    try {
      await api.admin.categories.deletePermanent(category.id);
      setMessage({
        text: "Category permanently deleted.",
        tone: "success",
      });
      await loadCategories();
    } catch (error) {
      setMessage({
        categoryId: category.id,
        text: getErrorMessage(error, "Could not permanently delete category."),
        tone: "error",
      });
    } finally {
      setActiveCategoryId(null);
    }
  }

  const rootCategories = useMemo(
    () => categories.filter((category) => !category.parentId),
    [categories],
  );

  const subcategoriesByParent = useMemo(() => {
    return rootCategories.reduce<Record<string, Category[]>>((groups, category) => {
      groups[category.id] = categories.filter(
        (child) => child.parentId === category.id,
      );
      return groups;
    }, {});
  }, [categories, rootCategories]);

  const stats = useMemo(() => {
    const mainCategories = rootCategories.length;
    const activeCategories = categories.filter(isCategoryActive).length;

    return {
      activeCategories,
      mainCategories,
      subcategories: categories.length - mainCategories,
      total: categories.length,
    };
  }, [categories, rootCategories.length]);

  const visibleTree = useMemo(() => {
    return rootCategories
      .map((category) => {
        const visibleChildren =
          typeFilter === "MAIN"
            ? []
            : (subcategoriesByParent[category.id] ?? []).filter((child) =>
                categoryMatchesFilters(child, search, statusFilter),
              );
        const parentMatches =
          typeFilter !== "SUB" && categoryMatchesFilters(category, search, statusFilter);

        return {
          category,
          children: visibleChildren,
          isVisible: parentMatches || visibleChildren.length > 0,
          parentMatches,
        };
      })
      .filter((item) => item.isVisible);
  }, [rootCategories, search, statusFilter, subcategoriesByParent, typeFilter]);

  const rootOptions =
    panelState?.mode === "edit"
      ? rootCategories.filter((category) => category.id !== panelState.category.id)
      : rootCategories;
  const shownCount = visibleTree.reduce(
    (total, item) => total + (item.parentMatches ? 1 : 0) + item.children.length,
    0,
  );
  const hasActiveFilters =
    search.trim().length > 0 || statusFilter !== "ALL" || typeFilter !== "ALL";
  const panelMessage = getPanelMessage(panelState, message);

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        actionLabel="Create category"
        eyebrow="Catalog structure"
        onAction={() => openCreatePanel()}
        subtitle="Manage marketplace categories, subcategory depth, and public catalog visibility from one operational view."
        title="Categories"
      />

      {!panelState && message && !message.categoryId ? (
        <InlineMessage message={message} />
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<GridIcon />}
          label="Total categories"
          meta="All catalog nodes"
          value={stats.total}
        />
        <MetricCard
          icon={<FolderIcon />}
          label="Main categories"
          meta="Top-level aisles"
          tone="market"
          value={stats.mainCategories}
        />
        <MetricCard
          icon={<BranchIcon />}
          label="Subcategories"
          meta="Nested sections"
          value={stats.subcategories}
        />
        <MetricCard
          icon={<CheckIcon />}
          label="Active categories"
          meta="Visible to shoppers"
          tone="success"
          value={stats.activeCategories}
        />
      </div>

      <Card className="overflow-hidden border-slate-200/90 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
        <CardContent className="space-y-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-950">
                Category manager
              </h3>
              <p className="text-sm text-slate-500">
                Search, filter, and manage parent categories with their nested subcategories.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-market-200 bg-market-50 px-3 py-1.5 text-xs font-bold text-market-900">
              {shownCount} shown
            </span>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-inner shadow-white">
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,0.9fr)_180px_220px_auto] lg:items-center">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <SearchIcon />
                </span>
                <Input
                  aria-label="Search categories"
                  className="h-11 border-slate-200 bg-white pl-10 shadow-sm shadow-slate-200/50"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name or slug"
                  type="search"
                  value={search}
                />
              </div>
              <SelectControl
                ariaLabel="Filter by status"
                onChange={(value) => setStatusFilter(value as StatusFilter)}
                value={statusFilter}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </SelectControl>
              <SelectControl
                ariaLabel="Filter by category type"
                onChange={(value) => setTypeFilter(value as TypeFilter)}
                value={typeFilter}
              >
                <option value="ALL">All types</option>
                <option value="MAIN">Main categories</option>
                <option value="SUB">Subcategories</option>
              </SelectControl>
              <Button
                className="h-11 border-slate-200 px-3"
                disabled={!hasActiveFilters}
                onClick={clearFilters}
                variant="secondary"
              >
                Clear
              </Button>
            </div>
          </div>

          {isLoading ? (
            <CategoryLoadingState />
          ) : categories.length === 0 ? (
            <EmptyPanel
              actionLabel="Create category"
              icon={<FolderIcon />}
              onAction={() => openCreatePanel()}
              text="Build the first public catalog aisle for the marketplace."
              title="No categories yet"
            />
          ) : visibleTree.length === 0 ? (
            <EmptyPanel
              actionLabel="Clear filters"
              icon={<SearchIcon />}
              onAction={clearFilters}
              text="Try a broader search or reset filters to review all catalog sections."
              title="No categories match"
            />
          ) : (
            <div className="space-y-3">
              {visibleTree.map(({ category, children, parentMatches }) => (
                <CategoryGroup
                  activeCategoryId={activeCategoryId}
                  category={category}
                  childrenToShow={children}
                  key={category.id}
                  message={message}
                  onDelete={deleteCategoryPermanently}
                  onCreateSubcategory={() => openCreatePanel(category.id)}
                  onEdit={openEditPanel}
                  onToggleStatus={toggleCategoryStatus}
                  parentMatches={parentMatches}
                  totalSubcategories={
                    (subcategoriesByParent[category.id] ?? []).length
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DashboardDrawer
        description="Configure naming, hierarchy, and shopper visibility for this marketplace section."
        eyebrow="Catalog control"
        footer={
          <div className="mx-auto flex max-w-4xl justify-end gap-2">
            <Button
              className="border-slate-200"
              disabled={isPanelSaving}
              onClick={closePanel}
              type="button"
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-r from-market-700 to-orange-500 shadow-md shadow-market-600/20 hover:from-market-800 hover:to-orange-600"
              disabled={isPanelSaving}
              form="category-drawer-form"
              type="submit"
            >
              {isPanelSaving ? "Saving" : "Save"}
            </Button>
          </div>
        }
        onClose={closePanel}
        open={panelState !== null}
        title={
          panelState?.mode === "edit"
            ? "Edit category"
            : panelDraft.parentId
              ? "Create subcategory"
              : "Create category"
        }
        width="lg"
      >
        {panelState ? (
          <CategoryFormPanel
            draft={panelDraft}
            message={panelMessage}
            onDraftChange={setPanelDraft}
            onSubmit={saveCategory}
            rootCategories={rootOptions}
          />
        ) : null}
      </DashboardDrawer>
    </div>
  );
}

function CategoryGroup({
  activeCategoryId,
  category,
  childrenToShow,
  message,
  onCreateSubcategory,
  onDelete,
  onEdit,
  onToggleStatus,
  parentMatches,
  totalSubcategories,
}: {
  activeCategoryId: string | null;
  category: Category;
  childrenToShow: Category[];
  message: CategoryMessage | null;
  onCreateSubcategory: () => void;
  onDelete: (category: Category) => void;
  onEdit: (category: Category) => void;
  onToggleStatus: (category: Category) => void;
  parentMatches: boolean;
  totalSubcategories: number;
}) {
  return (
    <div className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-market-200 hover:shadow-[0_20px_45px_rgba(255,106,45,0.10)]">
      {parentMatches ? (
        <CategoryRow
          activeCategoryId={activeCategoryId}
          category={category}
          message={message?.categoryId === category.id ? message : null}
          onCreateSubcategory={onCreateSubcategory}
          onDelete={() => onDelete(category)}
          onEdit={() => onEdit(category)}
          onToggleStatus={() => onToggleStatus(category)}
          subcategoryCount={totalSubcategories}
          variant="parent"
        />
      ) : (
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-slate-950">{category.name}</p>
              <p className="break-all text-xs font-semibold text-slate-500">
                {category.slug}
              </p>
            </div>
            <Badge className="border-market-200 bg-market-50 text-market-900" tone="neutral">
              {totalSubcategories} subcategories
            </Badge>
          </div>
        </div>
      )}

      {childrenToShow.length > 0 ? (
        <div className="space-y-2 border-t border-slate-100 bg-gradient-to-b from-slate-50/90 to-white p-3">
          {childrenToShow.map((child) => (
            <CategoryRow
              activeCategoryId={activeCategoryId}
              category={child}
              key={child.id}
              message={message?.categoryId === child.id ? message : null}
              onDelete={() => onDelete(child)}
              onEdit={() => onEdit(child)}
              onToggleStatus={() => onToggleStatus(child)}
              variant="child"
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryRow({
  activeCategoryId,
  category,
  message,
  onCreateSubcategory,
  onDelete,
  onEdit,
  onToggleStatus,
  subcategoryCount = 0,
  variant,
}: {
  activeCategoryId: string | null;
  category: Category;
  message: CategoryMessage | null;
  onCreateSubcategory?: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  subcategoryCount?: number;
  variant: "child" | "parent";
}) {
  const isWorking = activeCategoryId === category.id;
  const active = isCategoryActive(category);
  const productCount = getProductCount(category);
  const resolvedSubcategoryCount = getSubcategoryCount(category, subcategoryCount);
  const canDelete = productCount === 0 && resolvedSubcategoryCount === 0;

  return (
    <div
      className={cn(
        "grid gap-3 bg-white lg:grid-cols-[minmax(0,1fr)_auto]",
        variant === "parent"
          ? "p-4 sm:p-5"
          : "relative rounded-lg border border-slate-200/80 p-3 pl-4 shadow-sm shadow-slate-200/40 before:absolute before:bottom-3 before:left-0 before:top-3 before:w-1 before:rounded-r-full before:bg-market-300",
      )}
    >
      <div className="min-w-0 space-y-3">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              "hidden shrink-0 items-center justify-center rounded-lg border font-black shadow-sm sm:flex",
              variant === "parent"
                ? "h-11 w-11 border-market-200 bg-market-50 text-market-800"
                : "h-9 w-9 border-slate-200 bg-slate-50 text-slate-500",
            )}
          >
            {category.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={cn(
                  "break-words font-bold leading-tight text-slate-950",
                  variant === "child" ? "text-sm" : "text-lg",
                )}
              >
                {category.name}
              </h3>
              <StatusBadge isActive={active} />
              {variant === "parent" ? (
                <Badge className="border-market-200 bg-market-50 text-market-900" tone="neutral">
                  Main category
                </Badge>
              ) : (
                <Badge tone="neutral">Subcategory</Badge>
              )}
            </div>

            <p className="mt-1 break-all text-xs font-semibold text-slate-500">
              {category.slug}
            </p>
          </div>
        </div>

        <p className="line-clamp-2 max-w-3xl text-sm leading-5 text-slate-600">
          {category.description?.trim() || "No description yet."}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <CountPill label="Products" value={productCount} />
          {variant === "parent" ? (
            <CountPill
              label="Subcategories"
              tone="market"
              value={resolvedSubcategoryCount}
            />
          ) : null}
        </div>

        {message ? <InlineMessage message={message} /> : null}
      </div>

      <div className="flex flex-wrap items-start gap-2 lg:justify-end">
        {onCreateSubcategory ? (
          <Button
            className="h-9 bg-gradient-to-r from-market-700 to-orange-500 px-3 shadow-md shadow-market-600/20 hover:from-market-800 hover:to-orange-600"
            onClick={onCreateSubcategory}
          >
            Create subcategory
          </Button>
        ) : null}
        <Button className="h-9 border-slate-200 px-3" onClick={onEdit} variant="secondary">
          Edit
        </Button>
        <Button
          className={cn(
            "h-9 px-3",
            active
              ? "text-red-700 hover:bg-red-50 hover:text-red-800"
              : "bg-gradient-to-r from-market-700 to-orange-500 shadow-md shadow-market-600/20",
          )}
          disabled={isWorking}
          onClick={onToggleStatus}
          variant={active ? "ghost" : "primary"}
        >
          {isWorking ? "Saving" : active ? "Disable" : "Enable"}
        </Button>
        {canDelete ? (
          <Button
            className="h-9 border-red-200 bg-red-50 px-3 text-red-700 hover:bg-red-100 hover:text-red-800"
            disabled={isWorking}
            onClick={onDelete}
            title="Delete permanently"
            variant="secondary"
          >
            <TrashIcon />
            Delete
          </Button>
        ) : null}
        <p className="basis-full text-xs font-medium text-slate-500 lg:text-right">
          Disable hides this category from shoppers.
        </p>
      </div>
    </div>
  );
}

function CategoryFormPanel({
  draft,
  message,
  onDraftChange,
  onSubmit,
  rootCategories,
}: {
  draft: CategoryDraft;
  message: CategoryMessage | null;
  onDraftChange: (draft: CategoryDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  rootCategories: Category[];
}) {
  const selectedParent = rootCategories.find((category) => category.id === draft.parentId);

  return (
    <form
      className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[minmax(0,1fr)_260px]"
      id="category-drawer-form"
      onSubmit={onSubmit}
    >
      <div className="space-y-5">
        {message ? <InlineMessage message={message} /> : null}

        <Card className="overflow-hidden border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <CardContent className="space-y-5 p-5">
            <div>
              <h4 className="font-bold text-slate-950">Category details</h4>
              <p className="mt-1 text-sm text-slate-500">
                Slug can be left empty when creating; the backend will generate it from the name.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" name="category-name">
                <Input
                  className="h-11 border-slate-200 shadow-sm shadow-slate-200/50"
                  id="category-name"
                  onChange={(event) =>
                    onDraftChange({ ...draft, name: event.target.value })
                  }
                  placeholder="Electronics"
                  required
                  value={draft.name}
                />
              </Field>
              <Field
                helperText="Leave empty to auto-generate from name."
                label="Slug"
                name="category-slug"
              >
                <Input
                  className="h-11 border-slate-200 shadow-sm shadow-slate-200/50"
                  id="category-slug"
                  onChange={(event) =>
                    onDraftChange({ ...draft, slug: event.target.value })
                  }
                  placeholder="electronics"
                  value={draft.slug}
                />
              </Field>
            </div>

            <Field label="Description" name="category-description">
              <textarea
                className="min-h-28 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 shadow-sm shadow-slate-200/50 outline-none transition placeholder:text-slate-400 focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                id="category-description"
                onChange={(event) =>
                  onDraftChange({ ...draft, description: event.target.value })
                }
                placeholder="Short note for administrators and public category context"
                value={draft.description}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <Field
                helperText="Only main categories can be selected as parents. This keeps depth limited to two levels."
                label="Parent category"
                name="category-parent"
              >
                <select
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm shadow-slate-200/50 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
                  id="category-parent"
                  onChange={(event) =>
                    onDraftChange({ ...draft, parentId: event.target.value })
                  }
                  value={draft.parentId}
                >
                  <option value="">Main category</option>
                  {rootCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>

              <ActiveToggle
                checked={draft.isActive}
                label="Active"
                onChange={(checked) =>
                  onDraftChange({ ...draft, isActive: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
        <div className="rounded-lg border border-market-100 bg-gradient-to-br from-white to-market-50 p-4 shadow-[0_14px_35px_rgba(255,106,45,0.09)]">
          <p className="text-xs font-bold uppercase tracking-wide text-market-800">
            Placement
          </p>
          <p className="mt-2 text-lg font-bold text-slate-950">
            {selectedParent ? selectedParent.name : "Main category"}
          </p>
          <p className="mt-2 text-sm leading-5 text-slate-600">
            {selectedParent
              ? "This will appear nested under its parent category."
              : "This sits at the top level of the marketplace catalog."}
          </p>
        </div>
      </aside>
    </form>
  );
}

function PremiumPageHeader({
  actionLabel,
  eyebrow,
  onAction,
  subtitle,
  title,
}: {
  actionLabel: string;
  eyebrow: string;
  onAction: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-market-100 bg-gradient-to-br from-white via-white to-market-50 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-market-700 via-orange-500 to-amber-300" />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <span className="inline-flex rounded-full border border-market-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-market-800 shadow-sm shadow-market-100/60">
            {eyebrow}
          </span>
          <div>
            <h2 className="text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {subtitle}
            </p>
          </div>
        </div>
        <Button
          className="h-11 bg-gradient-to-r from-market-700 to-orange-500 px-5 shadow-lg shadow-market-600/20 hover:from-market-800 hover:to-orange-600"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  meta,
  tone = "neutral",
  value,
}: {
  icon: ReactNode;
  label: string;
  meta: string;
  tone?: "market" | "neutral" | "success";
  value: number;
}) {
  const toneClass = {
    market: "border-market-200 bg-market-50 text-market-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <Card className="overflow-hidden border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 shadow-[0_16px_38px_rgba(15,23,42,0.06)]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-600">{label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{meta}</p>
          </div>
          <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-lg border", toneClass)}>
            {icon}
          </span>
        </div>
        <p className="text-3xl font-black leading-none text-slate-950">{value}</p>
      </CardContent>
    </Card>
  );
}

function CountPill({
  label,
  tone = "neutral",
  value,
}: {
  label: string;
  tone?: "market" | "neutral";
  value: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
        tone === "market"
          ? "border-market-200 bg-market-50 text-market-900"
          : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      <span className="text-slate-950">{value}</span>
      {label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      className={
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }
      tone="neutral"
    >
      {isActive ? "Active" : "Disabled"}
    </Badge>
  );
}

function Field({
  children,
  helperText,
  label,
  name,
}: {
  children: ReactNode;
  helperText?: string;
  label: string;
  name: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-800" htmlFor={name}>
        {label}
      </label>
      {children}
      {helperText ? (
        <p className="text-xs font-medium leading-5 text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}

function SelectControl({
  ariaLabel,
  children,
  onChange,
  value,
}: {
  ariaLabel: string;
  children: ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm shadow-slate-200/50 outline-none transition focus:border-market-600 focus:ring-2 focus:ring-market-600/15"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function ActiveToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm shadow-slate-200/50">
      <span>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        <span className="block text-xs font-medium text-slate-500">
          Visible in public catalog
        </span>
      </span>
      <input
        checked={checked}
        className="sr-only"
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span
        className={cn(
          "relative h-6 w-11 rounded-full transition",
          checked ? "bg-market-700" : "bg-slate-200",
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-4 w-4 rounded-full bg-white shadow transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </label>
  );
}

function InlineMessage({ message }: { message: CategoryMessage }) {
  return (
    <p
      className={
        message.tone === "success"
          ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"
          : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
      }
    >
      {message.text}
    </p>
  );
}

function EmptyPanel({
  actionLabel,
  icon,
  onAction,
  text,
  title,
}: {
  actionLabel?: string;
  icon: ReactNode;
  onAction?: () => void;
  text: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-market-200 bg-gradient-to-br from-white to-market-50/70 px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border border-market-200 bg-white text-market-800 shadow-sm shadow-market-100/80">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{text}</p>
      {actionLabel && onAction ? (
        <Button
          className="mt-5 h-9 bg-gradient-to-r from-market-700 to-orange-500 px-4 shadow-md shadow-market-600/20"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

function CategoryLoadingState() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
          key={item}
        >
          <div className="flex animate-pulse items-start gap-3">
            <div className="h-11 w-11 rounded-lg bg-slate-100" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-44 rounded bg-slate-100" />
              <div className="h-3 w-64 max-w-full rounded bg-slate-100" />
              <div className="h-3 w-full max-w-lg rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function toDraft(category: Category): CategoryDraft {
  return {
    description: category.description ?? "",
    isActive: isCategoryActive(category),
    name: category.name,
    parentId: category.parentId ?? "",
    slug: category.slug,
  };
}

function emptyCategoryDraft(parentId = ""): CategoryDraft {
  return {
    description: "",
    isActive: true,
    name: "",
    parentId,
    slug: "",
  };
}

function categoryMatchesFilters(
  category: Category,
  search: string,
  statusFilter: StatusFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch =
    !normalizedSearch ||
    category.name.toLowerCase().includes(normalizedSearch) ||
    category.slug.toLowerCase().includes(normalizedSearch);
  const active = isCategoryActive(category);
  const matchesStatus =
    statusFilter === "ALL" ||
    (statusFilter === "ACTIVE" && active) ||
    (statusFilter === "DISABLED" && !active);

  return matchesSearch && matchesStatus;
}

function getPanelMessage(
  panelState: CategoryPanelState,
  message: CategoryMessage | null,
) {
  if (!panelState || !message) {
    return null;
  }

  if (panelState.mode === "edit") {
    return message.categoryId === panelState.category.id ? message : null;
  }

  return message.categoryId ? null : message;
}

function isCategoryActive(category: Category) {
  return category.isActive !== false;
}

function getProductCount(category: Category) {
  return category._count?.products ?? 0;
}

function getSubcategoryCount(category: Category, fallback = 0) {
  return category._count?.children ?? category.children?.length ?? fallback;
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function cleanNullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="m20 20-4.6-4.6m2.1-5.1a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 6.5h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-11Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 5v7m0 0v7m0-7h6a4 4 0 0 0 4-4V6m-10 6h6a4 4 0 0 1 4 4v2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <path d="M5 5h4M15 6h4M15 18h4" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
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
        strokeWidth="2.4"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 7h14M9 11h6M7 7l1 12h8l1-12M9 7V4h6v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
