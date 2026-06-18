export const CART_UPDATED_EVENT = "fireshop:cart-updated";

export type CartUpdatedDetail = {
  itemCount?: number;
};

export function notifyCartUpdated(itemCount?: number) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CartUpdatedDetail>(CART_UPDATED_EVENT, {
      detail: { itemCount },
    }),
  );
}

export function readCartUpdatedDetail(event: Event) {
  return (event as CustomEvent<CartUpdatedDetail>).detail;
}
