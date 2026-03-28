# ADR-0001: ESM TypeScript with Strict Typing

## Status

Accepted

## Context

The project needs a language and module system that supports:

- A large monorepo with 80+ extension packages
- Strong type safety across plugin SDK boundaries
- Modern JavaScript runtime features (top-level await, native ESM)
- Compatibility with Node.js 22+ and Bun runtimes

## Decision

Use TypeScript with ECMAScript Modules (ESM) as the primary language and module system. Enforce strict typing throughout:

- `"type": "module"` in all `package.json` files
- TypeScript `strict: true` with `moduleResolution: "NodeNext"`
- Target ES2023 for modern runtime features
- Lint-enforced ban on `any` (no `@ts-nocheck`, no disabled `no-explicit-any`)
- No prototype mutation for sharing behavior; use explicit inheritance or composition

## Consequences

- Type errors are caught at compile time across the entire monorepo, including plugin SDK boundaries.
- Native ESM enables tree-shaking and aligns with the platform direction of Node.js.
- Strict typing adds friction for rapid prototyping but prevents entire classes of runtime errors.
- All contributors must write well-typed code; escape hatches like `any` are blocked by linting.
- Dual-runtime support (Node.js + Bun) requires avoiding runtime-specific APIs unless behind feature detection.
