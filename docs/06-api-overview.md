# API Overview

Base URL for local backend development:

```text
http://localhost:4000/api
```

When the app runs behind Docker Compose and Nginx, browser requests use the same-origin proxy:

```text
/api
```

Swagger/OpenAPI is not implemented yet. This document describes the current REST contract from the NestJS controllers.

## Auth

- `POST /auth/register` - register a buyer account.
- `POST /auth/login` - log in and set the access-token cookie.
- `POST /auth/logout` - clear the access-token cookie.
- `GET /auth/me` - read the authenticated user from the JWT cookie or bearer token.

V1 notes:

- Vendor onboarding is handled through vendor application routes, not a separate auth registration route.
- Refresh-token endpoints are not implemented.

## Users

- `GET /users/me` - get the current authenticated user profile.

Future scope:

- User profile editing.
- Admin user management.

## Vendors

- `GET /vendors` - public list of approved active vendors.
- `GET /vendors/:slug` - public vendor profile.
- `GET /vendors/my-application` - authenticated user reads their vendor application/profile state.
- `GET /vendors/me` - approved vendor reads their own vendor profile.
- `POST /vendors/apply` - authenticated buyer applies to become a vendor.
- `GET /vendors/dashboard` - approved vendor dashboard statistics.
- `GET /vendors/orders` - approved vendor lists orders for their own store.
- `PATCH /vendors/orders/:id/status` - approved vendor moves one of their own orders through the allowed V1 status flow.
- `PATCH /vendors/orders/:id` - approved vendor updates fulfillment/customer notes for one of their own orders.
- `DELETE /vendors/orders/:id` - approved vendor hides an order from their workspace.

V1 rule:

- Vendors do not create marketplace orders manually. Orders are created by buyer COD checkout, then vendors manage fulfillment status for their own orders.

## Categories

- `GET /categories` - public active category list.
- `GET /categories/tree` - public active category tree.
- `GET /categories/:slug` - public category details.
- `GET /categories/:slug/products` - public products for a category.
- `GET /admin/categories` - admin category list.
- `GET /admin/categories/tree` - admin category tree.
- `POST /admin/categories` - admin creates a category.
- `PATCH /admin/categories/:id` - admin updates a category.
- `DELETE /admin/categories/:id` - admin soft-deletes a category.
- `DELETE /admin/categories/:id/permanent` - admin permanently deletes an unused category.

V1 rule:

- Categories support a maximum of two levels.

## Products

- `GET /products` - public products with pagination and optional category filter.
- `GET /products/:slug` - public product details by slug.
- `POST /products/recommend` - product recommendation/search helper.
- `POST /products/recommend/feedback` - recommendation feedback.
- `GET /vendor/products` - approved vendor lists own products.
- `POST /vendor/products` - approved vendor creates a draft product.
- `POST /vendor/products/upload-image` - approved vendor uploads a product image.
- `PATCH /vendor/products/:id` - approved vendor updates own product.
- `PATCH /vendor/products/:id/publish` - approved vendor submits draft/rejected product for admin review.
- `PATCH /vendor/products/:id/archive` - approved vendor archives own product.
- `GET /admin/products` - admin product list with moderation filters.
- `GET /admin/products/pending` - admin products waiting for review.
- `GET /admin/products/:id` - admin product details.
- `PATCH /admin/products/:id/approve` - admin approves a pending-review product.
- `PATCH /admin/products/:id/reject` - admin rejects a pending-review product with a reason.
- `PATCH /admin/products/:id/archive` - admin archives a product.
- `PATCH /admin/products/:id/republish` - admin republishes an archived product.
- `PATCH /admin/products/:id/feature` - admin toggles featured placement.
- `DELETE /admin/products/:id/permanent` - admin permanently deletes a product with no order history.

Public visibility rule:

- Public product APIs return only active, published products from active categories and approved active vendors.

## Cart

- `GET /cart` - authenticated buyer reads cart.
- `POST /cart/items` - authenticated buyer adds an item.
- `PATCH /cart/items/:id` - authenticated buyer updates item quantity.
- `DELETE /cart/items/:id` - authenticated buyer removes an item.
- `DELETE /cart` - authenticated buyer clears cart.

V1 rule:

- Cart and checkout enforce single-vendor ordering.

## Orders

- `POST /orders/checkout` - authenticated buyer creates a single-vendor COD order from their cart.
- `GET /orders` - authenticated buyer lists their own orders.
- `GET /orders/:id` - authenticated buyer reads their own order details.
- `GET /admin/orders` - admin lists all orders.
- `PATCH /admin/orders/:id/status` - admin moves an order through the allowed V1 status flow.

V1 status flow:

- `PENDING` -> `CONFIRMED` or `CANCELLED`
- `CONFIRMED` -> `SHIPPED` or `CANCELLED`
- `SHIPPED` -> `DELIVERED` or `RETURNED`
- `DELIVERED`, `RETURNED`, and `CANCELLED` are final states.

## Homepage Promos

- `GET /homepage-promos` - public homepage promo content.
- `GET /admin/homepage-promos` - admin promo list.
- `POST /admin/homepage-promos` - admin creates promo content.
- `PATCH /admin/homepage-promos/:id` - admin updates promo content.
- `DELETE /admin/homepage-promos/:id` - admin soft-deletes promo content.

## Notifications

- `GET /notifications` - authenticated user lists own notifications.
- `GET /notifications/unread-count` - authenticated user reads unread count.
- `PATCH /notifications/:id/read` - authenticated user marks one notification as read.
- `PATCH /notifications/read-all` - authenticated user marks all notifications as read.

## Admin Vendor Moderation

- `GET /admin/vendors/applications` - admin lists vendor applications.
- `PATCH /admin/vendors/applications/:id/approve` - admin approves a pending vendor application.
- `PATCH /admin/vendors/applications/:id/reject` - admin rejects a pending vendor application.
- `GET /admin/vendors` - admin lists vendor profiles.
- `PATCH /admin/vendors/:id` - admin updates vendor status/active state/admin note.

## Uploads

- `GET /uploads/*` - static uploaded assets served through the backend under `/api/uploads/*`.
- `POST /admin/uploads/image` - admin uploads homepage promo images.

## Future APIs

These are future scope and should not be presented as implemented V1 endpoints:

- Swagger/OpenAPI documentation.
- Admin dashboard aggregation endpoint.
- Admin audit-log browsing.
- User profile editing and admin user management.
- Online payments.
- Delivery-provider integration.
- Reviews, chat, coupons, and wishlist.
