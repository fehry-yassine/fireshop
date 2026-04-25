# LocalMarket PFE Marketplace

LocalMarket is the temporary project name for a Tunisia-focused cash-on-delivery multi-vendor marketplace. The final name candidate is FireShop, but the name is not locked yet.

## Project Goal

This platform helps Tunisian local merchants and small businesses sell across multiple product categories by giving buyers clean product discovery, structured category navigation, trusted vendor onboarding, and a simple COD order flow.

## Working Niche

- Marketplace type: Tunisia-focused local multi-vendor product marketplace
- Main users: buyers, vendors, administrators
- Checkout model: Cash on Delivery only in V1
- V1 checkout rule: one order contains products from one vendor only
- Business model: commission per delivered order, with manual featured/offers sections in V1

## Initial Categories

1. Electronics & Accessories
2. Home & Kitchen
3. Fashion
4. Beauty & Personal Care
5. Sports & Fitness
6. Baby & Toys
7. Car Accessories
8. Local Handmade

## Recommended Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Auth: JWT with role-based access control
- Architecture: modular monolith with REST APIs
- Deployment target: Vercel for frontend, Render/Railway/Fly.io for backend and database

## Repository Structure

```text
.
|-- backend/              # NestJS API, Prisma schema, backend documentation
|-- frontend/             # Next.js application plan and future UI implementation
|-- docs/                 # Product, architecture, database, UI, and presentation notes
|-- docker-compose.yml    # Local PostgreSQL service for development
|-- .env.example          # Environment variable template
`-- README.md             # Project overview
```

## Week 1 Status

Week 1 creates the professional foundation before coding:

- Product definition and business model
- User roles and V1 scope
- Relational database draft
- Backend module and API plan
- Frontend route and UI map
- Presentation and demo direction
- Local repository initialized

## Next Step

Week 2 should start implementation only after the foundation is approved:

1. Scaffold the real Next.js and NestJS apps.
2. Connect PostgreSQL and Prisma.
3. Implement authentication with buyer, vendor, and admin roles.
4. Build the first database migration.

