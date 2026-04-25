# API Overview

Base URL for local development:

```text
http://localhost:4000/api
```

## Auth

- `POST /auth/register` - register a buyer.
- `POST /auth/register-vendor` - register a vendor account.
- `POST /auth/login` - log in and receive tokens.
- `POST /auth/refresh` - refresh access token.
- `POST /auth/logout` - log out.

## Users

- `GET /users/me` - get current user profile.
- `PATCH /users/me` - update current user profile.
- `GET /admin/users` - admin list users.
- `PATCH /admin/users/:id/status` - admin activate or deactivate user.

## Vendors

- `GET /vendors/:slug` - public vendor profile.
- `GET /vendor/me` - vendor gets own profile.
- `PATCH /vendor/me` - vendor updates own store profile.
- `GET /admin/vendors/pending` - admin views pending vendors.
- `PATCH /admin/vendors/:id/approve` - admin approves vendor.
- `PATCH /admin/vendors/:id/reject` - admin rejects vendor.
- `PATCH /admin/vendors/:id/suspend` - admin suspends vendor.

## Categories

- `GET /categories` - public category list.
- `POST /admin/categories` - admin creates category.
- `PATCH /admin/categories/:id` - admin updates category.
- `DELETE /admin/categories/:id` - admin deletes category if unused.

V1 rule:

- Category creation must reject depth greater than 2.

## Products

- `GET /products` - public catalog with search, category, price, offer, featured, and sorting filters.
- `GET /products/:id` - public product details.
- `POST /vendor/products` - vendor creates product.
- `PATCH /vendor/products/:id` - vendor updates own product.
- `GET /vendor/products` - vendor lists own products.
- `GET /admin/products/pending` - admin views products waiting for approval.
- `PATCH /admin/products/:id/approve` - admin approves product.
- `PATCH /admin/products/:id/reject` - admin rejects product.
- `PATCH /admin/products/:id/merchandising` - admin toggles featured/offers manually.

## Cart

- `GET /cart` - buyer reads cart.
- `POST /cart/items` - buyer adds item.
- `PATCH /cart/items/:id` - buyer updates quantity.
- `DELETE /cart/items/:id` - buyer removes item.

V1 rule:

- Checkout must reject a cart containing products from more than one vendor.

## Orders

- `POST /orders` - buyer creates a single-vendor COD order from cart.
- `GET /orders/me` - buyer order history.
- `GET /orders/:id` - buyer views own order details.
- `GET /vendor/orders` - vendor views orders for own store.
- `PATCH /vendor/orders/:id/status` - vendor updates internal order status.
- `GET /admin/orders` - admin views all orders.
- `PATCH /admin/orders/:id/status` - admin updates global order status.

## Dashboards

- `GET /vendor/dashboard` - vendor sees basic product/order statistics.
- `GET /admin/dashboard` - admin sees basic marketplace statistics.

## Future APIs

- Reviews.
- Notifications.
- Online payment.
- Delivery provider integration.
- Chat.
- Coupons.
- Wishlist.

