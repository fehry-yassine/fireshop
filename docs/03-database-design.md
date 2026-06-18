# Database Design

## Main Entities

The database uses a relational model because marketplace data has clear relationships and transactional workflows. The V1 schema is intentionally lean: it proves buyer, vendor, admin, product, cart, COD order, and dashboard workflows without adding future features too early.

## Tables

### users

Stores login identity and shared user profile data.

Key fields:

- id
- email
- password_hash
- full_name
- phone
- role: BUYER, VENDOR, ADMIN
- is_active
- created_at
- updated_at

Relationships:

- One user can have one vendor profile.
- One user can place many orders.

### vendors

Stores seller-specific business information.

Key fields:

- id
- user_id
- store_name
- slug
- description
- logo_url
- status: PENDING, APPROVED, REJECTED, SUSPENDED
- is_active
- commission_rate
- created_at
- updated_at

Relationships:

- One vendor belongs to one user.
- One vendor has many products.
- One vendor receives many orders.

### categories

Stores product categories.

Key fields:

- id
- name
- slug
- description
- parent_id

Relationships:

- One category can have many products.
- One category can have child categories.

V1 rules:

- Categories support a maximum of 2 levels.
- This rule is enforced in backend validation.

Initial categories:

1. Electronics & Accessories
2. Home & Kitchen
3. Fashion
4. Beauty & Personal Care
5. Sports & Fitness
6. Baby & Toys
7. Car Accessories
8. Local Handmade

### products

Stores sellable items.

Key fields:

- id
- vendor_id
- category_id
- name
- slug
- description
- price
- offer_price
- stock_quantity
- status: DRAFT, PENDING_REVIEW, PUBLISHED, REJECTED, ARCHIVED
- rejection_reason
- is_active
- is_featured
- is_on_offer
- created_at
- updated_at

Relationships:

- One product belongs to one vendor.
- One product belongs to one category.
- One product can have many images.
- One product can appear in many order items.

V1 lifecycle:

- Vendors create products as DRAFT.
- Vendors submit ready products as PENDING_REVIEW.
- Admin approval changes products to PUBLISHED.
- Admin rejection changes products to REJECTED and stores a rejection reason.
- Archived products are not public.
- Public product browsing shows only active PUBLISHED products from active categories and approved active vendors.

### product_images

Stores product image URLs and sort order.

Key fields:

- id
- product_id
- url
- alt_text
- sort_order

### cart_items

Stores persistent cart items for logged-in buyers.

Key fields:

- id
- user_id
- product_id
- quantity
- created_at
- updated_at

Relationships:

- One cart item belongs to one buyer.
- One cart item references one product.

V1 rule:

- The cart can only be checked out when all products belong to one vendor.
- If the buyer adds a product from another vendor, the frontend should warn the buyer and the backend must reject mixed-vendor checkout.

### orders

Stores buyer checkout records.

Key fields:

- id
- buyer_id
- vendor_id
- shipping_full_name
- shipping_phone
- shipping_address_line1
- shipping_address_line2
- shipping_city
- shipping_governorate
- shipping_postal_code
- subtotal
- delivery_fee
- total
- status: PENDING, CONFIRMED, SHIPPED, DELIVERED, RETURNED, CANCELLED
- payment_method: CASH_ON_DELIVERY
- payment_status: UNPAID, PAID, CANCELLED
- notes
- vendor_deleted_at
- stock_restored_at
- created_at
- updated_at

Relationships:

- One order belongs to one buyer.
- One order belongs to one vendor.
- One order has many order items.

V1 rules:

- One order contains products from one vendor only.
- Payment is tracked directly on the order because V1 is COD only.
- Orders are created by buyer checkout, not manually by vendors.
- Vendors manage fulfillment status only for orders belonging to their own store.
- Status transitions are controlled: PENDING -> CONFIRMED/CANCELLED, CONFIRMED -> SHIPPED/CANCELLED, SHIPPED -> DELIVERED/RETURNED.
- CANCELLED and RETURNED restore stock once using stock_restored_at.

### order_items

Stores each product line inside an order.

Key fields:

- id
- order_id
- product_id
- product_name
- unit_price
- quantity
- subtotal
- created_at
- updated_at

Relationships:

- One order item belongs to one order.
- One order item references one product.

Why this matters:

- Vendors manage orders for their own store.
- Product name and price are copied into the order item as a snapshot.

## Important Design Decisions

- COD is modeled on the order as payment method and payment status, not as a separate payment gateway.
- Orders store shipping address snapshots so old orders do not change if a buyer edits their profile later.
- Order items store product name and unit price snapshots so old receipts remain correct.
- Vendor approval protects the marketplace from fake or low-quality sellers.
- Product approval gives the admin moderation control.
- Reviews, in-app notifications, saved addresses, and separate payment records are future scope, not V1 scope.
