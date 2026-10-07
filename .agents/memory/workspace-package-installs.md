---
name: Workspace package installs
description: Package installation in this pnpm monorepo when the central Replit installer cannot target a leaf package.
---

If the Replit language-package installer attempts to add a dependency at the workspace root and pnpm rejects it with `ERR_PNPM_ADDING_TO_ROOT`, target the owning leaf package with `pnpm --filter @workspace/<package> add/remove ...`. Avoid adding application runtime dependencies to the root because workspace dependencies are declared per package.

**Why:** The installer callback did not expose a package-directory option in this workspace, and pnpm intentionally blocked an accidental root dependency change. Native package build scripts may also be blocked by the workspace allowlist; prefer a suitable WebAssembly alternative over changing the allowlist for one package.

**How to apply:** Try the package-management flow first. If it cannot scope the operation, use a filtered pnpm command so the leaf manifest and lockfile remain aligned. For local SQLite in this app, sql.js/WebAssembly avoids native build approval and writes the exported database to the configured SQLite file.
