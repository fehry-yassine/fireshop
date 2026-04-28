# Backend Plan

The backend will be a NestJS application using TypeScript, Prisma, PostgreSQL, JWT authentication, and role-based access control.

## Planned Module Structure

```text
src/
|-- main.ts
|-- app.module.ts
|-- common/
|   |-- decorators/
|   |-- guards/
|   |-- pipes/
|   `-- filters/
|-- prisma/
|   |-- prisma.module.ts
|   `-- prisma.service.ts
|-- auth/
|-- users/
|-- vendors/
|-- categories/
|-- products/
|-- cart/
|-- orders/
|-- dashboards/
`-- admin/
```

## Backend Rules

- Controllers expose HTTP endpoints.
- Services contain business logic.
- DTOs validate input.
- Guards enforce authentication and roles.
- Prisma handles database access.
- Admin checks must happen on the backend, never only in the frontend.

## Critical Business Rules

- A vendor cannot sell until approved.
- A product cannot appear publicly until approved.
- Categories cannot go deeper than 2 levels in V1.
- One COD order can contain products from only one vendor.
- A buyer cannot order more than available stock.
- A COD order stores payment method and payment status directly on the order.
- Order item price and product name are snapshotted during checkout.
- Vendors can only see orders for their own store.
- Admin can see all marketplace activity.
- Reviews, in-app notifications, online payment, chat, coupons, wishlist, delivery APIs, mobile apps, and AI features are not V1 scope.

## Seed Data for E2E

Use Prisma seed data to populate realistic test records for auth, vendor onboarding, products, cart, and COD orders.

```bash
npm run prisma:seed
```

Reset + migrate + seed from scratch:

```bash
npm run prisma:reset
npm run prisma:seed
```

With Docker Compose:

```bash
docker compose --profile tools run --rm seed
```

Shared password for all seeded users:

```text
Test@12345
```

Key accounts:

- `admin@localmarket.test` (ADMIN)
- `buyer.one@localmarket.test` (BUYER)
- `seller.one@localmarket.test` (APPROVED VENDOR)
- `seller.pending@localmarket.test` (BUYER + pending vendor application)
- `seller.rejected@localmarket.test` (BUYER + rejected vendor application)
