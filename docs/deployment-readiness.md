# Deployment Readiness

This note prepares Fireshop Marketplace for a future online launch with a custom domain. It does not replace a production runbook, SSL setup, monitoring, backups, or a security review.

## Current Deployment Shape

- Docker Compose starts PostgreSQL, the NestJS backend, the Next.js frontend, and Nginx.
- Nginx serves the frontend and proxies `/api/*` to the backend.
- The frontend should use same-origin API calls in the Docker/Nginx setup with `NEXT_PUBLIC_API_URL=/api`.
- Server-side frontend requests inside Docker should use `INTERNAL_API_URL=http://backend:4000/api`.
- Nginx uses Docker DNS (`127.0.0.11`) for backend/frontend upstreams so recreated app containers can be resolved without changing the proxy config.

## Required Environment Values

### Backend

- `DATABASE_URL` - PostgreSQL connection string.
- `JWT_ACCESS_SECRET` - strong private signing secret. Do not use the local demo placeholder in production.
- `CORS_ALLOWED_ORIGINS` - comma-separated browser origins allowed to call the API.
- `BACKEND_PORT` - backend port, usually `4000`.
- `AUTH_COOKIE_SECURE` - use `false` only for local HTTP; use `true` behind HTTPS.
- `JSON_BODY_LIMIT` - JSON request body limit, default `256kb`.
- `FORM_BODY_LIMIT` - URL-encoded body limit, default `64kb`.

### Frontend

- `NEXT_PUBLIC_API_URL` - browser API base URL. Use `/api` when frontend and API share the same domain through Nginx.
- `INTERNAL_API_URL` - server-side API base URL for Next.js server rendering.
- `NEXT_API_PROXY_TARGET` - local development target for Next.js rewrites, usually `http://localhost:4000`.

## Local And Demo Origins

Recommended local values:

```text
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost,http://127.0.0.1
NEXT_PUBLIC_API_URL=/api
INTERNAL_API_URL=http://backend:4000/api
AUTH_COOKIE_SECURE=false
```

For the Docker/Nginx dry run, use `http://127.0.0.1` if `http://localhost` is intercepted by another local IPv6 listener on Windows. The CORS configuration supports both origins; the host port binding must still route to the Nginx container.

## Future Domain Example

When the domain is known, replace placeholders with real HTTPS origins:

```text
CORS_ALLOWED_ORIGINS=https://fireshop.example.com,https://www.fireshop.example.com
NEXT_PUBLIC_API_URL=/api
INTERNAL_API_URL=http://backend:4000/api
AUTH_COOKIE_SECURE=true
```

If the API is deployed on a separate subdomain, include both the frontend origin in `CORS_ALLOWED_ORIGINS` and the API base URL in `NEXT_PUBLIC_API_URL`.

## Production Guardrails

- Use HTTPS before setting `AUTH_COOKIE_SECURE=true`.
- Never commit real secrets.
- Do not deploy with `JWT_ACCESS_SECRET=localmarket-dev-secret-change-before-production`.
- Do not run `npm audit fix --force` to address the current nested Next/PostCSS advisory; npm proposes a breaking downgrade to `next@9.3.3`.
- Run migrations with `prisma migrate deploy`, not development reset commands.
- Seed only intentional demo data in production-like environments.
- Create the real production admin account through a controlled process, not a public registration flow.
- Configure database backups before public launch.
- Keep uploaded files on persistent storage; the Docker Compose volume currently maps `backend/uploads`.

## Residual Frontend Dependency Advisory

As of the P1.1 security assessment, `npm --workspace frontend audit --omit=dev --audit-level=moderate` still reports `GHSA-qx2v-qp2m-jg93` for `next/node_modules/postcss@8.4.31`. Fireshop uses patched direct PostCSS tooling for Tailwind (`postcss@8.5.x`), but Next.js `15.5.19` still pins its own nested PostCSS `8.4.31`; latest stable Next.js also still reports the same nested dependency. The package is present in the current frontend Docker runtime image because the image builds and serves the app from the same dependency installation.

Code review found no Fireshop feature that accepts user-submitted CSS, PostCSS plugins, stylesheet uploads, or HTML templates for PostCSS processing. Product images and homepage promo uploads are image-only. This makes the advisory a residual framework/build-tooling risk for the current controlled demo, not a known directly reachable buyer/vendor/admin runtime flow.

Temporary acceptance boundary:

- Allowed: controlled PFE/domain demo, limited test users, no paid traffic, no real customer orders, no public vendor onboarding, monitored VPS/domain, and quick rollback.
- Not allowed: public commercial launch, real customer acquisition, real vendor onboarding, or production marketing before the advisory is resolved or formally accepted in a production security review.

Before public commercial launch, re-run the frontend production audit and either upgrade to a stable Next.js release that removes the nested vulnerable PostCSS dependency, adopt a safe deterministic runtime-pruning strategy, or document a formal security exception with compensating controls.

## Pre-Launch Checks

Run these before a PFE demo or domain launch:

```bash
npm --workspace backend test
npm --workspace backend run build
npm --workspace frontend run build
npm --workspace frontend exec -- tsc --noEmit
npm test
npm run lint
npm --workspace frontend audit --omit=dev --audit-level=moderate
docker compose config
```

Then perform a manual smoke test:

1. Admin logs in.
2. Admin approves a vendor application.
3. Vendor creates and submits a product.
4. Admin approves the product.
5. Guest sees the product publicly.
6. Buyer adds product to cart and checks out COD.
7. Vendor sees the buyer-created order and updates status.
8. Admin supervises the order.
