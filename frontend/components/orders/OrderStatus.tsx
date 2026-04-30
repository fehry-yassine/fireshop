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

const ORDER_STEPS: OrderStatus[] = ORDER_STATUS_OPTIONS.filter(
  (status) => status !== "CANCELLED",
);
const TIMELINE_STATUSES: OrderStatus[] = [...ORDER_STEPS, "CANCELLED"];

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  RETURNED: "Returned",
  CANCELLED: "Cancelled",
};

export function formatOrderStatus(status: OrderStatus) {
  return STATUS_LABELS[status] ?? status;
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
                  <p className="text-xs text-slate-500">Current status</p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
