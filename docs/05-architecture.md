# Architecture

## Architecture Style

LocalMarket uses a modular monolith:

- One frontend application.
- One backend application.
- One relational database.
- Clear backend modules that can later be separated if the project grows.

This is the right choice for a PFE because it is realistic, understandable, and scalable without adding unnecessary microservice complexity. V1 is designed for Tunisia-focused COD commerce with single-vendor checkout per order.

## System Overview

```text
Buyer / Vendor / Admin
        |
        v
Next.js Frontend
        |
        v
NestJS REST API
        |
        v
Business Rules: RBAC, category depth, COD, single-vendor checkout
        |
        v
Prisma ORM
        |
        v
PostgreSQL Database
```

## Backend Modules

### auth

- Register buyer.
- Register vendor user.
- Login.
- Refresh token.
- Role-based access control.

### users

- User profile.
- User activation/deactivation.
- Admin user management.

### vendors

- Vendor profile.
- Vendor approval workflow.
- Vendor store settings.

### categories

- Category management.
- Maximum 2 category levels.
- Initial category seed data.

### products

- Product creation and update.
- Product approval status.
- Catalog queries.
- Search and filters.
- Manual featured/offers flags.

### cart

- Add item.
- Update quantity.
- Remove item.
- Read current buyer cart.
- Block mixed-vendor checkout.

### orders

- Create COD order from cart.
- Buyer order history.
- Vendor order management.
- Admin order supervision.
- Enforce single-vendor checkout per order.
- Track COD payment status directly on the order.

### dashboards

- Basic buyer, vendor, and admin dashboard statistics.

### admin

- Aggregated dashboard metrics.
- Administrative actions across users, vendors, products, categories, and orders.

### out-of-scope-v1

- Reviews and ratings.
- In-app notifications.
- Online payment.
- Delivery API.
- Chat.
- Coupons.
- Wishlist.
- Mobile app.
- AI features.

## API Style

The backend exposes REST endpoints with JSON.

Rules:

- Public endpoints only for catalog browsing and authentication.
- Buyer endpoints require authentication.
- Vendor endpoints require role VENDOR and approved vendor status where needed.
- Admin endpoints require role ADMIN.
- Request validation happens at the DTO layer.
- Business rules live in services, not controllers.
- Database access goes through Prisma service.
- Category depth and single-vendor checkout are backend rules, not only frontend UI rules.

## Engineering Rules

- Keep controllers thin.
- Put business logic in services.
- Use DTOs for validation.
- Never trust frontend role checks alone.
- Store money as Decimal in the database.
- Snapshot order item price and product name at checkout.
- Keep payment state on the order for V1 because checkout is COD only.
- Write tests for auth, product approval, category depth, single-vendor checkout, order creation, and access control first.

