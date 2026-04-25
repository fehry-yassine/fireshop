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

