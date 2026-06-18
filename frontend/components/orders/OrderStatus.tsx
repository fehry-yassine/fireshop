import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types";

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
];

export const ORDER_STATUS_FLOW: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

const FINAL_ORDER_STATUSES: OrderStatus[] = [
  "DELIVERED",
  "RETURNED",
  "CANCELLED",
];

const ORDER_STEPS: OrderStatus[] = ORDER_STATUS_OPTIONS.filter(
  (status) => status !== "CANCELLED",
);
const TIMELINE_STATUSES: OrderStatus[] = [...ORDER_STEPS, "CANCELLED"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  RETURNED: "Retournée",
  CANCELLED: "Annulée",
};

const STATUS_MEANINGS: Record<OrderStatus, string> = {
  PENDING: "En attente: la commande a été envoyée par l'acheteur",
  CONFIRMED: "Confirmée: le vendeur a validé la commande",
  SHIPPED: "Expédiée: la commande est en livraison",
  DELIVERED: "Livrée: le client a reçu la commande",
  CANCELLED: "Annulée: la commande a été annulée avant livraison",
  RETURNED: "Retournée: la livraison a échoué ou a été retournée",
};

export function formatOrderStatus(status: OrderStatus) {
  return STATUS_LABELS[status] ?? status;
}

export function getOrderStatusMeaning(status: OrderStatus) {
  return STATUS_MEANINGS[status] ?? formatOrderStatus(status);
}

export function getOrderStatusOptions(currentStatus: OrderStatus) {
  return Array.from(new Set([currentStatus, ...(ORDER_STATUS_FLOW[currentStatus] ?? [])]));
}

export function getOrderStatusEffectNote(status: OrderStatus) {
  if (status === "CANCELLED" || status === "RETURNED") {
    return "Le stock sera restauré automatiquement.";
  }

  if (status === "DELIVERED") {
    return "Commande livrée finale.";
  }

  return null;
}

export function isFinalOrderStatus(status: OrderStatus) {
  return FINAL_ORDER_STATUSES.includes(status);
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  if (status === "CANCELLED") {
    return (
      <Badge className="bg-red-50 text-red-700" tone="neutral">
        {formatOrderStatus(status)}
      </Badge>
    );
  }

  if (status === "DELIVERED") {
    return <Badge tone="success">{formatOrderStatus(status)}</Badge>;
  }

  if (status === "RETURNED") {
    return (
      <Badge className="bg-purple-100 text-purple-700" tone="neutral">
        {formatOrderStatus(status)}
      </Badge>
    );
  }

  if (status === "PENDING") {
    return <Badge tone="warning">{formatOrderStatus(status)}</Badge>;
  }

  return <Badge tone="neutral">{formatOrderStatus(status)}</Badge>;
}

export function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_STEPS.indexOf(status);

  return (
    <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {TIMELINE_STATUSES.map((step) => {
        const isCancelledStep = step === "CANCELLED";
        const isCurrent = step === status;
        const isComplete =
          status === "CANCELLED"
            ? isCancelledStep
            : !isCancelledStep && ORDER_STEPS.indexOf(step) <= currentIndex;

        return (
          <li
            className={cn(
              "rounded-lg border border-slate-200 bg-white p-3",
              isComplete && "border-market-200 bg-market-50",
              status === "CANCELLED" && isCancelledStep && "border-red-200 bg-red-50",
            )}
            key={step}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-400",
                  isComplete && "border-market-600 bg-market-600 text-white",
                  status === "CANCELLED" &&
                    isCancelledStep &&
                    "border-red-600 bg-red-600 text-white",
                )}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-semibold text-slate-500",
                    isComplete && "text-slate-950",
                    status === "CANCELLED" && isCancelledStep && "text-red-700",
                  )}
                >
                  {formatOrderStatus(step)}
                </p>
                {isCurrent ? (
                  <p className="text-xs text-slate-500">Statut actuel</p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
