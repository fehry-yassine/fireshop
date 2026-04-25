# UI and UX Map

## Design Direction

The UI should feel clean, practical, and trustworthy. It should look like a real Tunisia-focused marketplace tool, not a decorative landing page.

Visual principles:

- Clear navigation.
- Structured category navigation with a maximum of 2 levels.
- Product cards that are easy to scan.
- Strong search and category access.
- Simple single-vendor COD checkout with minimal friction.
- Dashboards focused on action and status.

## Buyer Pages

### Home

Purpose:

- Introduce the marketplace.
- Show categories, featured products, offers, and recently added products.

Main sections:

- Header with logo, search, cart, login/profile.
- Category shortcuts.
- Featured products.
- Offers section.
- Latest products.

### Catalog

Purpose:

- Let buyers browse and filter products.

Main elements:

- Search input.
- Category filter.
- Price filter.
- Offer/featured filters.
- Sort options.
- Product grid.

### Product Details

Purpose:

- Help the buyer decide.

Main elements:

- Product images.
- Name, price, offer price if active, stock status.
- Featured/offer badge when manually enabled.
- Vendor name.
- Description.
- Add to cart button.

### Cart

Purpose:

- Review products before checkout.

Main elements:

- Cart item list.
- Quantity update.
- Remove item.
- Subtotal.
- Checkout button.

V1 rule:

- The cart can be checked out only when all products belong to one vendor.

### Checkout

Purpose:

- Place a COD order.

Main elements:

- Shipping contact information.
- Address fields.
- Order summary.
- COD payment confirmation.
- Place order button.

V1 checkout rule:

- A checkout contains products from one vendor only.
- If the cart contains another vendor's product, the buyer must start a separate order.

## Auth Pages

- Login.
- Buyer registration.
- Vendor registration.
- Forgot password can be future scope.

## Vendor Dashboard

### Overview

- Total products.
- Pending orders.
- Low stock products.
- Recent order activity.

### Products

- Product list.
- Create product.
- Edit product.
- Stock management.
- Product approval status.

### Orders

- List orders belonging to the vendor.
- Filter by status.
- Update internal order status.

### Store Settings

- Store name.
- Description.
- Logo.
- Vendor approval status.

## Admin Dashboard

### Overview

- Total users.
- Pending vendors.
- Pending products.
- Total orders.
- Basic sales/order statistics.

### Users

- View users.
- Activate or deactivate users.

### Vendors

- Review vendor applications.
- Approve, reject, or suspend vendors.

### Products

- Review pending products.
- Approve, reject, or archive products.
- Toggle featured/offers manually.

### Orders

- View all orders.
- Filter by status.
- Inspect vendor/order details.

### Categories

- Create, update, and organize categories.
- Enforce maximum 2 category levels.

