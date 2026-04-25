# Presentation Outline

## Slide 1: Title

LocalMarket: Marketplace Multi-Vendeur COD pour le Marche Tunisien

## Slide 2: Probleme

Les commercants locaux en Tunisie ont besoin de visibilite en ligne, mais beaucoup n'ont pas un systeme structure pour gerer produits, stock et commandes. Les acheteurs ont besoin d'une experience claire pour decouvrir, comparer, commander et suivre leurs achats en COD.

## Slide 3: Solution

LocalMarket connecte acheteurs, vendeurs et administrateurs dans une seule plateforme:

- Les acheteurs commandent avec un checkout COD simple.
- Les vendeurs gerent produits, stock et preparation des commandes.
- Les administrateurs valident les vendeurs, moderent les produits et supervisent l'activite.

## Slide 4: Utilisateurs Cibles

- Acheteurs.
- Vendeurs locaux et petites entreprises.
- Administrateurs.

## Slide 5: Fonctionnalites Principales

- Authentication and roles.
- Product catalog and search.
- Structured category navigation.
- Cart and single-vendor COD checkout.
- Vendor dashboard.
- Admin approval workflows.
- Internal order tracking.
- Basic dashboard statistics.
- Manual featured/offers sections.

## Slide 6: Architecture

Show the modular monolith architecture:

Next.js -> NestJS REST API -> Prisma -> PostgreSQL

## Slide 7: Database Design

Explain the key entities:

- Users.
- Vendors.
- Categories.
- Products.
- Cart items.
- Orders.
- Order items.

## Slide 8: Demo Flow

1. Buyer browses catalog.
2. Buyer adds product to cart.
3. Buyer places a single-vendor COD order.
4. Vendor sees the order.
5. Vendor updates internal order status.
6. Admin supervises order and approvals.
7. Buyer tracks order status.

## Slide 9: Scalability Decisions

- Modular backend.
- Role-based access control.
- Relational schema with transactional consistency.
- Product and vendor approval workflows.
- Snapshot order data for historical correctness.
- Single-vendor checkout to keep V1 realistic and reliable.

## Slide 10: Conclusion

LocalMarket is not just a CRUD app. It models real Tunisia-focused marketplace workflows, business rules, and user roles in a scalable architecture.

