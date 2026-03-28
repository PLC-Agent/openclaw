# ADR-0002: PNPM Monorepo with Workspace Packages

## Status

Accepted

## Context

The project consists of a core CLI/gateway, 80+ extensions, platform-specific apps (macOS, Android, iOS), a web UI, and shared packages. These components need to:

- Share dependencies efficiently without duplication
- Be independently installable (extensions install via `npm install --omit=dev`)
- Have clear dependency boundaries between packages
- Support fast installs in CI and local development

## Decision

Use PNPM workspaces as the monorepo package manager with the following workspace structure:

```yaml
packages:
  - "."          # Root (core CLI/gateway)
  - "ui"         # Web UI
  - "packages/*" # Shared workspace packages
  - "extensions/*" # Plugin extensions
```

Key rules:

- Extensions must NOT use `workspace:*` in `dependencies` (breaks standalone `npm install`). Use `devDependencies` or `peerDependencies` for the core package.
- Plugin-only dependencies go in the extension's own `package.json`, never the root.
- Bun is supported as an alternative for TypeScript execution; keep `pnpm-lock.yaml` as the source of truth.
- Native dependencies that require compilation are listed in `onlyBuiltDependencies`.

## Consequences

- PNPM's strict dependency resolution prevents phantom dependencies, catching missing declarations early.
- Extensions can be published and installed independently while sharing workspace tooling during development.
- The `workspace:*` prohibition for runtime dependencies adds a rule to remember but prevents broken installs for end users.
- CI benefits from PNPM's content-addressable store for faster installs.
- Contributors must use PNPM (not npm/yarn) for workspace operations, adding a tooling requirement.
