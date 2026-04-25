# Frontend Plan

The frontend will be a Next.js application using the App Router, TypeScript, and Tailwind CSS.

## Planned Route Structure

```text
app/
|-- (store)/
|   |-- page.tsx                  # Home
|   |-- products/page.tsx         # Catalog with category, offer, and featured filters
|   |-- products/[id]/page.tsx    # Product details
|   |-- cart/page.tsx             # Cart
|   `-- checkout/page.tsx         # Single-vendor COD checkout
|-- (auth)/
|   |-- login/page.tsx
|   |-- register/page.tsx
|   `-- register-vendor/page.tsx
|-- vendor/
|   |-- page.tsx                  # Vendor dashboard overview
|   |-- products/page.tsx
|   |-- products/new/page.tsx
|   |-- orders/page.tsx
|   `-- settings/page.tsx
|-- admin/
|   |-- page.tsx                  # Admin dashboard overview
|   |-- users/page.tsx
|   |-- vendors/page.tsx
|   |-- products/page.tsx
|   |-- orders/page.tsx
|   `-- categories/page.tsx
`-- layout.tsx
```

## Planned UI Components

- Header with search, cart, and account menu.
- Category navigation.
- Product card.
- Product grid.
- Category filter.
- Price filter.
- Offer/featured badge.
- Cart item row.
- Checkout form.
- Dashboard sidebar.
- Status badge.
- Data table.
- Empty state.
- Confirmation modal.

## UX Rules

- Buyer pages should be fast and simple.
- Category navigation should support a maximum of 2 levels.
- Checkout should clearly enforce one vendor per order.
- Vendor pages should prioritize products, stock, and orders.
- Admin pages should prioritize pending approvals, categories, offers, and operational control.
- Do not hide important marketplace status behind decorative UI.

