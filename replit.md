# Redline/Works Auto Parts Store

A responsive automotive-parts storefront with checkout, custom 3D-print requests, and a private admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/auto-parts-store run dev` — run the storefront
- `pnpm --filter @workspace/api-server run dev` — run the Express API at `/api`
- `pnpm --filter @workspace/api-server run db:init` — initialize and seed the local SQLite store
- `pnpm --filter @workspace/api-spec run codegen` — regenerate client hooks and Zod schemas from OpenAPI
- `pnpm run typecheck` — typecheck the workspace
- Required env: `SESSION_SECRET` — signs admin session cookies

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite
- API: Express 5
- Database: SQLite through sql.js/WebAssembly, persisted at `artifacts/api-server/data/store.sqlite`
- API validation and client generation: OpenAPI, Zod, and Orval
- API build: esbuild

## Where things live

- `artifacts/auto-parts-store/` — public storefront and admin UI
- `artifacts/api-server/src/routes/storefront.ts` — product, order, message, content, and admin endpoints
- `artifacts/api-server/src/lib/store.ts` — SQLite initialization, seed data, and persistence
- `artifacts/api-server/src/scripts/init-database.ts` — standalone database initializer
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/api-client-react/` and `lib/api-zod/` — generated API hooks, types, and validators

## Architecture decisions

- SQLite is the requested storage for this app. The server uses sql.js/WebAssembly and persists an SQLite file; do not replace it with another database without the user's direction.
- The API is served under `/api`; the web app calls it on the same origin.
- Admin cookies are signed with `SESSION_SECRET`; the seeded password is hashed with bcrypt.
- The 3D-print picker is intentionally a filename-only input; it does not upload STL bytes.

## Product

- Browse and filter magnetic license plate frames, carbon-fiber parts, and custom 3D prints.
- Add products to a cart and submit orders for cash on delivery or bank transfer.
- Send contact messages and custom STL print requests.
- Use the hidden logo-click sequence to reach the admin login; manage orders, messages, products, and public site content after sign-in.

## User preferences

No additional standing preferences recorded.

## Gotchas

- The initial admin account uses the credentials from the build brief. Change the password before exposing the dashboard publicly.
- The SQLite database is a local file; verify the deployment's filesystem persistence and instance model before using it for live orders.
- The server needs `SESSION_SECRET` at runtime for admin login.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
