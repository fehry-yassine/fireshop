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
import type {
  HomepagePromo,
  HomepagePromoPayload,
  HomepagePromoType,
} from "@/types";

type PromoDraft = {
  imageUrl: string;
  isActive: boolean;
  linkUrl: string;
  sortOrder: string;
  subtitle: string;
  title: string;
  type: HomepagePromoType;
};

type PromoMessage = {
  promoId?: string;
  text: string;
  tone: "success" | "error";
};

type PromoPanelState =
  | { mode: "create" }
  | { mode: "edit"; promo: HomepagePromo }
  | null;

type PromoPreviewData = Pick<
  PromoDraft,
  "imageUrl" | "isActive" | "linkUrl" | "sortOrder" | "subtitle" | "title" | "type"
>;

const promoTypes: Array<{ description: string; label: string; value: HomepagePromoType }> = [
  {
    description: "Middle discovery card",
    label: "Promo card",
    value: "PROMO_CARD",
  },
  {
    description: "Right-side slideshow banner",
    label: "Hero slide",
    value: "HERO_SLIDE",
  },
];

export function AdminHomepagePromosPageClient() {
  return (
    <AdminAccessGate>
      <AdminDashboardFrame>
        <AdminHomepagePromosContent />
      </AdminDashboardFrame>
    </AdminAccessGate>
  );
}

