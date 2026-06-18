"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ORDER_STATUS_OPTIONS,
  formatOrderStatus,
  getOrderStatusEffectNote,
  getOrderStatusMeaning,
  getOrderStatusOptions,
} from "@/components/orders/OrderStatus";
import { DashboardDrawer } from "@/components/dashboard/DashboardDrawer";
import { VendorAccessGate } from "@/components/vendor/VendorAccessGate";
import { VendorDashboardFrame } from "@/components/vendor/VendorDashboardFrame";
import { Button } from "@/components/ui/Button";
import { ApiError, api } from "@/lib/api";
import { formatTnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus, VendorOrderUpsertPayload } from "@/types";

type StatusMessage = {
  orderId?: string;
  text: string;
  tone: "success" | "error";
};

type DrawerState = {
  mode: "edit" | "view";
  orderId: string;
} | null;

type OrderFormState = {
  address: string;
  city: string;
  fullName: string;
  governorate: string;
  notes: string;
  phone: string;
  postalCode: string;
  status: OrderStatus;
};

const TAB_ITEMS = [
  { label: "Commandes", value: "orders" },
  { label: "Supprimées", value: "deleted" },
] as const;

type OrdersTab = (typeof TAB_ITEMS)[number]["value"];

export function VendorOrdersPageClient() {
  return (
    <VendorAccessGate>
      {({ user, vendor }) => (
        <VendorDashboardFrame user={user} vendor={vendor}>
          <VendorOrdersContent />
        </VendorDashboardFrame>
      )}
    </VendorAccessGate>
  );
}

function VendorOrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<DrawerState>(null);
  const [orderForm, setOrderForm] = useState<OrderFormState>(buildEmptyOrderForm());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "ALL">("ALL");
  const [activeTab, setActiveTab] = useState<OrdersTab>("orders");

  useEffect(() => {
    let isActive = true;

    async function loadOrders() {
      setIsLoading(true);
      setMessage(null);

      try {
        const orderResponse = await api.vendors.orders({
          deleted: activeTab === "deleted",
          search: search.trim() || undefined,
          status: statusFilter === "ALL" ? undefined : statusFilter,
        });

        if (isActive) {
          applyOrders(orderResponse);
        }
      } catch (error) {
        if (isActive) {
          setMessage({
            text: error instanceof Error ? error.message : "Impossible de charger les commandes.",
            tone: "error",
          });
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      isActive = false;
    };
  }, [activeTab, search, statusFilter]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearch ||
        order.id.toLowerCase().includes(normalizedSearch) ||
        shortOrderId(order.id).toLowerCase().includes(normalizedSearch) ||
        order.shipping.fullName.toLowerCase().includes(normalizedSearch) ||
        order.shipping.phone.toLowerCase().includes(normalizedSearch) ||
        order.shipping.city.toLowerCase().includes(normalizedSearch) ||
        order.items.some(
          (item) =>
            item.productName.toLowerCase().includes(normalizedSearch) ||
            item.productSlug.toLowerCase().includes(normalizedSearch),
        );

      return matchesSearch;
    });
  }, [orders, search]);

  const selectedOrder = drawerState
    ? "orderId" in drawerState
      ? orders.find((order) => order.id === drawerState.orderId) ?? null
      : null
    : null;

  function applyOrders(nextOrders: Order[]) {
    setOrders(nextOrders);
  }

  function openEditDrawer(order: Order) {
    setOrderForm(buildEditOrderForm(order));
    setMessage(null);
    setDrawerState({ mode: "edit", orderId: order.id });
  }

  function openViewDrawer(order: Order) {
    setOrderForm(buildEditOrderForm(order));
    setMessage(null);
    setDrawerState({ mode: "view", orderId: order.id });
  }

  async function handleSaveOrder() {
    if (!drawerState || !selectedOrder) {
      return;
    }

    const trimmedFullName = orderForm.fullName.trim();
    const trimmedPhone = orderForm.phone.trim();
    const trimmedAddress = orderForm.address.trim();
    const trimmedCity = orderForm.city.trim();

    if (!trimmedFullName || !trimmedPhone || !trimmedAddress || !trimmedCity) {
      setMessage({
        orderId: selectedOrder?.id,
        text: "Le nom, le téléphone, l'adresse et la ville sont obligatoires.",
        tone: "error",
      });
      return;
    }

    const payload: VendorOrderUpsertPayload = {
      status: orderForm.status,
      fullName: trimmedFullName,
      phone: trimmedPhone,
      address: trimmedAddress,
      city: trimmedCity,
      governorate: orderForm.governorate.trim() || trimmedCity,
      postalCode: orderForm.postalCode.trim() || undefined,
      notes: orderForm.notes.trim() || undefined,
    };

    setActiveOrderId(selectedOrder.id);
    setMessage(null);

    try {
      const response = await api.vendors.updateOrder(selectedOrder.id, payload);

      setOrders((current) =>
        current.map((item) => (item.id === response.order.id ? response.order : item)),
      );
      setOrderForm(buildEditOrderForm(response.order));
      setMessage({
        orderId: response.order.id,
        text: "Commande mise à jour avec succès.",
        tone: "success",
      });
    } catch (error) {
      setMessage({
        orderId: selectedOrder?.id,
        text: getVendorOrderError(error),
        tone: "error",
      });
    } finally {
      setActiveOrderId(null);
    }
  }

  async function handleDeleteOrder(order: Order) {
    setActiveOrderId(order.id);
    setMessage(null);

    try {
      await api.vendors.deleteOrder(order.id);
      setOrders((current) => current.filter((item) => item.id !== order.id));
      setDrawerState((current) =>
        current && "orderId" in current && current.orderId === order.id ? null : current,
      );
      setMessage({
        text: `Commande ${shortOrderId(order.id)} déplacée vers Supprimées.`,
        tone: "success",
      });
    } catch (error) {
      setMessage({
        orderId: order.id,
        text: getVendorOrderError(error),
        tone: "error",
      });
    } finally {
      setActiveOrderId(null);
    }
  }

  function clearFilters() {
    setActiveTab("orders");
    setSearch("");
    setStatusFilter("ALL");
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-full overflow-x-auto rounded-xl bg-slate-200/70 p-1.5 lg:w-auto">
          {TAB_ITEMS.map((tab) => (
            <button
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-4 text-sm font-bold transition-colors",
                tab.value === activeTab
                  ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-900",
              )}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {message && !message.orderId ? (
        <p
          className={cn(
            "rounded-xl border px-4 py-3 text-sm font-semibold",
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <label className="relative w-full md:w-[260px]">
              <span className="sr-only">Rechercher une commande</span>
              <input
                className="h-12 w-full rounded-lg border border-slate-200 bg-white px-5 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher..."
                type="search"
                value={search}
              />
              <SearchIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </label>

            <StatusPicker
              allowAll
              className="md:w-[220px]"
              onChange={(value) => setStatusFilter(value as OrderStatus | "ALL")}
              value={statusFilter}
            />

          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="inline-flex h-12 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
              onClick={clearFilters}
              type="button"
            >
              <span
                className={cn(
                  "relative h-7 w-12 rounded-full transition-colors",
                  search || statusFilter !== "ALL" ? "bg-orange-500" : "bg-slate-200",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    search || statusFilter !== "ALL" ? "left-6" : "left-1",
                  )}
                />
              </span>
              Toutes les commandes
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] border-collapse text-sm text-slate-900">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-4 text-left">ID</th>
                <th className="px-3 py-4 text-left">Produits</th>
                <th className="px-3 py-4 text-left">Client</th>
                <th className="px-3 py-4 text-left">Date</th>
                <th className="px-3 py-4 text-left">Livraison</th>
                <th className="px-3 py-4 text-left">Statut</th>
                <th className="px-3 py-4 text-left">Total</th>
                <th className="px-3 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <TableMessage colSpan={8} text="Chargement des commandes." />
              ) : orders.length === 0 ? (
                <TableMessage colSpan={8} text="Vos commandes COD apparaîtront ici dès que les acheteurs commanderont vos produits approuvés." />
              ) : filteredOrders.length === 0 ? (
                <TableMessage colSpan={8} text="Aucune commande ne correspond aux filtres actuels." />
              ) : (
                filteredOrders.map((order) => (
                  <OrderTableRow
                    isDeletedView={activeTab === "deleted"}
                    key={order.id}
                    onArchive={() => handleDeleteOrder(order)}
                    onEdit={() => openEditDrawer(order)}
                    onView={() => openViewDrawer(order)}
                    order={order}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

      </section>

      {drawerState ? (
        <OrderDrawer
          activeOrderId={activeOrderId}
          form={orderForm}
          message={
            message?.orderId && selectedOrder && message.orderId === selectedOrder.id
              ? message
              : null
          }
          mode={drawerState.mode}
          onClose={() => setDrawerState(null)}
          onFormChange={setOrderForm}
          onSave={handleSaveOrder}
          order={selectedOrder}
        />
      ) : null}
    </div>
  );
}

function OrderTableRow({
  isDeletedView,
  onArchive,
  onEdit,
  onView,
  order,
}: {
  isDeletedView: boolean;
  onArchive: () => void;
  onEdit: () => void;
  onView: () => void;
  order: Order;
}) {
  const firstItem = order.items[0];
  const itemCount = getOrderItemCount(order);

  return (
    <tr className="h-[66px] border-t border-slate-200 align-middle transition-colors hover:bg-slate-50/70">
      <td className="px-3 py-3 font-semibold text-slate-900">{shortNumericId(order.id)}</td>
      <td className="px-3 py-3">
        <div className="flex min-w-[150px] items-center gap-3">
          <ProductThumb
            imageUrl={firstItem?.productImage?.url}
            label={firstItem?.productImage?.altText ?? firstItem?.productName ?? "Product"}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {firstItem?.productName ?? "Article"}
            </p>
            <p className="text-sm text-slate-500">x{itemCount}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <p className="max-w-[180px] truncate font-medium text-slate-900">
          {order.shipping.fullName || "-"}
        </p>
      </td>
      <td className="px-3 py-3 text-slate-700">{formatDateTime(order.createdAt)}</td>
      <td className="px-3 py-3 text-slate-700">{order.shipping.city || "-"}</td>
      <td className="px-3 py-3">
        <VendorStatusPill status={order.status} />
      </td>
      <td className="px-3 py-3 font-semibold text-slate-900">{formatTnd(order.total)}</td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          <ActionButton label={`Voir ${shortOrderId(order.id)}`} onClick={onView}>
            <EyeIcon className="h-4 w-4" />
          </ActionButton>
          {!isDeletedView ? (
            <>
              <ActionButton label={`Modifier ${shortOrderId(order.id)}`} onClick={onEdit}>
                <EditIcon className="h-4 w-4" />
              </ActionButton>
              <ActionButton label={`Supprimer ${shortOrderId(order.id)}`} onClick={onArchive}>
                <TrashIcon className="h-4 w-4" />
              </ActionButton>
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

function OrderDrawer({
  activeOrderId,
  form,
  message,
  mode,
  onClose,
  onFormChange,
  onSave,
  order,
}: {
  activeOrderId: string | null;
  form: OrderFormState;
  message: StatusMessage | null;
  mode: "edit" | "view";
  onClose: () => void;
  onFormChange: Dispatch<SetStateAction<OrderFormState>>;
  onSave: () => void;
  order: Order | null;
}) {
  const isEditableMode = mode !== "view";
  const isSaving = activeOrderId === (order?.id ?? "__edit__");
  const orderShortId = order ? shortOrderId(order.id) : "--";
  const orderNumericId = order ? shortNumericId(order.id) : "--";
  const statusChanged = order ? form.status !== order.status : true;
  const drawerEyebrow = isEditableMode ? "Éditeur de commande" : "Gestion de commande";
  const drawerTitle = isEditableMode
    ? `Modifier la commande N°${orderNumericId}`
    : `Commande ${orderShortId}`;

  if (!order) {
    return null;
  }

  const itemCount = getOrderItemCount(order);

  function updateFormField<K extends keyof OrderFormState>(field: K, value: OrderFormState[K]) {
    onFormChange((current) => ({ ...current, [field]: value }));
  }

  return (
    <DashboardDrawer
      description="Gérez les informations client, le statut de la commande, les notes et le suivi."
      eyebrow={drawerEyebrow}
      footer={
        isEditableMode ? (
          <div className="flex justify-end gap-3">
            <Button
              className="vendor-secondary-action h-11 rounded-xl px-5"
              disabled={isSaving}
              onClick={onClose}
              variant="secondary"
            >
              Annuler
            </Button>
            <Button
              className="vendor-primary-action h-11 rounded-xl px-5"
              disabled={isSaving}
              onClick={onSave}
            >
              <SaveIcon className="h-4 w-4" />
              {isSaving ? "Enregistrement" : "Enregistrer"}
            </Button>
          </div>
        ) : null
      }
      onClose={onClose}
      open
      title={drawerTitle}
      width="xl"
    >
      <div className="bg-slate-50">
        {message ? (
          <p
            className={cn(
              "mb-5 rounded-xl border px-4 py-3 text-sm font-semibold",
              message.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {message.text}
          </p>
        ) : null}

        {isEditableMode ? (
          <div className="space-y-5">
            <DrawerSection title="Détails de la commande">
              <div className="grid gap-4">
                <Field label="Statut">
                  <StatusPicker
                    flowStatus={order?.status}
                    onChange={(value) => updateFormField("status", value as OrderStatus)}
                    restrictToFlow
                    value={form.status}
                  />
                  <StatusGuidance status={form.status} />
                </Field>
              </div>
              <Field label="Ajouter une note privée">
                <textarea
                  className={`${textareaClassName} h-20`}
                  placeholder="Ajouter une note privée"
                  onChange={(event) => updateFormField("notes", event.target.value)}
                  value={form.notes}
                />
              </Field>
            </DrawerSection>

            <DrawerSection title="Informations client">
              <div className="grid gap-4 lg:grid-cols-2">
                <Field label="Nom">
                  <input
                    className={inputClassName}
                    onChange={(event) => updateFormField("fullName", event.target.value)}
                    value={form.fullName}
                  />
                </Field>
                <Field label="Téléphone">
                  <input
                    className={inputClassName}
                    onChange={(event) => updateFormField("phone", event.target.value)}
                    value={form.phone}
                  />
                </Field>
                <Field label="Adresse">
                  <input
                    className={inputClassName}
                    onChange={(event) => updateFormField("address", event.target.value)}
                    value={form.address}
                  />
                </Field>
                <Field label="Ville">
                  <input
                    className={inputClassName}
                    onChange={(event) => updateFormField("city", event.target.value)}
                    value={form.city}
                  />
                </Field>
                <Field label="Gouvernorat">
                  <input
                    className={inputClassName}
                    onChange={(event) => updateFormField("governorate", event.target.value)}
                    value={form.governorate}
                  />
                </Field>
                <Field label="Code postal">
                  <input
                    className={inputClassName}
                    onChange={(event) => updateFormField("postalCode", event.target.value)}
                    value={form.postalCode}
                  />
                </Field>
              </div>
              <Field label="Note">
                <textarea
                  className={`${textareaClassName} h-20`}
                  placeholder="Saisissez des notes complémentaires"
                  onChange={(event) => updateFormField("notes", event.target.value)}
                  value={form.notes}
                />
              </Field>
            </DrawerSection>

            <OrderSummarySection order={order} />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <VendorStatusPill status={order!.status} />
                  <div>
                    <h3 className="text-2xl font-bold text-slate-950">{shortOrderId(order!.id)}</h3>
                    <p className="mt-1 text-sm text-slate-500">{formatDateTime(order!.createdAt)}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    {order!.shipping.fullName} / {order!.shipping.phone}
                  </p>
                </div>
                <div className="rounded-xl bg-orange-50 px-5 py-4 text-right">
                  <p className="text-sm font-semibold text-orange-700">Total</p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-950">
                    {formatTnd(order!.total)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="space-y-5">
                <DrawerSection title="Articles de la commande">
                  <div className="divide-y divide-slate-200">
                    {order!.items.map((item) => (
                      <div className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0" key={item.id}>
                        <div className="flex min-w-0 items-center gap-3">
                          <ProductThumb
                            imageUrl={item.productImage?.url}
                            label={item.productImage?.altText ?? item.productName}
                          />
                          <div className="min-w-0">
                            <Link
                              className="font-semibold text-slate-950 hover:text-orange-700"
                              href={`/product/${item.productSlug}`}
                            >
                              {item.productName}
                            </Link>
                            <p className="text-xs text-slate-500">
                              Qté {item.quantity} / {formatTnd(item.unitPrice)}
                            </p>
                          </div>
                        </div>
                        <p className="font-bold text-slate-950">{formatTnd(item.subtotal)}</p>
                      </div>
                    ))}
                  </div>
                </DrawerSection>

                <DrawerSection title="Mettre à jour le statut">
                  <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <Field label="Statut">
                      <StatusPicker
                        flowStatus={order!.status}
                        onChange={(value) => updateFormField("status", value as OrderStatus)}
                        restrictToFlow
                        value={form.status}
                      />
                      <StatusGuidance status={form.status} />
                    </Field>
                    <Button
                      className="vendor-primary-action h-12 rounded-xl px-5"
                      disabled={isSaving || !statusChanged}
                      onClick={onSave}
                    >
                      {isSaving ? "Enregistrement" : "Enregistrer le statut"}
                    </Button>
                  </div>
                </DrawerSection>
              </div>

              <div className="space-y-5">
                <DrawerSection title="Informations client">
                  <DetailRow label="Nom" value={order!.shipping.fullName} />
                  <DetailRow label="Téléphone" value={order!.shipping.phone} />
                  <DetailRow label="Ville" value={order!.shipping.city} />
                  <DetailRow label="E-mail" value={order!.buyer?.email ?? "-"} />
                </DrawerSection>

                <DrawerSection title="Adresse de livraison">
                  <p className="text-sm leading-6 text-slate-700">{formatAddress(order!)}</p>
                </DrawerSection>

                <DrawerSection title="Récapitulatif">
                  <DetailRow label="Sous-total" value={formatTnd(order!.subtotal)} />
                  <DetailRow label="Livraison" value={formatTnd(order!.deliveryFee)} />
                  <DetailRow label="Articles" value={`${itemCount}`} />
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
                    <span className="font-bold text-orange-700">Total</span>
                    <span className="font-extrabold text-slate-950">{formatTnd(order!.total)}</span>
                  </div>
                </DrawerSection>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardDrawer>
  );
}

function DrawerSection({
  action,
  children,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
        {action}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function OrderSummarySection({ order }: { order: Order }) {
  return (
    <DrawerSection title="Récapitulatif de la commande">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-3 text-left">Produit</th>
              <th className="px-3 py-3 text-left">Quantité</th>
              <th className="px-3 py-3 text-left">Prix unitaire</th>
              <th className="px-3 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr className="border-t border-slate-200" key={item.id}>
                <td className="px-3 py-4">
                  <div className="flex items-center gap-3">
                    <ProductThumb
                      imageUrl={item.productImage?.url}
                      label={item.productImage?.altText ?? item.productName}
                      small
                    />
                    <span className="font-semibold text-slate-900">{item.productName}</span>
                  </div>
                </td>
                <td className="px-3 py-4 text-slate-700">{item.quantity}</td>
                <td className="px-3 py-4 text-slate-700">{formatTnd(item.unitPrice)}</td>
                <td className="px-3 py-4 text-right font-semibold text-slate-900">{formatTnd(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Sous-total</span>
          <span className="font-semibold text-slate-900">{formatTnd(order.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Livraison</span>
          <span className="font-semibold text-slate-900">{formatTnd(order.deliveryFee)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-orange-50 px-4 py-3">
          <span className="font-bold text-orange-700">Total</span>
          <span className="font-extrabold text-slate-950">{formatTnd(order.total)}</span>
        </div>
      </div>
    </DrawerSection>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-bold text-slate-950">{label}</span>
      {children}
    </label>
  );
}

function StatusGuidance({ status }: { status: OrderStatus }) {
  const effectNote = getOrderStatusEffectNote(status);

  return (
    <div className="space-y-1 text-xs">
      <p className="font-medium text-slate-500">{getOrderStatusMeaning(status)}</p>
      {effectNote ? (
        <p className="font-semibold text-slate-700">{effectNote}</p>
      ) : null}
    </div>
  );
}

function TableMessage({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td className="px-4 py-12 text-center text-sm font-medium text-slate-500" colSpan={colSpan}>
        {text}
      </td>
    </tr>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-3 first:pt-0 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="min-w-0 max-w-[60%] break-words text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function ProductThumb({
  imageUrl,
  label,
  small = false,
}: {
  imageUrl?: string | null;
  label: string;
  small?: boolean;
}) {
  const sizeClassName = small ? "h-8 w-8" : "h-10 w-10";

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-100 text-slate-500",
        sizeClassName,
      )}
      title={label}
    >
      {imageUrl ? (
        <img alt={label} className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        <BoxIcon className={small ? "h-4 w-4" : "h-5 w-5"} />
      )}
    </span>
  );
}

function VendorStatusPill({ status }: { status: OrderStatus }) {
  const styles: Record<OrderStatus, string> = {
    CANCELLED: "bg-red-50 text-red-700 ring-red-200",
    CONFIRMED: "bg-lime-100 text-lime-800 ring-lime-200",
    DELIVERED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    PENDING: "bg-amber-100 text-amber-800 ring-amber-200",
    RETURNED: "bg-purple-100 text-purple-700 ring-purple-200",
    SHIPPED: "bg-blue-100 text-blue-700 ring-blue-200",
  };

  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1", styles[status])}>
      {formatOrderStatus(status)}
    </span>
  );
}

function StatusPicker({
  allowAll = false,
  className,
  flowStatus,
  onChange,
  restrictToFlow = false,
  value,
}: {
  allowAll?: boolean;
  className?: string;
  flowStatus?: OrderStatus;
  onChange: (value: OrderStatus | "ALL") => void;
  restrictToFlow?: boolean;
  value: OrderStatus | "ALL";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const statusFlowAnchor = flowStatus ?? (isOrderStatus(value) ? value : undefined);
  const statusOptions =
    restrictToFlow && statusFlowAnchor
      ? getOrderStatusOptions(statusFlowAnchor)
      : ORDER_STATUS_OPTIONS;
  const isDisabled = !allowAll && restrictToFlow && statusOptions.length <= 1;

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!rootRef.current) {
        return;
      }

      if (!rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={rootRef}>
      <button
        aria-expanded={isOpen}
        className="inline-flex h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-700 outline-none transition hover:border-orange-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:bg-slate-50 disabled:text-slate-500"
        disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) {
            setIsOpen((current) => !current);
          }
        }}
        type="button"
      >
        {value === "ALL" ? (
          <span className="text-slate-500">Statut</span>
        ) : (
          <span className={cn("inline-flex rounded-full px-3 py-1 text-[13px] font-semibold", getStatusToneClass(value))}>
            {formatOrderStatus(value)}
          </span>
        )}
        <ChevronDownIcon className={cn("h-4 w-4 text-slate-500 transition-transform", isOpen ? "rotate-180" : "")} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-full min-w-[220px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {allowAll ? (
            <button
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                value === "ALL" ? "bg-slate-50 text-slate-900" : "text-slate-600",
              )}
              onClick={() => {
                onChange("ALL");
                setIsOpen(false);
              }}
              type="button"
            >
              <span>Statut</span>
              {value === "ALL" ? <CheckIcon className="h-4 w-4 text-slate-700" /> : null}
            </button>
          ) : null}
          {statusOptions.map((status) => (
            <button
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                value === status ? "bg-slate-50" : "",
              )}
              key={status}
              onClick={() => {
                onChange(status);
                setIsOpen(false);
              }}
              type="button"
            >
              <span className={cn("inline-flex rounded-full px-3 py-1 text-[13px] font-semibold", getStatusToneClass(status))}>
                {formatOrderStatus(status)}
              </span>
              {value === status ? <CheckIcon className="h-4 w-4 text-slate-700" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getStatusToneClass(status: OrderStatus) {
  const classes: Record<OrderStatus, string> = {
    CANCELLED: "bg-red-100 text-red-700",
    CONFIRMED: "bg-lime-100 text-lime-800",
    DELIVERED: "bg-emerald-100 text-emerald-800",
    PENDING: "bg-amber-100 text-amber-800",
    RETURNED: "bg-purple-100 text-purple-700",
    SHIPPED: "bg-blue-100 text-blue-700",
  };

  return classes[status];
}

function isOrderStatus(value: OrderStatus | "ALL"): value is OrderStatus {
  return value !== "ALL";
}

function buildEmptyOrderForm(): OrderFormState {
  return {
    address: "",
    city: "",
    fullName: "",
    governorate: "",
    notes: "",
    phone: "",
    postalCode: "",
    status: "PENDING",
  };
}

function buildEditOrderForm(order: Order): OrderFormState {
  return {
    address: order.shipping.address ?? "",
    city: order.shipping.city ?? "",
    fullName: order.shipping.fullName ?? "",
    governorate: order.shipping.governorate ?? "",
    notes: order.notes ?? "",
    phone: order.shipping.phone ?? "",
    postalCode: order.shipping.postalCode ?? "",
    status: order.status,
  };
}

function getVendorOrderError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Impossible d'enregistrer les modifications de la commande.";
}

function getOrderItemCount(order: Order) {
  return order.items.reduce((total, item) => total + item.quantity, 0);
}

function formatAddress(order: Order) {
  return [
    order.shipping.address,
    order.shipping.addressLine2,
    order.shipping.city,
    order.shipping.governorate,
    order.shipping.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

function shortOrderId(id: string) {
  return `#${id.slice(0, 8)}`;
}

function shortNumericId(id: string) {
  const numericPart = id.replace(/\D/g, "");

  return numericPart ? numericPart.slice(-4) : id.slice(0, 8);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-TN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const inputClassName =
  "h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 disabled:bg-slate-50 disabled:text-slate-500";

const textareaClassName =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15";

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 0v18m8-13.5-8 4.5-8-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m5 12 5 5 9-9" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="m14 7 3 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M5 4h12l2 2v14H5V4Zm3 0v6h8V4M8 20v-6h8v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