function AdminHomepagePromosContent() {
  const [promos, setPromos] = useState<HomepagePromo[]>([]);
  const [message, setMessage] = useState<PromoMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePromoId, setActivePromoId] = useState<string | null>(null);
  const [panelState, setPanelState] = useState<PromoPanelState>(null);
  const [panelDraft, setPanelDraft] = useState<PromoDraft>(emptyPromoDraft());
  const [isPanelSaving, setIsPanelSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<HomepagePromo | null>(null);
  const [deletedPromoIds, setDeletedPromoIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    void loadPromos({ clearMessage: true });
  }, []);

  async function loadPromos({
    clearMessage = false,
    hiddenIds = deletedPromoIds,
  }: { clearMessage?: boolean; hiddenIds?: Set<string> } = {}) {
    setIsLoading(true);

    if (clearMessage) {
      setMessage(null);
    }

    try {
      const response = await api.admin.homepagePromos.list();
      setPromos(filterDeletedPromos(response, hiddenIds));
    } catch (error) {
      setMessage({
        text: getErrorMessage(error, "Could not load homepage promos."),
        tone: "error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function openCreatePanel() {
    setMessage(null);
    setPanelDraft(emptyPromoDraft());
    setPanelState({ mode: "create" });
  }

  function openEditPanel(promo: HomepagePromo) {
    setMessage(null);
    setPanelDraft(toDraft(promo));
    setPanelState({ mode: "edit", promo });
  }

  function closePanel() {
    if (!isPanelSaving) {
      setPanelState(null);
    }
  }

  async function savePromo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const payload = draftToPayload(panelDraft);
    const validationError = validatePayload(payload);

    if (validationError) {
      setMessage({
        promoId: panelState?.mode === "edit" ? panelState.promo.id : undefined,
        text: validationError,
        tone: "error",
      });
      return;
    }

    setIsPanelSaving(true);

    try {
      if (panelState?.mode === "edit") {
        await api.admin.homepagePromos.update(panelState.promo.id, payload);
        setMessage({
          promoId: panelState.promo.id,
          text: "Homepage promo updated.",
          tone: "success",
        });
      } else {
        await api.admin.homepagePromos.create(payload);
        setMessage({ text: "Homepage promo created.", tone: "success" });
      }

      setPanelState(null);
      await loadPromos();
    } catch (error) {
      setMessage({
        promoId: panelState?.mode === "edit" ? panelState.promo.id : undefined,
        text: getErrorMessage(
          error,
          panelState?.mode === "edit"
            ? "Could not update homepage promo."
            : "Could not create homepage promo.",
        ),
        tone: "error",
      });
    } finally {
      setIsPanelSaving(false);
    }
  }

  async function togglePromoStatus(promo: HomepagePromo) {
    const nextIsActive = !promo.isActive;
    setActivePromoId(promo.id);
    setMessage(null);

    try {
      await api.admin.homepagePromos.update(promo.id, {
        isActive: nextIsActive,
      });
      setMessage({
        promoId: promo.id,
        text: nextIsActive ? "Homepage promo enabled." : "Homepage promo disabled.",
        tone: "success",
      });
      await loadPromos();
    } catch (error) {
      setMessage({
        promoId: promo.id,
        text: getErrorMessage(
          error,
          nextIsActive
            ? "Could not enable homepage promo."
            : "Could not disable homepage promo.",
        ),
        tone: "error",
      });
    } finally {
      setActivePromoId(null);
    }
  }

  async function deletePromo(promo: HomepagePromo) {
    setActivePromoId(promo.id);
    setMessage(null);

    try {
      await api.admin.homepagePromos.delete(promo.id);
      const nextDeletedIds = new Set(deletedPromoIds);
      nextDeletedIds.add(promo.id);
      const response = await api.admin.homepagePromos.list();

      setDeletedPromoIds(nextDeletedIds);
      setPromos(filterDeletedPromos(response, nextDeletedIds));
      setDeleteCandidate(null);
      setMessage({
        promoId: undefined,
        text: "Homepage promo deleted.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        promoId: promo.id,
        text: getErrorMessage(error, "Could not delete homepage promo."),
        tone: "error",
      });
    } finally {
      setActivePromoId(null);
    }
  }

  const sortedPromos = useMemo(() => [...promos].sort(sortPromos), [promos]);
  const promoCards = sortedPromos.filter((promo) => promo.type === "PROMO_CARD");
  const heroSlides = sortedPromos.filter((promo) => promo.type === "HERO_SLIDE");

  const stats = useMemo(
    () => ({
      activeHeroSlides: promos.filter(
        (promo) => promo.type === "HERO_SLIDE" && promo.isActive,
      ).length,
      activePromoCards: promos.filter(
        (promo) => promo.type === "PROMO_CARD" && promo.isActive,
      ).length,
      disabledPromos: promos.filter((promo) => !promo.isActive).length,
    }),
    [promos],
  );

  const panelMessage = getPanelMessage(panelState, message);

  return (
    <div className="space-y-6">
      <PremiumPageHeader
        actionLabel="Create promo"
        eyebrow="Marketplace homepage"
        onAction={openCreatePanel}
        subtitle="Control the discovery cards and right-side slideshow that shape the first shopper impression on the public homepage."
        title="Homepage discovery"
      />

      {!panelState && message && !message.promoId ? (
        <InlineMessage message={message} />
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard
          icon={<CardIcon />}
          label="Active promo cards"
          meta="Middle discovery grid"
          value={stats.activePromoCards}
        />
        <MetricCard
          icon={<SlidesIcon />}
          label="Active hero slides"
          meta="Right-side rotation"
          tone="market"
          value={stats.activeHeroSlides}
        />
        <MetricCard
          icon={<PauseIcon />}
          label="Disabled promos"
          meta="Kept out of public view"
          tone="warning"
          value={stats.disabledPromos}
        />
      </div>

      {isLoading ? (
        <PromoLoadingState />
      ) : promos.length === 0 ? (
        <EmptyDiscoveryState onCreate={openCreatePanel} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.82fr)]">
          <PromoSection
            activePromoId={activePromoId}
            emptyText="No middle promo cards yet. The homepage can keep using fallback visuals until you add one."
            message={message}
            onCreate={openCreatePanel}
            onDelete={setDeleteCandidate}
            onEdit={openEditPanel}
            onToggleStatus={togglePromoStatus}
            promos={promoCards}
            title="Middle promo cards"
            variant="card"
          />
          <PromoSection
            activePromoId={activePromoId}
            emptyText="No right hero slides yet. Add a slide to control the public homepage rotation."
            message={message}
            onCreate={openCreatePanel}
            onDelete={setDeleteCandidate}
            onEdit={openEditPanel}
            onToggleStatus={togglePromoStatus}
            promos={heroSlides}
            title="Right hero slides"
            variant="hero"
          />
        </div>
      )}

      <DashboardDrawer
        description="Compose the content, target URL, ordering, and live preview used by homepage discovery."
        eyebrow="Homepage discovery control"
        footer={
          <div className="mx-auto flex max-w-6xl justify-end gap-2">
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
              form="promo-drawer-form"
              type="submit"
            >
              {isPanelSaving ? "Saving" : "Save"}
            </Button>
          </div>
        }
        onClose={closePanel}
        open={panelState !== null}
        title={panelState?.mode === "edit" ? "Edit promo" : "Create promo"}
        width="xl"
      >
        {panelState ? (
          <PromoFormPanel
            draft={panelDraft}
            message={panelMessage}
            onDraftChange={setPanelDraft}
            onSubmit={savePromo}
          />
        ) : null}
      </DashboardDrawer>

      <DeletePromoDialog
        isDeleting={deleteCandidate ? activePromoId === deleteCandidate.id : false}
        onCancel={() => setDeleteCandidate(null)}
        onConfirm={() => deleteCandidate && deletePromo(deleteCandidate)}
        promo={deleteCandidate}
      />
    </div>
  );
}

function PromoSection({
  activePromoId,
  emptyText,
  message,
  onCreate,
  onDelete,
  onEdit,
  onToggleStatus,
  promos,
  title,
  variant,
}: {
  activePromoId: string | null;
  emptyText: string;
  message: PromoMessage | null;
  onCreate: () => void;
  onDelete: (promo: HomepagePromo) => void;
  onEdit: (promo: HomepagePromo) => void;
  onToggleStatus: (promo: HomepagePromo) => void;
  promos: HomepagePromo[];
  title: string;
  variant: "card" | "hero";
}) {
  return (
    <Card className="overflow-hidden border-slate-200/90 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-market-700">
              {variant === "card" ? "Discovery grid" : "Homepage slideshow"}
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {variant === "card"
                ? "Preview cards similar to the public middle promo area."
                : "Wide slide previews for the right-side hero rail."}
            </p>
          </div>
          <Badge className="border-market-200 bg-market-50 text-market-900" tone="neutral">
            {promos.length} items
          </Badge>
        </div>

        {promos.length === 0 ? (
          <MiniEmptyState onCreate={onCreate} text={emptyText} />
        ) : (
          <div
            className={cn(
              "grid gap-3",
              variant === "card" ? "md:grid-cols-2" : "grid-cols-1",
            )}
          >
            {promos.map((promo) => (
              <PromoManagementCard
                activePromoId={activePromoId}
                key={promo.id}
                message={message?.promoId === promo.id ? message : null}
                onDelete={() => onDelete(promo)}
                onEdit={() => onEdit(promo)}
                onToggleStatus={() => onToggleStatus(promo)}
                promo={promo}
                variant={variant}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PromoManagementCard({
  activePromoId,
  message,
  onDelete,
  onEdit,
  onToggleStatus,
  promo,
  variant,
}: {
  activePromoId: string | null;
  message: PromoMessage | null;
  onDelete: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  promo: HomepagePromo;
  variant: "card" | "hero";
}) {
  const isWorking = activePromoId === promo.id;

  return (
    <div className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-market-200 hover:shadow-[0_20px_45px_rgba(255,106,45,0.10)]">
      <PromoVisual
        data={{
          imageUrl: promo.imageUrl ?? "",
          isActive: promo.isActive,
          linkUrl: promo.linkUrl,
          sortOrder: String(promo.sortOrder ?? 0),
          subtitle: promo.subtitle ?? "",
          title: promo.title,
          type: promo.type,
        }}
        variant={variant}
      />

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="line-clamp-2 font-bold text-slate-950">{promo.title}</h4>
              <StatusBadge isActive={promo.isActive} />
            </div>
            {promo.subtitle ? (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
                {promo.subtitle}
              </p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
            #{promo.sortOrder}
          </span>
        </div>

        <p className="break-all rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-500">
          {promo.linkUrl}
        </p>

        <div className="flex flex-wrap justify-end gap-2">
          <Button className="h-9 border-slate-200 px-3" onClick={onEdit} variant="secondary">
            Edit
          </Button>
          <Button
            className={cn(
              "h-9 px-3",
              promo.isActive
                ? "text-red-700 hover:bg-red-50 hover:text-red-800"
                : "bg-gradient-to-r from-market-700 to-orange-500 shadow-md shadow-market-600/20",
            )}
            disabled={isWorking}
            onClick={onToggleStatus}
            variant={promo.isActive ? "ghost" : "primary"}
          >
            {isWorking ? "Saving" : promo.isActive ? "Disable" : "Enable"}
          </Button>
          <Button
            className="h-9 border-red-200 bg-red-50 px-3 text-red-700 shadow-none hover:border-red-300 hover:bg-red-100 hover:text-red-800"
            disabled={isWorking}
            onClick={onDelete}
            variant="secondary"
          >
            Delete
          </Button>
        </div>

        {message ? <InlineMessage message={message} /> : null}
      </div>
    </div>
  );
}

function PromoFormPanel({
  draft,
  message,
  onDraftChange,
  onSubmit,
}: {
  draft: PromoDraft;
  message: PromoMessage | null;
  onDraftChange: (draft: PromoDraft) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_420px]"
      id="promo-drawer-form"
      onSubmit={onSubmit}
    >
      <div className="space-y-5">
        {message ? <InlineMessage message={message} /> : null}

        <Card className="overflow-hidden border-slate-200 shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <CardContent className="space-y-5 p-5">
            <div>
              <h4 className="font-bold text-slate-950">Promo content</h4>
              <p className="mt-1 text-sm text-slate-500">
                Image upload is not part of V1; paste an existing safe image URL.
              </p>
            </div>

            <Field label="Type" name="promo-type">
              <PromoTypeControl
                onChange={(type) => onDraftChange({ ...draft, type })}
                value={draft.type}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
              <Field label="Title" name="promo-title">
                <Input
                  className="h-11 border-slate-200 shadow-sm shadow-slate-200/50"
                  id="promo-title"
                  onChange={(event) =>
                    onDraftChange({ ...draft, title: event.target.value })
                  }
                  placeholder="Weekend tech offers"
                  required
                  value={draft.title}
                />
              </Field>
              <Field label="Sort order" name="promo-sort-order">
                <Input
                  className="h-11 border-slate-200 shadow-sm shadow-slate-200/50"
                  id="promo-sort-order"
                  inputMode="numeric"
                  onChange={(event) =>
                    onDraftChange({ ...draft, sortOrder: event.target.value })
                  }
                  type="number"
                  value={draft.sortOrder}
                />
              </Field>
            </div>

            <Field label="Subtitle" name="promo-subtitle">
              <Input
                className="h-11 border-slate-200 shadow-sm shadow-slate-200/50"
                id="promo-subtitle"
                onChange={(event) =>
                  onDraftChange({ ...draft, subtitle: event.target.value })
                }
                placeholder="Optional supporting text"
                value={draft.subtitle}
              />
            </Field>

            <Field label="Image URL" name="promo-image-url">
              <Input
                className="h-11 border-slate-200 shadow-sm shadow-slate-200/50"
                id="promo-image-url"
                onChange={(event) =>
                  onDraftChange({ ...draft, imageUrl: event.target.value })
                }
                placeholder="Optional: /api/uploads/... or https://..."
                value={draft.imageUrl}
              />
            </Field>

            <Field
              helperText="Use /categories/slug, /product/slug, /search, or a full HTTP(S) URL."
              label="Link URL"
              name="promo-link-url"
            >
              <Input
                className="h-11 border-slate-200 shadow-sm shadow-slate-200/50"
                id="promo-link-url"
                onChange={(event) =>
                  onDraftChange({ ...draft, linkUrl: event.target.value })
                }
                placeholder="/search"
                required
                value={draft.linkUrl}
              />
            </Field>

            <ActiveToggle
              checked={draft.isActive}
              label="Active"
              onChange={(checked) =>
                onDraftChange({ ...draft, isActive: checked })
              }
            />
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
        <div>
          <p className="text-sm font-bold text-slate-800">Live preview</p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Updates while you type. Fallback art appears when no image URL is provided.
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.07)]">
          <PromoVisual
            data={draft}
            variant={draft.type === "HERO_SLIDE" ? "hero" : "card"}
          />
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-market-200 bg-market-50 text-market-900" tone="neutral">
                {draft.type}
              </Badge>
              <StatusBadge isActive={draft.isActive} />
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
                #{draft.sortOrder || "0"}
              </span>
            </div>
            <p className="break-all rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-500">
              {draft.linkUrl || "No link URL yet"}
            </p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function PromoVisual({
  data,
  variant,
}: {
  data: PromoPreviewData;
  variant: "card" | "hero";
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = data.imageUrl.trim();
  const showImage = imageUrl.length > 0 && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-slate-950",
        variant === "hero" ? "aspect-[16/7]" : "aspect-[5/4]",
      )}
    >
      {showImage ? (
        <>
          <img
            alt={data.title || "Homepage promo preview"}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            onError={() => setImageFailed(true)}
            src={imageUrl}
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/82 via-slate-950/40 to-transparent p-4 text-white">
            <p
              className={cn(
                "line-clamp-2 font-black leading-tight",
                variant === "hero" ? "text-2xl" : "text-lg",
              )}
            >
              {data.title.trim() || "FireShop promo"}
            </p>
            <p className="mt-1 line-clamp-1 text-xs font-semibold text-white/80">
              {data.subtitle.trim() || data.linkUrl || "Marketplace discovery"}
            </p>
          </div>
        </>
      ) : (
        <FallbackPromoVisual data={data} variant={variant} />
      )}
    </div>
  );
}

function FallbackPromoVisual({
  data,
  variant,
}: {
  data: PromoPreviewData;
  variant: "card" | "hero";
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-between bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_45%,#111827_45%,#1f2937_100%)] p-4",
        variant === "hero" ? "min-h-48" : "min-h-44",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-gradient-to-br from-market-700 to-orange-500 px-2 text-xs font-black text-white shadow-md shadow-market-700/20">
          FS
        </span>
        <span className="rounded-full border border-white/20 bg-white/90 px-2.5 py-1 text-[11px] font-black text-slate-900 shadow-sm">
          {data.type === "HERO_SLIDE" ? "Hero slide" : "Promo card"}
        </span>
      </div>
      <div className={cn(variant === "hero" ? "max-w-[78%]" : "max-w-[86%]")}>
        <p
          className={cn(
            "line-clamp-2 font-black leading-tight text-slate-950",
            variant === "hero" ? "text-2xl" : "text-lg",
          )}
        >
          {data.title.trim() || "FireShop promo"}
        </p>
        <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-600">
          {data.subtitle.trim() || "Marketplace discovery"}
        </p>
      </div>
    </div>
  );
}

function PromoTypeControl({
  onChange,
  value,
}: {
  onChange: (value: HomepagePromoType) => void;
  value: HomepagePromoType;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {promoTypes.map((type) => {
        const isSelected = value === type.value;

        return (
          <button
            aria-pressed={isSelected}
            className={cn(
              "rounded-lg border p-3 text-left transition",
              isSelected
                ? "border-market-300 bg-market-50 text-market-950 shadow-sm shadow-market-100"
                : "border-slate-200 bg-white text-slate-700 hover:border-market-200 hover:bg-market-50/50",
            )}
            key={type.value}
            onClick={() => onChange(type.value)}
            type="button"
          >
            <span className="block text-sm font-black">{type.label}</span>
            <span className="mt-1 block text-xs font-semibold text-slate-500">
              {type.description}
            </span>
          </button>
        );
      })}
    </div>
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

function DeletePromoDialog({
  isDeleting,
  onCancel,
  onConfirm,
  promo,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  promo: HomepagePromo | null;
}) {
  if (!promo) {
    return null;
  }

  return (
    <div
      aria-label="Delete promo confirmation"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-lg border border-red-100 bg-white p-5 shadow-2xl shadow-slate-950/25">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700">
            <TrashIcon />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-950">
              Delete this promo?
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This cannot be undone. The existing backend delete endpoint removes it from the managed homepage flow.
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
              {promo.title}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button
            className="border-slate-200"
            disabled={isDeleting}
            onClick={onCancel}
            variant="secondary"
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white shadow-md shadow-red-600/20 hover:bg-red-700"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "Deleting" : "Delete"}
          </Button>
        </div>
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
  tone?: "market" | "neutral" | "warning";
  value: number;
}) {
  const toneClass = {
    market: "border-market-200 bg-market-50 text-market-800",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
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
          Visible on public homepage
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

function InlineMessage({ message }: { message: PromoMessage }) {
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

function EmptyDiscoveryState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-market-200 bg-gradient-to-br from-white to-market-50/70 px-5 py-12 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-market-200 bg-white text-market-800 shadow-sm shadow-market-100/80">
        <SlidesIcon />
      </div>
      <h3 className="mt-4 text-xl font-black text-slate-950">
        No homepage promos yet
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
        The public homepage will keep using fallback visuals until you create managed promo cards or hero slides.
      </p>
      <Button
        className="mt-5 h-10 bg-gradient-to-r from-market-700 to-orange-500 px-4 shadow-md shadow-market-600/20"
        onClick={onCreate}
      >
        Create promo
      </Button>
    </div>
  );
}

function MiniEmptyState({
  onCreate,
  text,
}: {
  onCreate: () => void;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
      <p className="mx-auto max-w-sm text-sm font-semibold leading-6 text-slate-600">
        {text}
      </p>
      <Button
        className="mt-4 h-9 bg-gradient-to-r from-market-700 to-orange-500 px-4 shadow-md shadow-market-600/20"
        onClick={onCreate}
      >
        Create promo
      </Button>
    </div>
  );
}

function PromoLoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.82fr)]">
      {[0, 1].map((section) => (
        <Card
          className="overflow-hidden border-slate-200/90 shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
          key={section}
        >
          <CardContent className="space-y-4 p-5">
            <div className="h-5 w-44 animate-pulse rounded bg-slate-100" />
            <div className="grid gap-3 md:grid-cols-2">
              {[0, 1].map((item) => (
                <div className="overflow-hidden rounded-lg border border-slate-200" key={item}>
                  <div className="aspect-[5/4] animate-pulse bg-slate-100" />
                  <div className="space-y-2 p-4">
                    <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function toDraft(promo: HomepagePromo): PromoDraft {
  return {
    imageUrl: promo.imageUrl ?? "",
    isActive: promo.isActive,
    linkUrl: promo.linkUrl,
    sortOrder: String(promo.sortOrder ?? 0),
    subtitle: promo.subtitle ?? "",
    title: promo.title,
    type: promo.type,
  };
}

function filterDeletedPromos(promos: HomepagePromo[], hiddenIds: Set<string>) {
  return promos.filter((promo) => !hiddenIds.has(promo.id));
}

function emptyPromoDraft(): PromoDraft {
  return {
    imageUrl: "",
    isActive: true,
    linkUrl: "",
    sortOrder: "0",
    subtitle: "",
    title: "",
    type: "PROMO_CARD",
  };
}

function draftToPayload(draft: PromoDraft): HomepagePromoPayload {
  return {
    imageUrl: cleanOptional(draft.imageUrl),
    isActive: draft.isActive,
    linkUrl: draft.linkUrl.trim(),
    sortOrder: parseSortOrder(draft.sortOrder),
    subtitle: cleanOptional(draft.subtitle),
    title: draft.title.trim(),
    type: draft.type,
  };
}

function validatePayload(payload: HomepagePromoPayload) {
  if (!payload.title.trim()) {
    return "Title is required.";
  }

  if (!payload.linkUrl.trim()) {
    return "Link URL is required.";
  }

  if (!isSafePromoUrl(payload.linkUrl)) {
    return "Link URL must be a relative path or HTTP(S) URL.";
  }

  if (payload.imageUrl && !isSafePromoUrl(payload.imageUrl)) {
    return "Image URL must be a relative path or HTTP(S) URL.";
  }

  if (!Number.isInteger(payload.sortOrder ?? 0)) {
    return "Order must be an integer.";
  }

  return null;
}

function getPanelMessage(panelState: PromoPanelState, message: PromoMessage | null) {
  if (!panelState || !message) {
    return null;
  }

  if (panelState.mode === "edit") {
    return message.promoId === panelState.promo.id ? message : null;
  }

  return message.promoId ? null : message;
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseSortOrder(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function sortPromos(first: HomepagePromo, second: HomepagePromo) {
  if (first.sortOrder !== second.sortOrder) {
    return first.sortOrder - second.sortOrder;
  }

  return first.title.localeCompare(second.title);
}

function isSafePromoUrl(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function CardIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 5h14v14H5zM8 9h8M8 13h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SlidesIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16v10H4zM8 4h8M8 20h8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 6v12M16 6v12"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
